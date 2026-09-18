-- ============================================================================
-- Santamore — a year is what was recorded in it
-- Apply AFTER 20260917000037_sponsor_details.sql. Re-runnable.
--
-- 1. A sponsorship carries its year explicitly (it follows the cause or
--    event's date by default), so a supporter is a sponsor of 2025 and not
--    of 2026 unless a 2026 deal says so.
-- 2. A year report records its volunteers by name instead of a number.
--    Typed override figures and the "legacy" switch are no longer written:
--    every figure derives from what was recorded.
-- ============================================================================

alter table public.sponsors add column if not exists year integer
  check (year is null or year between 2000 and 2100);
update public.sponsors s
   set year = extract(year from coalesce(e.starts_at, c.starts_at))::int
  from public.sponsors s2
  left join public.events e on e.id = s2.event_id
  left join public.campaigns c on c.id = s2.campaign_id
 where s.id = s2.id and s.year is null and coalesce(e.starts_at, c.starts_at) is not null;
create index if not exists sponsors_year_idx on public.sponsors (year);

alter table public.year_reports add column if not exists volunteers_list text[] not null default '{}';

create or replace view public.v_public_year_reports
  with (security_invoker = off, security_barrier = on) as
select year, headline, summary_md, plan_md, volunteers, beneficiaries, venues,
       is_legacy, figures, events, supporters, beneficiaries_list, donors_list,
       volunteers_list
from public.year_reports
where is_public;
grant select on public.v_public_year_reports to anon, authenticated;

drop view if exists public.v_public_sponsors;
create view public.v_public_sponsors
  with (security_invoker = off, security_barrier = on) as
select
  s.id,
  s.name,
  s.tier,
  s.is_in_kind,
  s.logo_path,
  s.website,
  c.slug as campaign_slug,
  e.slug as event_slug,
  su.slug as supporter_slug,
  s.supporter_id,
  coalesce(su.kind, 'sponsor') as kind,
  case when s.is_in_kind then null else s.amount_cents end as amount_cents,
  coalesce(s.year, extract(year from coalesce(e.starts_at, c.starts_at))::int) as year,
  c.title as campaign_title,
  e.name as event_name,
  coalesce(e.starts_at, c.starts_at) as starts_at
from public.sponsors s
left join public.campaigns  c  on c.id  = s.campaign_id
left join public.events     e  on e.id  = s.event_id
left join public.supporters su on su.id = s.supporter_id
where s.status in ('signed', 'active');

grant select on public.v_public_sponsors to anon, authenticated;

drop view if exists public.v_public_year_supporters;
create view public.v_public_year_supporters
  with (security_invoker = off, security_barrier = on) as
with rows as (
  select s.supporter_id,
         coalesce(s.year, extract(year from coalesce(e.starts_at, c.starts_at))::int) as year,
         case when s.is_in_kind then 0 else coalesce(s.amount_cents, 0) end as cash_cents,
         s.is_in_kind,
         s.tier,
         0 as offers
    from public.sponsors s
    left join public.events e on e.id = s.event_id
    left join public.campaigns c on c.id = s.campaign_id
   where s.status in ('signed', 'active')
  union all
  select p.supporter_id,
         extract(year from coalesce(p.starts_at, p.ends_at))::int,
         0, false, null, 1
    from public.perk_challenges p
   where p.is_active
)
select
  r.year,
  su.id, su.name, su.slug, su.logo_path, su.website, su.kind,
  sum(r.cash_cents)::bigint as cash_cents,
  bool_or(r.is_in_kind) as in_kind,
  array_remove(array_agg(distinct r.tier), null) as tiers,
  sum(r.offers)::int as offers
from rows r
join public.supporters su on su.id = r.supporter_id and su.is_active
where r.year is not null
group by r.year, su.id, su.name, su.slug, su.logo_path, su.website, su.kind;

grant select on public.v_public_year_supporters to anon, authenticated;

create or replace view public.v_public_year_stats
  with (security_invoker = off, security_barrier = on) as
with years as (
  select generate_series(2025, greatest(extract(year from now())::int + 1,
                                        coalesce((select max(year) from public.year_reports where is_public), 2025))) as year
),
money_in as (
  select extract(year from coalesce(d.approved_at, d.created_at))::int as year,
         sum(d.net_cents) as cents,
         count(distinct coalesce(lower(d.donor_email), d.id::text)) as donors
    from public.donations d
   where d.status in ('approved', 'refunded')
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
  select extract(year from db.paid_at)::int as year, sum(db.amount_cents) as cents,
         count(distinct db.beneficiary_label) as beneficiaries
    from public.disbursements db
   where db.published_at is not null and db.paid_at is not null
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
  select s.supporter_id, s.name, s.amount_cents, s.is_in_kind,
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
  -- organisations only: an individual recorded as a supporter is a donor
  select u.year, count(distinct coalesce(u.supporter_id::text, u.name)) as supporters
    from (select supporter_id, name, year from sponsor_rows
          union all
          select supporter_id, name, year from offer_rows) u
    left join public.supporters su on su.id = u.supporter_id
   where u.year is not null and coalesce(su.kind, 'sponsor') = 'sponsor'
   group by 1
),
supporter_donors as (
  select r.year, count(distinct r.supporter_id) as donors
    from sponsor_rows r
    join public.supporters su on su.id = r.supporter_id and su.kind = 'donor'
   where r.year is not null
   group by 1
),
sponsor_cash as (
  select year, sum(amount_cents) as cents
    from sponsor_rows
   where not is_in_kind and year is not null
   group by 1
)
select
  y.year,
  coalesce(mi.cents, 0) + coalesce(ai.cents, 0)  as received_cents,
  coalesce(mo.cents, 0) + coalesce(ao.cents, 0)  as disbursed_cents,
  coalesce(sc.cents, 0) + coalesce(ru.fees, 0)   as operations_cents,
  coalesce(mi.donors, 0) + coalesce(sd.donors, 0) as donor_count,
  coalesce(ru.runners, 0)                         as runner_count,
  coalesce(pg.pages, 0)                           as page_count,
  coalesce(tm.teams, 0)                           as team_count,
  coalesce(ev.events, 0)                          as event_count,
  coalesce(su.supporters, 0)                      as supporter_count,
  coalesce(mo.beneficiaries, 0)                   as beneficiary_count
from years y
left join money_in    mi on mi.year = y.year
left join adj_in      ai on ai.year = y.year
left join money_out   mo on mo.year = y.year
left join adj_out     ao on ao.year = y.year
left join events      ev on ev.year = y.year
left join runners     ru on ru.year = y.year
left join pages       pg on pg.year = y.year
left join teams       tm on tm.year = y.year
left join supporters  su on su.year = y.year
left join supporter_donors sd on sd.year = y.year
left join sponsor_cash sc on sc.year = y.year
order by y.year;


grant select on public.v_public_year_stats to anon, authenticated;

-- The leaderboard names its cause's slug, so a year's pages can be listed
-- from the public campaigns of that year (column appended; shape kept).
create or replace view public.v_leaderboard
  with (security_invoker = off, security_barrier = on) as
select
  ft.id,
  ft.slug,
  ft.title,
  ft.photo_path,
  ft.event_id,
  ft.team_id,
  ft.raised_cents,
  ft.donor_count,
  rank() over (partition by ft.campaign_id order by ft.raised_cents desc) as rank,
  ft.campaign_id,
  (select c.slug from public.campaigns c where c.id = ft.campaign_id) as campaign_slug
from public.v_fundraiser_totals ft;
grant select on public.v_leaderboard to anon, authenticated;
