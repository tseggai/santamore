-- ============================================================================
-- Santamore — one ledger, every figure derived from it
-- Apply AFTER 20260920000053_santamore25_all_to_beneficiaries.sql. Re-runnable.
--
-- Money came in through three kinds of record: ledger donations, gifts
-- recorded on a year report from before the ledger, and sponsorship cash
-- that went to the beneficiaries. Money went out through published
-- hand-overs and hand-overs recorded on a year report. Until now each
-- surface summed its own mix of these, so the home page, the cause page,
-- the year page, the cause ledger and the admin disagreed.
--
-- From here on:
--   v_money_in_all / v_money_out_all  every row, every cause (no grants:
--                                     read only by the views below)
--   v_public_ledger_in / _out         the same rows, public causes only,
--                                     with `source` saying which record
--   v_public_ledger_summary           sums of those rows
--   v_public_year_stats               the same rows by year
--   v_public_campaigns                the same rows by cause
--   v_public_ops_total                operations-fund cash + fees only
--   v_campaign_totals                 the same rows by cause, all causes,
--                                     for staff (row filter is_staff())
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1 ─ every euro in
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_money_in_all cascade;
create view public.v_money_in_all as
-- ledger donations
select
  d.id,
  'ledger'::text as source,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.net_cents as amount_cents,
  case when d.is_anonymous then null else coalesce(d.display_name, d.donor_name) end as display_name,
  coalesce('e:' || md5(lower(d.donor_email)), 'd:' || d.id::text) as donor_key,
  f.id as fundraiser_id,
  case when f.status = 'active' then f.slug  end as fundraiser_slug,
  case when f.status = 'active' then f.title end as fundraiser_title,
  coalesce(d.campaign_id, f.campaign_id) as campaign_id,
  d.chapter_id,
  d.rail
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
where d.status in ('approved', 'refunded')
union all
-- gifts recorded on a public year report (before the ledger existed)
select
  md5('recorded:' || yr.year::text || ':' || g.ordinality::text)::uuid as id,
  'recorded',
  coalesce(c.starts_at::date, make_date(yr.year, 12, 31)),
  (g.value->>'amount_cents')::bigint,
  nullif(trim(g.value->>'name'), ''),
  'n:' || lower(trim(g.value->>'name')),
  null, null, null,
  yr.campaign_id,
  null,
  'recorded'
from public.year_reports yr
cross join lateral jsonb_array_elements(yr.donors_list) with ordinality as g(value, ordinality)
left join public.campaigns c on c.id = yr.campaign_id
where yr.is_public and g.value->>'amount_cents' ~ '^[0-9]+$'
union all
-- sponsorship cash that went to the beneficiaries, as donations do
select
  s.id,
  'sponsorship',
  coalesce(e.starts_at::date, c.starts_at::date, make_date(s.year, 12, 31), now()::date),
  s.amount_cents,
  s.name,
  coalesce('s:' || s.supporter_id::text, 'n:' || lower(s.name)),
  null, null, null,
  s.campaign_id,
  s.chapter_id,
  'sponsorship'
from public.sponsors s
left join public.events e on e.id = s.event_id
left join public.campaigns c on c.id = s.campaign_id
where s.status in ('signed', 'active') and not s.is_in_kind and s.fund = 'impact'
  and coalesce(s.amount_cents, 0) > 0;

-- ─────────────────────────────────────────────────────────────────────────
-- 2 ─ every euro out
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_money_out_all cascade;
create view public.v_money_out_all as
select
  db.id,
  'ledger'::text as source,
  (coalesce(db.paid_at, db.published_at))::date as entry_date,
  db.amount_cents,
  db.beneficiary_label,
  db.category,
  db.chapter_id,
  db.campaign_id,
  db.documentation_paths,
  db.committee_decision_ref,
  (db.paid_at is not null) as is_paid
from public.disbursements db
where db.published_at is not null
union all
select
  md5('handover:' || yr.year::text || ':' || h.ordinality::text)::uuid,
  'recorded',
  coalesce(c.starts_at::date, make_date(yr.year, 12, 31)),
  (h.value->>'amount_cents')::bigint,
  trim(h.value->>'label'),
  null,
  null,
  yr.campaign_id,
  '{}'::text[],
  null,
  true
from public.year_reports yr
cross join lateral jsonb_array_elements(yr.beneficiaries_list) with ordinality as h(value, ordinality)
left join public.campaigns c on c.id = yr.campaign_id
where yr.is_public and h.value->>'amount_cents' ~ '^[0-9]+$'
  and (h.value->>'amount_cents')::bigint > 0;

-- the two internal views are read only through the definer views below
revoke all on public.v_money_in_all, public.v_money_out_all from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3 ─ the public ledger: the same rows, public causes only
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_public_ledger_in cascade;
create view public.v_public_ledger_in
  with (security_invoker = off, security_barrier = on) as
select
  m.id,
  m.entry_date,
  m.amount_cents,
  m.display_name,
  m.fundraiser_slug,
  m.fundraiser_title,
  case when c.is_public then c.slug  end as campaign_slug,
  case when c.is_public then c.title end as campaign_title,
  ch.slug as chapter_slug,
  m.rail,
  case when c.is_public then c.slug end as cause_slug,
  m.source
from public.v_money_in_all m
left join public.campaigns c on c.id = m.campaign_id
left join public.chapters ch on ch.id = m.chapter_id
where m.source = 'ledger' or m.campaign_id is null or c.is_public;

drop view if exists public.v_public_ledger_out cascade;
create view public.v_public_ledger_out
  with (security_invoker = off, security_barrier = on) as
select
  m.id,
  m.entry_date,
  m.amount_cents,
  m.beneficiary_label,
  m.category,
  ch.slug as chapter_slug,
  m.documentation_paths,
  m.committee_decision_ref,
  m.source,
  m.is_paid,
  case when c.is_public then c.slug end as cause_slug
from public.v_money_out_all m
left join public.campaigns c on c.id = m.campaign_id
left join public.chapters ch on ch.id = m.chapter_id
where m.source = 'ledger' or m.campaign_id is null or c.is_public;

grant select on public.v_public_ledger_in, public.v_public_ledger_out to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4 ─ the headline figures, from the same rows
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_public_ledger_summary cascade;
create view public.v_public_ledger_summary
  with (security_invoker = off, security_barrier = on) as
with received as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_in), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.donations dd on dd.id = la.references_donation_id
                   where dd.status in ('approved', 'refunded')), 0) as cents
), disbursed as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_out where is_paid), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.disbursements dbb on dbb.id = la.references_disbursement_id
                   where dbb.published_at is not null and dbb.paid_at is not null), 0) as cents
), approved_pending as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_out where not is_paid), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.disbursements dbb on dbb.id = la.references_disbursement_id
                   where dbb.published_at is not null and dbb.paid_at is null), 0) as cents
)
select
  r.cents as received_cents,
  d.cents as disbursed_cents,
  ap.cents as approved_pending_cents,
  r.cents - d.cents - ap.cents as unallocated_cents
from received r, disbursed d, approved_pending ap;

-- operations: only the cash that feeds operations, plus entry fees
drop view if exists public.v_public_ops_total cascade;
create view public.v_public_ops_total
  with (security_invoker = off, security_barrier = on) as
select
  coalesce((select sum(s.amount_cents) from public.sponsors s
            where s.status in ('signed', 'active') and not s.is_in_kind and s.fund = 'operations'), 0)
  + coalesce((select sum(r.amount_paid_cents) from public.registrations r
              where r.status = 'confirmed'), 0) as operations_cents;

grant select on public.v_public_ledger_summary, public.v_public_ops_total to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5 ─ the year in figures, from the same rows
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_public_year_stats cascade;
create view public.v_public_year_stats
  with (security_invoker = off, security_barrier = on) as
with years as (
  select generate_series(2025, greatest(extract(year from now())::int + 1,
                                        coalesce((select max(year) from public.year_reports where is_public), 2025))) as year
),
money_in as (
  select extract(year from m.entry_date)::int as year,
         sum(m.amount_cents) as cents,
         count(distinct m.donor_key) as donors
    from public.v_money_in_all m
    left join public.campaigns c on c.id = m.campaign_id
   where m.source = 'ledger' or m.campaign_id is null or c.is_public
   group by 1
),
adj_in as (
  select extract(year from la.created_at)::int as year, sum(la.amount_cents) as cents
    from public.ledger_adjustments la
    join public.donations d on d.id = la.references_donation_id
   where d.status in ('approved', 'refunded')
   group by 1
),
money_out as (
  select extract(year from m.entry_date)::int as year, sum(m.amount_cents) as cents,
         count(distinct m.beneficiary_label) as beneficiaries
    from public.v_money_out_all m
    left join public.campaigns c on c.id = m.campaign_id
   where m.is_paid and (m.source = 'ledger' or m.campaign_id is null or c.is_public)
   group by 1
),
adj_out as (
  select extract(year from la.created_at)::int as year, sum(la.amount_cents) as cents
    from public.ledger_adjustments la
    join public.disbursements db on db.id = la.references_disbursement_id
   where db.published_at is not null and db.paid_at is not null
   group by 1
),
events as (
  select extract(year from e.starts_at)::int as year, count(*) as events
    from public.events e
   where e.is_published and e.starts_at is not null
   group by 1
),
runners as (
  select extract(year from e.starts_at)::int as year,
         count(*) as runners,
         sum(r.amount_paid_cents) as fees
    from public.registrations r
    join public.events e on e.id = r.event_id
   where r.status = 'confirmed' and e.starts_at is not null
   group by 1
),
pages as (
  select extract(year from coalesce(c.starts_at, f.created_at))::int as year, count(*) as pages
    from public.fundraisers f
    left join public.campaigns c on c.id = f.campaign_id
   where f.status = 'active'
   group by 1
),
teams as (
  select extract(year from coalesce(c.starts_at, t.created_at))::int as year, count(*) as teams
    from public.teams t
    left join public.campaigns c on c.id = t.campaign_id
   group by 1
),
sponsor_rows as (
  select s.supporter_id, s.name, s.amount_cents, s.is_in_kind, s.fund,
         coalesce(s.year, extract(year from coalesce(e.starts_at, c.starts_at))::int) as year
    from public.sponsors s
    left join public.events e on e.id = s.event_id
    left join public.campaigns c on c.id = s.campaign_id
   where s.status in ('signed', 'active')
),
offer_rows as (
  select p.supporter_id, p.partner_name as name,
         extract(year from coalesce(p.starts_at, p.ends_at))::int as year
    from public.perk_challenges p
   where p.is_active
),
supporters as (
  select u.year, count(distinct coalesce(u.supporter_id::text, u.name)) as supporters
    from (select supporter_id, name, year from sponsor_rows
          union all
          select supporter_id, name, year from offer_rows) u
    left join public.supporters su on su.id = u.supporter_id
   where u.year is not null and coalesce(su.kind, 'sponsor') = 'sponsor'
   group by 1
),
ops_cash as (
  select year, sum(amount_cents) as cents
    from sponsor_rows
   where not is_in_kind and fund = 'operations' and year is not null
   group by 1
)
select
  y.year,
  coalesce(mi.cents, 0) + coalesce(ai.cents, 0) as received_cents,
  coalesce(mo.cents, 0) + coalesce(ao.cents, 0) as disbursed_cents,
  coalesce(oc.cents, 0) + coalesce(ru.fees, 0)  as operations_cents,
  coalesce(mi.donors, 0)                         as donor_count,
  coalesce(ru.runners, 0)                        as runner_count,
  coalesce(pg.pages, 0)                          as page_count,
  coalesce(tm.teams, 0)                          as team_count,
  coalesce(ev.events, 0)                         as event_count,
  coalesce(su.supporters, 0)                     as supporter_count,
  coalesce(mo.beneficiaries, 0)                  as beneficiary_count
from years y
left join money_in   mi on mi.year = y.year
left join adj_in     ai on ai.year = y.year
left join money_out  mo on mo.year = y.year
left join adj_out    ao on ao.year = y.year
left join events     ev on ev.year = y.year
left join runners    ru on ru.year = y.year
left join pages      pg on pg.year = y.year
left join teams      tm on tm.year = y.year
left join supporters su on su.year = y.year
left join ops_cash   oc on oc.year = y.year
order by y.year;

grant select on public.v_public_year_stats to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6 ─ the cause, from the same rows
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_public_campaigns cascade;
create view public.v_public_campaigns
  with (security_invoker = off, security_barrier = on) as
select
  c.slug,
  c.title,
  c.description,
  c.goal_cents,
  c.payment_reference,
  c.suggested_amounts,
  c.starts_at,
  c.ends_at,
  c.beneficiary_summary,
  ch.slug as chapter_slug,
  ch.name as chapter_name,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              left join public.fundraisers f2 on f2.id = dd.fundraiser_id
              where dd.status in ('approved', 'refunded')
                and coalesce(dd.campaign_id, f2.campaign_id) = c.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  c.cover_path,
  c.id,
  coalesce((select sum(m.amount_cents) from public.v_money_out_all m where m.campaign_id = c.id and m.is_paid), 0) as disbursed_cents
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public;

grant select on public.v_public_campaigns to anon, authenticated;

-- staff: every cause, published or not, the same figures
drop view if exists public.v_campaign_totals cascade;
create view public.v_campaign_totals
  with (security_invoker = off, security_barrier = on) as
select
  c.id,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  coalesce((select sum(m.amount_cents) from public.v_money_out_all m where m.campaign_id = c.id and m.is_paid), 0) as disbursed_cents,
  coalesce((select count(*) from public.v_money_out_all m where m.campaign_id = c.id), 0) as hand_overs
from public.campaigns c
where public.is_staff();

grant select on public.v_campaign_totals to authenticated;

notify pgrst, 'reload schema';
