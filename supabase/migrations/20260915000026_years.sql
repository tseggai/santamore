-- 0026 · Transparency by year.
-- The public ledger gains a year switcher: what we did last year, this
-- year so far, the plan for next year. Most of it is derived from rows
-- that already exist (donations, disbursements, events, registrations,
-- pages, teams, sponsorships, offers) and attributed to a calendar year
-- below. What the database cannot know — the plan, the story of the
-- year, how many volunteers stood at the water stations, extra venues —
-- staff write once per year in year_reports. Re-runnable.

-- 1 ─ the staff-written part of a year -----------------------------------------
create table if not exists public.year_reports (
  year          integer primary key check (year between 2025 and 2100),
  headline      text,
  summary_md    text,   -- what we did (past years, and this year so far)
  plan_md       text,   -- the plan (this year and next)
  volunteers    integer check (volunteers >= 0),
  beneficiaries integer check (beneficiaries >= 0),
  venues        text[] not null default '{}',
  is_public     boolean not null default false,
  updated_at    timestamptz not null default now()
);

alter table public.year_reports enable row level security;
grant select, insert, update on public.year_reports to authenticated;
drop policy if exists year_reports_staff_all on public.year_reports;
create policy year_reports_staff_all on public.year_reports
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace view public.v_public_year_reports
  with (security_invoker = off, security_barrier = on) as
select year, headline, summary_md, plan_md, volunteers, beneficiaries, venues
from public.year_reports
where is_public;

grant select on public.v_public_year_reports to anon, authenticated;

-- 2 ─ the derived part of a year ---------------------------------------------
-- One row per calendar year from the founding year to next year (and any
-- later year staff already published a plan for). Attribution:
--   money in     the day it was approved (the ledger's entry_date)
--   money out    the day it was paid
--   runners      confirmed registrations, by the event's date
--   pages, teams the cause's start date (created_at when the cause has none)
--   events       published, by start date
--   supporters   distinct supporters with a signed/active sponsorship or a
--                partner offer on something dated in the year
--   operations   sponsorship cash + confirmed entry fees, same attribution
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
         extract(year from coalesce(e.starts_at, c.starts_at))::int as year
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
  select year, count(distinct coalesce(supporter_id::text, name)) as supporters
    from (select supporter_id, name, year from sponsor_rows
          union all
          select supporter_id, name, year from offer_rows) u
   where year is not null
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
  coalesce(mi.donors, 0)                          as donor_count,
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
left join sponsor_cash sc on sc.year = y.year
order by y.year;

grant select on public.v_public_year_stats to anon, authenticated;

-- 3 ─ which supporters, per year (for the logo wall) -------------------------
create or replace view public.v_public_year_supporters
  with (security_invoker = off, security_barrier = on) as
select distinct
  u.year,
  su.id, su.name, su.slug, su.logo_path, su.website
from (
  select s.supporter_id, extract(year from coalesce(e.starts_at, c.starts_at))::int as year
    from public.sponsors s
    left join public.events e on e.id = s.event_id
    left join public.campaigns c on c.id = s.campaign_id
   where s.status in ('signed', 'active')
  union all
  select p.supporter_id, extract(year from coalesce(p.starts_at, p.ends_at))::int
    from public.perk_challenges p
   where p.is_active
) u
join public.supporters su on su.id = u.supporter_id and su.is_active
where u.year is not null;

grant select on public.v_public_year_supporters to anon, authenticated;
