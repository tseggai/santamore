-- ============================================================================
-- Santamore — mark a cause or an event, made before test mode, as test data
-- Apply AFTER 20260920000055_test_mode.sql. Re-runnable.
--
-- Rows made before the switch existed are live by default, including the
-- practice causes and gifts from the beta. An admin can now mark a cause
-- or an event as test data after the fact: the record and everything
-- that hangs off it flip to is_test, so it can be deleted or purged like
-- anything made in test mode. Live money that is not attached is never
-- touched.
-- ============================================================================

create or replace function public.mark_campaign_test(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select title into v_title from public.campaigns where id = p_id;
  if v_title is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  update public.campaigns set is_test = true where id = p_id;
  update public.donations d set is_test = true
   where d.campaign_id = p_id
      or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.campaign_id = p_id);
  update public.ledger_adjustments la set is_test = true
   where exists (select 1 from public.donations d where d.id = la.references_donation_id and d.is_test)
      or exists (select 1 from public.disbursements db where db.id = la.references_disbursement_id and db.campaign_id = p_id);
  update public.disbursements set is_test = true where campaign_id = p_id;
  update public.fundraisers   set is_test = true where campaign_id = p_id;
  update public.teams         set is_test = true where campaign_id = p_id;
  update public.sponsors      set is_test = true where campaign_id = p_id;
  update public.beneficiaries set is_test = true where campaign_id = p_id;
  return jsonb_build_object('ok', true, 'name', v_title);
end;
$$;

create or replace function public.mark_event_test(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select name into v_name from public.events where id = p_id;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  update public.events set is_test = true where id = p_id;
  update public.donations set is_test = true where event_id = p_id;
  update public.ledger_adjustments la set is_test = true
   where exists (select 1 from public.donations d where d.id = la.references_donation_id and d.event_id = p_id);
  update public.registrations set is_test = true where event_id = p_id;
  update public.event_rsvps   set is_test = true where event_id = p_id;
  update public.sponsors      set is_test = true where event_id = p_id;
  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

revoke all on function public.mark_campaign_test(uuid), public.mark_event_test(uuid) from public;
grant execute on function public.mark_campaign_test(uuid), public.mark_event_test(uuid) to authenticated;

notify pgrst, 'reload schema';
