-- ============================================================================
-- Santamore — code-review fixes on the initial schema (Task 2)
-- Apply AFTER 20260829000001_initial_schema.sql.
--
--  1. profiles: self-update can no longer touch `role` (column-level grant),
--     and admins/chapter leads can update their own profile again.
--  2. Ledger stays append-only through refunds: refunded donations remain
--     visible in v_public_ledger_in; the refund itself is a correction row.
--  3. v_public_ledger_in no longer leaks hidden fundraiser / non-public
--     campaign names (amounts stay — names are masked).
--  4. Published disbursements may record paid_at once (only that change).
--  5. ledger_adjustments: truly append-only (trigger) and publicly visible
--     via v_public_ledger_adjustments; totals include corrections.
--  6. is_admin() renamed is_staff() — it matches role in (admin,chapter_lead).
--  7. donor_count counts distinct donors (by email; unknown emails count 1).
--  8. payment_reference regex enforces a real MMYY month.
-- ============================================================================

-- 1 ─ profiles: pin role via column-level grant, simplify the policy
revoke update on public.profiles from authenticated;
grant update (full_name, phone, locale) on public.profiles to authenticated;

drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 6 ─ rename the staff helper before anything depends on the old name
drop function public.is_admin();
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'chapter_lead')
  );
$$;

-- 4 ─ disbursements: a published row may gain paid_at exactly once
create or replace function public.enforce_disbursement_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null then
    if tg_op = 'UPDATE'
       and old.paid_at is null and new.paid_at is not null
       and to_jsonb(new) - 'paid_at' = to_jsonb(old) - 'paid_at' then
      return new;
    end if;
    raise exception 'disbursements: published rows are immutable (only recording paid_at once is allowed; corrections go in ledger_adjustments)';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- 5 ─ ledger_adjustments is append-only, like both sides of the ledger
create or replace function public.enforce_adjustment_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ledger_adjustments: rows are append-only and can never be changed or deleted';
end;
$$;

create trigger trg_ledger_adjustments_immutability
  before update or delete on public.ledger_adjustments
  for each row execute function public.enforce_adjustment_immutability();

-- 8 ─ payment_reference: month must be 01-12 (SM-<MMYY>-<4 digits>)
alter table public.fundraisers
  drop constraint fundraisers_payment_reference_check;
alter table public.fundraisers
  add constraint fundraisers_payment_reference_check
  check (payment_reference ~ '^SM-(0[1-9]|1[0-2])[0-9]{2}-[0-9]{4}$');

-- 2+3 ─ ledger-in: refunded rows stay visible (append-only), hidden
-- fundraisers and non-public campaigns keep their money but lose their names
create or replace view public.v_public_ledger_in
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.net_cents as amount_cents,
  case when d.is_anonymous then null
       else coalesce(d.display_name, d.donor_name) end as display_name,
  case when f.status = 'active' then f.slug  end as fundraiser_slug,
  case when f.status = 'active' then f.title end as fundraiser_title,
  case when c.is_public then c.slug  end as campaign_slug,
  case when c.is_public then c.title end as campaign_title,
  ch.slug as chapter_slug,
  d.rail
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
left join public.campaigns   c on c.id = d.campaign_id
left join public.chapters   ch on ch.id = d.chapter_id
where d.status in ('approved', 'refunded');

-- 5 ─ corrections render as their own dated public rows
create view public.v_public_ledger_adjustments
  with (security_invoker = off, security_barrier = on) as
select
  la.id,
  la.created_at::date as entry_date,
  la.amount_cents,          -- signed
  la.reason,
  la.references_donation_id,
  la.references_disbursement_id,
  ch.slug as chapter_slug
from public.ledger_adjustments la
left join public.donations     dd on dd.id = la.references_donation_id
left join public.disbursements db on db.id = la.references_disbursement_id
left join public.chapters      ch on ch.id = coalesce(dd.chapter_id, db.chapter_id);

grant select on public.v_public_ledger_adjustments to anon, authenticated;

-- 2+5+7 ─ totals include refunds' corrections; donors counted distinct
create or replace view public.v_fundraiser_totals
  with (security_invoker = off, security_barrier = on) as
select
  f.id,
  f.slug,
  f.title,
  f.story,
  f.photo_path,
  f.goal_cents,
  f.event_id,
  f.team_id,
  coalesce(sum(d.net_cents) filter (where d.status in ('approved', 'refunded')), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              where dd.fundraiser_id = f.id), 0) as raised_cents,
  count(distinct coalesce(lower(d.donor_email), d.id::text))
    filter (where d.status in ('approved', 'refunded')) as donor_count
from public.fundraisers f
left join public.donations d on d.fundraiser_id = f.id
where f.status = 'active'
group by f.id;

create or replace view public.v_chapter_totals
  with (security_invoker = off, security_barrier = on) as
select
  ch.id,
  ch.name,
  ch.slug,
  coalesce((select sum(d.net_cents) from public.donations d
            where d.chapter_id = ch.id and d.status in ('approved', 'refunded')), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              where dd.chapter_id = ch.id), 0) as raised_cents,
  coalesce((select sum(db.amount_cents) from public.disbursements db
            where db.chapter_id = ch.id and db.published_at is not null), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.disbursements dbb on dbb.id = la.references_disbursement_id
              where dbb.chapter_id = ch.id and dbb.published_at is not null), 0)
    as disbursed_cents
from public.chapters ch
where ch.is_active;
