-- Refunds are one logical operation: the approved -> refunded transition and
-- the negative ledger_adjustments row must land together or not at all
-- (brief §11 / Task 7). supabase-js cannot open a transaction across two
-- statements, so the pair lives in one SECURITY DEFINER function. Staff-only
-- via the same public.is_staff() check the RLS policies use.

create or replace function public.refund_donation(
  p_donation_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount bigint;
begin
  if not public.is_staff() then
    raise exception 'refund_donation: staff only';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'refund_donation: a reason is required';
  end if;

  select amount_cents into v_amount
  from public.donations
  where id = p_donation_id and status = 'approved'
  for update;
  if v_amount is null then
    raise exception 'refund_donation: donation not found or not approved';
  end if;

  -- The immutability trigger allows exactly this transition and nothing else.
  update public.donations
  set status = 'refunded'
  where id = p_donation_id;

  insert into public.ledger_adjustments
    (references_donation_id, amount_cents, reason, created_by)
  values
    (p_donation_id, -v_amount, btrim(p_reason), auth.uid());
end;
$$;

revoke all on function public.refund_donation(uuid, text) from public, anon;
grant execute on function public.refund_donation(uuid, text) to authenticated;

-- Staff need registrant names for the start list / bib assignment
-- (/admin/prijave). Policies OR together with profiles_select_own.
create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.is_staff());

-- Staff moderate fundraiser pages (/admin/prikupljaci): activate a finished
-- draft, hide an abusive page. Owner policies stay as they are.
create policy fundraisers_staff_update on public.fundraisers
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());
