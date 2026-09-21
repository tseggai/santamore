-- ============================================================================
-- Santamore — one ledger, corrections included; test-mode integrity
-- Apply AFTER 20260920000061_accounting_role.sql. Re-runnable.
--
-- The audit of 2026-09-21 (docs/AUDIT.md) found the money model split in
-- two places and two rules broken. This migration closes all of it:
--
--  1. ledger_adjustments were append-only with no test-mode exception, so
--     purge, mark-as-test and every delete_* aborted as soon as one
--     correction existed. The trigger now mirrors the donations one.
--  2. A published hand-over could no longer be marked paid: the 0055/0057
--     rewrites dropped the "paid_at once" branch. Reinstated.
--  3. Corrections are now ROWS of v_money_in_all / v_money_out_all
--     (source = 'adjustment'), so every figure — cause, page, team, year,
--     summary, leaderboard — is one sum over the same rows. The separate
--     adjustment sub-queries in four views are gone with their drift.
--  4. Page, team and leaderboard totals, the donor wall, the staff
--     members view and every public content view now honour is_test.
--  5. purge_test_data flips live children of a test parent to test first
--     (the one edit immutability allows) and detaches FKs the single
--     deletes already detached; delete_campaign counts live gifts that
--     came in through a page; purge_demo_data is admin-only and copes
--     with corrections.
--  6. A member can insert a proposal only as 'open' or 'rejected' with no
--     staff fields set.
--  7. Two columns the pages were summing in code: sponsor cash per year,
--     and what a cause's pages raised. And a staff view of money in per day.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1 ─ corrections: append-only for live rows, free for test rows
create or replace function public.enforce_adjustment_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_test then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  -- Marking a live correction as test data, changing nothing else, is allowed.
  if tg_op = 'UPDATE' and new.is_test
     and to_jsonb(new) - 'is_test' = to_jsonb(old) - 'is_test' then
    return new;
  end if;
  raise exception 'ledger_adjustments: rows are append-only and can never be changed or deleted';
end;
$$;

-- 2 ─ hand-overs: a published row may gain paid_at exactly once
create or replace function public.enforce_disbursement_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_test then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'DELETE' and new.is_test
     and to_jsonb(new) - 'is_test' = to_jsonb(old) - 'is_test' then
    return new;
  end if;
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

-- ─────────────────────────────────────────────────────────────────────────
-- 3 ─ the ledger, corrections included
drop view if exists public.v_leaderboard_teams cascade;
drop view if exists public.v_leaderboard cascade;
drop view if exists public.v_team_totals cascade;
drop view if exists public.v_fundraiser_totals cascade;
drop view if exists public.v_money_in_all cascade;
drop view if exists public.v_money_out_all cascade;

create view public.v_money_in_all as
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
where d.status in ('approved', 'refunded') and (not d.is_test or public.test_mode())
union all
-- a correction to a gift: the donor's row, dated when it was recorded
select
  la.id,
  'adjustment',
  la.created_at::date,
  la.amount_cents,
  case when d.is_anonymous then null else coalesce(d.display_name, d.donor_name) end,
  coalesce('e:' || md5(lower(d.donor_email)), 'd:' || d.id::text),
  f.id,
  case when f.status = 'active' then f.slug  end,
  case when f.status = 'active' then f.title end,
  coalesce(d.campaign_id, f.campaign_id),
  d.chapter_id,
  d.rail
from public.ledger_adjustments la
join public.donations d on d.id = la.references_donation_id
left join public.fundraisers f on f.id = d.fundraiser_id
where d.status in ('approved', 'refunded')
  and (not d.is_test or public.test_mode()) and (not la.is_test or public.test_mode())
union all
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
where yr.is_public and g.value->>'amount_cents' ~ '^[0-9]+$' and (not yr.is_test or public.test_mode())
union all
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
  and coalesce(s.amount_cents, 0) > 0 and (not s.is_test or public.test_mode());

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
where db.published_at is not null and (not db.is_test or public.test_mode())
union all
-- a correction to a hand-over follows the hand-over's paid state
select
  la.id,
  'adjustment',
  la.created_at::date,
  la.amount_cents,
  db.beneficiary_label,
  db.category,
  db.chapter_id,
  db.campaign_id,
  '{}'::text[],
  db.committee_decision_ref,
  (db.paid_at is not null)
from public.ledger_adjustments la
join public.disbursements db on db.id = la.references_disbursement_id
where db.published_at is not null
  and (not db.is_test or public.test_mode()) and (not la.is_test or public.test_mode())
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
  and (h.value->>'amount_cents')::bigint > 0 and (not yr.is_test or public.test_mode());

revoke all on public.v_money_in_all, public.v_money_out_all from public, anon, authenticated;

create view public.v_public_ledger_in
  with (security_invoker = off, security_barrier = on) as
select
  m.id, m.entry_date, m.amount_cents, m.display_name, m.fundraiser_slug, m.fundraiser_title,
  case when c.is_public then c.slug  end as campaign_slug,
  case when c.is_public then c.title end as campaign_title,
  ch.slug as chapter_slug,
  m.rail,
  case when c.is_public then c.slug end as cause_slug,
  m.source
from public.v_money_in_all m
left join public.campaigns c on c.id = m.campaign_id
left join public.chapters ch on ch.id = m.chapter_id
where m.source in ('ledger', 'adjustment') or m.campaign_id is null or c.is_public;

create view public.v_public_ledger_out
  with (security_invoker = off, security_barrier = on) as
select
  m.id, m.entry_date, m.amount_cents, m.beneficiary_label, m.category,
  ch.slug as chapter_slug, m.documentation_paths, m.committee_decision_ref, m.source, m.is_paid,
  case when c.is_public then c.slug end as cause_slug
from public.v_money_out_all m
left join public.campaigns c on c.id = m.campaign_id
left join public.chapters ch on ch.id = m.chapter_id
where m.source in ('ledger', 'adjustment') or m.campaign_id is null or c.is_public;

grant select on public.v_public_ledger_in, public.v_public_ledger_out to anon, authenticated;

-- the summary: three sums over the public ledger rows, nothing added
create view public.v_public_ledger_summary
  with (security_invoker = off, security_barrier = on) as
with received as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_in), 0) as cents
), disbursed as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_out where is_paid), 0) as cents
), approved_pending as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_out where not is_paid), 0) as cents
)
select
  r.cents as received_cents,
  d.cents as disbursed_cents,
  ap.cents as approved_pending_cents,
  r.cents - d.cents - ap.cents as unallocated_cents
from received r, disbursed d, approved_pending ap;
grant select on public.v_public_ledger_summary to anon, authenticated;

-- operations: the cash that feeds operations, plus entry fees; test rows only in test mode
drop view if exists public.v_public_ops_total cascade;
create view public.v_public_ops_total
  with (security_invoker = off, security_barrier = on) as
select
  coalesce((select sum(s.amount_cents) from public.sponsors s
            where s.status in ('signed', 'active') and not s.is_in_kind and s.fund = 'operations'
              and (not s.is_test or public.test_mode())), 0)
  + coalesce((select sum(r.amount_paid_cents) from public.registrations r
              where r.status = 'confirmed' and (not r.is_test or public.test_mode())), 0) as operations_cents;
grant select on public.v_public_ops_total to anon, authenticated;

-- the year in figures, from the same rows; sponsor cash now a column here
create view public.v_public_year_stats
  with (security_invoker = off, security_barrier = on) as
with years as (
  select generate_series(2025, greatest(extract(year from now())::int + 1,
                                        coalesce((select max(year) from public.year_reports
                                                   where is_public and (not is_test or public.test_mode())), 2025))) as year
),
money_in as (
  select extract(year from m.entry_date)::int as year, sum(m.amount_cents) as cents, count(distinct m.donor_key) as donors
    from public.v_money_in_all m
    left join public.campaigns c on c.id = m.campaign_id
   where m.source in ('ledger', 'adjustment') or m.campaign_id is null or c.is_public
   group by 1
),
money_out as (
  select extract(year from m.entry_date)::int as year, sum(m.amount_cents) as cents, count(distinct m.beneficiary_label) as beneficiaries
    from public.v_money_out_all m
    left join public.campaigns c on c.id = m.campaign_id
   where m.is_paid and (m.source in ('ledger', 'adjustment') or m.campaign_id is null or c.is_public)
   group by 1
),
events as (
  select extract(year from e.starts_at)::int as year, count(*) as events
    from public.events e
   where e.is_published and e.starts_at is not null and (not e.is_test or public.test_mode())
   group by 1
),
runners as (
  select extract(year from e.starts_at)::int as year, count(*) as runners, sum(r.amount_paid_cents) as fees
    from public.registrations r
    join public.events e on e.id = r.event_id
   where r.status = 'confirmed' and e.starts_at is not null and (not r.is_test or public.test_mode())
   group by 1
),
pages as (
  select extract(year from coalesce(c.starts_at, f.created_at))::int as year, count(*) as pages
    from public.fundraisers f
    left join public.campaigns c on c.id = f.campaign_id
   where f.status = 'active' and (not f.is_test or public.test_mode())
   group by 1
),
teams as (
  select extract(year from coalesce(c.starts_at, t.created_at))::int as year, count(*) as teams
    from public.teams t
    left join public.campaigns c on c.id = t.campaign_id
   where not t.is_test or public.test_mode()
   group by 1
),
sponsor_rows as (
  select s.supporter_id, s.name, s.amount_cents, s.is_in_kind, s.fund,
         coalesce(s.year, extract(year from coalesce(e.starts_at, c.starts_at))::int) as year
    from public.sponsors s
    left join public.events e on e.id = s.event_id
    left join public.campaigns c on c.id = s.campaign_id
   where s.status in ('signed', 'active') and (not s.is_test or public.test_mode())
),
offer_rows as (
  select p.supporter_id, p.partner_name as name, extract(year from coalesce(p.starts_at, p.ends_at))::int as year
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
sponsor_cash as (
  select year,
         sum(coalesce(amount_cents, 0)) as cash,
         sum(case when fund = 'impact' then coalesce(amount_cents, 0) else 0 end) as impact,
         sum(case when fund = 'operations' then coalesce(amount_cents, 0) else 0 end) as ops
    from sponsor_rows
   where not is_in_kind and year is not null
   group by 1
)
select
  y.year,
  coalesce(mi.cents, 0)                          as received_cents,
  coalesce(mo.cents, 0)                          as disbursed_cents,
  coalesce(sc.ops, 0) + coalesce(ru.fees, 0)     as operations_cents,
  coalesce(mi.donors, 0)                         as donor_count,
  coalesce(ru.runners, 0)                        as runner_count,
  coalesce(pg.pages, 0)                          as page_count,
  coalesce(tm.teams, 0)                          as team_count,
  coalesce(ev.events, 0)                         as event_count,
  coalesce(su.supporters, 0)                     as supporter_count,
  coalesce(mo.beneficiaries, 0)                  as beneficiary_count,
  coalesce(sc.cash, 0)                           as sponsor_cash_cents,
  coalesce(sc.impact, 0)                         as sponsor_impact_cents
from years y
left join money_in     mi on mi.year = y.year
left join money_out    mo on mo.year = y.year
left join events       ev on ev.year = y.year
left join runners      ru on ru.year = y.year
left join pages        pg on pg.year = y.year
left join teams        tm on tm.year = y.year
left join supporters   su on su.year = y.year
left join sponsor_cash sc on sc.year = y.year
order by y.year;
grant select on public.v_public_year_stats to anon, authenticated;

-- causes: raised is one sum; what the pages raised is a column, not a page-side reduce
create view public.v_public_campaigns
  with (security_invoker = off, security_barrier = on) as
select
  c.slug, c.title, c.description, c.goal_cents, c.payment_reference, c.suggested_amounts,
  c.starts_at, c.ends_at, c.beneficiary_summary,
  ch.slug as chapter_slug, ch.name as chapter_name,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  c.cover_path,
  c.id,
  coalesce((select sum(m.amount_cents) from public.v_money_out_all m where m.campaign_id = c.id and m.is_paid), 0) as disbursed_cents,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id and m.fundraiser_id is not null), 0) as pages_raised_cents
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public and (not c.is_test or public.test_mode());
grant select on public.v_public_campaigns to anon, authenticated;

create view public.v_campaign_totals
  with (security_invoker = off, security_barrier = on) as
select
  c.id,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  coalesce((select sum(m.amount_cents) from public.v_money_out_all m where m.campaign_id = c.id and m.is_paid), 0) as disbursed_cents,
  coalesce((select count(*) from public.v_money_out_all m where m.campaign_id = c.id and m.source <> 'adjustment'), 0) as hand_overs
from public.campaigns c
where public.is_staff();
grant select on public.v_campaign_totals to authenticated;

-- money in per day, for the console overview (staff only)
drop view if exists public.v_money_in_daily;
create view public.v_money_in_daily
  with (security_invoker = off, security_barrier = on) as
select m.entry_date, sum(m.amount_cents) as amount_cents, count(*) as entries
from public.v_money_in_all m
where public.is_staff()
group by m.entry_date;
grant select on public.v_money_in_daily to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4 ─ pages, teams, leaderboards, donor wall: the same rows, test-aware
create view public.v_fundraiser_totals
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
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.fundraiser_id = f.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.fundraiser_id = f.id), 0) as donor_count,
  f.payment_reference,
  f.created_at,
  e.slug as event_slug,
  e.name as event_name,
  c.slug as campaign_slug,
  t.slug as team_slug,
  t.name as team_name,
  f.campaign_id,
  c.title as campaign_title
from public.fundraisers f
left join public.events e on e.id = f.event_id
left join public.campaigns c on c.id = f.campaign_id and c.is_public
left join public.teams t on t.id = f.team_id
where f.status = 'active' and (not f.is_test or public.test_mode());

create view public.v_leaderboard
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
  (select c.slug from public.campaigns c where c.id = ft.campaign_id and c.is_public) as campaign_slug
from public.v_fundraiser_totals ft;

create view public.v_team_totals
  with (security_invoker = off, security_barrier = on) as
select
  t.id,
  t.slug,
  t.name,
  t.goal_cents,
  t.event_id,
  e.slug as event_slug,
  e.name as event_name,
  count(ft.id) as member_count,
  coalesce(sum(ft.raised_cents), 0) as raised_cents,
  coalesce(sum(ft.donor_count), 0) as donor_count,
  t.description,
  t.photo_path,
  t.campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title
from public.teams t
left join public.events e on e.id = t.event_id
left join public.campaigns c on c.id = t.campaign_id and c.is_public
left join public.v_fundraiser_totals ft on ft.team_id = t.id
where not t.is_test or public.test_mode()
group by t.id, e.id, c.id;

create view public.v_leaderboard_teams
  with (security_invoker = off, security_barrier = on) as
select
  tt.*,
  rank() over (partition by tt.campaign_id order by tt.raised_cents desc) as rank
from public.v_team_totals tt
where tt.member_count > 0;

grant select on public.v_fundraiser_totals, public.v_leaderboard,
                public.v_team_totals, public.v_leaderboard_teams
  to anon, authenticated;

create or replace view public.v_public_donor_wall
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  f.slug as fundraiser_slug,
  case when d.is_anonymous then null
       else coalesce(d.display_name, d.donor_name) end as display_name,
  d.net_cents as amount_cents,
  case when d.is_message_hidden then null else d.message end as message,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.approved_at
from public.donations d
join public.fundraisers f on f.id = d.fundraiser_id
where d.status in ('approved', 'refunded')
  and f.status = 'active'
  and (not d.is_test or public.test_mode()) and (not f.is_test or public.test_mode());

create or replace view public.v_challenge_standings
  with (security_invoker = off, security_barrier = on) as
select
  e.id as event_id,
  f.id,
  f.slug,
  f.title,
  f.photo_path,
  count(a.id)                       as activity_count,
  coalesce(sum(a.distance_m), 0)    as distance_m,
  coalesce(sum(a.moving_time_s), 0) as moving_time_s,
  coalesce(sum(a.elevation_m), 0)   as elevation_m,
  max(a.started_at)                 as last_activity_at
from public.events e
join public.fundraisers f on f.campaign_id = e.campaign_id and f.status = 'active' and (not f.is_test or public.test_mode())
left join public.activities a
  on a.fundraiser_id = f.id
 and a.started_at >= coalesce(e.starts_at, a.started_at)
 and a.started_at <= coalesce(e.ends_at, e.starts_at, a.started_at) + interval '1 day'
 and (a.source = 'manual' or exists (
       select 1 from public.strava_connections sc
       where sc.user_id = a.user_id and sc.share_public))
where e.kind = 'challenge' and e.is_published and (not e.is_test or public.test_mode())
group by e.id, f.id;

-- ─────────────────────────────────────────────────────────────────────────
-- 5 ─ public content views: test rows only while test mode is on
create or replace view public.v_public_ledger_adjustments
  with (security_invoker = off, security_barrier = on) as
select
  la.id,
  la.created_at::date as entry_date,
  la.amount_cents,
  la.reason,
  la.references_donation_id,
  la.references_disbursement_id,
  ch.slug as chapter_slug
from public.ledger_adjustments la
left join public.donations     dd on dd.id = la.references_donation_id
left join public.disbursements db on db.id = la.references_disbursement_id
left join public.chapters      ch on ch.id = coalesce(dd.chapter_id, db.chapter_id)
where ((dd.id is not null and dd.status in ('approved', 'refunded') and (not dd.is_test or public.test_mode()))
    or (db.id is not null and db.published_at is not null and (not db.is_test or public.test_mode())))
  and (not la.is_test or public.test_mode());

create or replace view public.v_public_sponsors
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
  coalesce(e.starts_at, c.starts_at) as starts_at,
  s.fund
from public.sponsors s
left join public.campaigns  c  on c.id  = s.campaign_id
left join public.events     e  on e.id  = s.event_id
left join public.supporters su on su.id = s.supporter_id
where s.status in ('signed', 'active') and (not s.is_test or public.test_mode());

create or replace view public.v_public_year_supporters
  with (security_invoker = off, security_barrier = on) as
with rows as (
  select s.supporter_id,
         coalesce(s.year, extract(year from coalesce(e.starts_at, c.starts_at))::int) as year,
         case when s.is_in_kind then 0 else coalesce(s.amount_cents, 0) end as cash_cents,
         case when s.is_in_kind or s.fund <> 'impact' then 0 else coalesce(s.amount_cents, 0) end as impact_cents,
         s.is_in_kind,
         s.tier,
         0 as offers
    from public.sponsors s
    left join public.events e on e.id = s.event_id
    left join public.campaigns c on c.id = s.campaign_id
   where s.status in ('signed', 'active') and (not s.is_test or public.test_mode())
  union all
  select p.supporter_id,
         extract(year from coalesce(p.starts_at, p.ends_at))::int,
         0, 0, false, null, 1
    from public.perk_challenges p
   where p.is_active
)
select
  r.year,
  su.id, su.name, su.slug, su.logo_path, su.website, su.kind,
  sum(r.cash_cents)::bigint as cash_cents,
  bool_or(r.is_in_kind) as in_kind,
  array_remove(array_agg(distinct r.tier), null) as tiers,
  sum(r.offers)::int as offers,
  sum(r.impact_cents)::bigint as impact_cents
from rows r
join public.supporters su on su.id = r.supporter_id and su.is_active and (not su.is_test or public.test_mode())
where r.year is not null
group by r.year, su.id, su.name, su.slug, su.logo_path, su.website, su.kind;

create or replace view public.v_public_supporters
  with (security_invoker = off, security_barrier = on) as
select s.id, s.name, s.slug, s.logo_path, s.website, s.kind
from public.supporters s
where s.is_active and (not s.is_test or public.test_mode());

create or replace view public.v_public_year_reports
  with (security_invoker = off, security_barrier = on) as
select year, headline, summary_md, plan_md, volunteers, beneficiaries, venues,
       is_legacy, figures, events, supporters, beneficiaries_list, donors_list,
       volunteers_list, campaign_id
from public.year_reports
where is_public and (not is_test or public.test_mode());

create or replace view public.v_public_beneficiaries
  with (security_invoker = off, security_barrier = on) as
select b.id, b.slug, b.name, b.website, b.photo_path, b.story, b.sort_order,
       c.slug as campaign_slug, c.title as campaign_title
from public.beneficiaries b
left join public.campaigns c on c.id = b.campaign_id
where b.is_published and (not b.is_test or public.test_mode());

drop view if exists public.v_public_cause_proposals;
create view public.v_public_cause_proposals
  with (security_invoker = off, security_barrier = on) as
with counted as (
  select p.id, p.title, p.summary, p.location, p.beneficiary, p.amount_cents, p.status, p.created_at,
         split_part(coalesce(pr.full_name, ''), ' ', 1) as proposer_first_name,
         c.slug as campaign_slug,
         (select count(*) from public.cause_votes v where v.proposal_id = p.id) as vote_count,
         (p.proposer_id = (select auth.uid())) as is_mine
    from public.cause_proposals p
    join public.profiles pr on pr.id = p.proposer_id
    left join public.campaigns c on c.id = p.campaign_id and c.is_public
   where p.status in ('open', 'shortlisted', 'chosen') and (not p.is_test or public.test_mode())
)
select *,
       rank() over (partition by (status in ('open', 'shortlisted')) order by vote_count desc, created_at asc) as vote_rank
from counted;
grant select on public.v_public_cause_proposals to anon, authenticated;

create or replace view public.v_public_events
  with (security_invoker = off, security_barrier = on) as
select
  e.id, e.slug, e.name, e.starts_at, e.venue, e.registration_opens_at, e.registration_closes_at, e.distances,
  c.slug as campaign_slug, e.kind, e.challenge_metric, e.ends_at, e.price_tiers, e.capacity,
  (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'going' and (not r.is_test or public.test_mode())) as going_count,
  e.description, e.offers_shirts, e.cover_path, c.title as campaign_title,
  e.hosting, e.external_url, e.bib_policy, e.bib_capacity, e.max_guests,
  (select count(*) from public.registrations r where r.event_id = e.id and r.needs_bib and r.status <> 'cancelled' and (not r.is_test or public.test_mode())) as bibs_claimed,
  e.registration_mode, e.organizer_name
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published and (not e.is_test or public.test_mode());

-- staff view of accounts: money from the ledger, counts test-aware
create or replace view public.v_staff_members
  with (security_invoker = off, security_barrier = on) as
select
  p.id,
  p.full_name,
  p.role,
  u.email,
  u.created_at as joined_at,
  (select count(*) from public.fundraisers f where f.user_id = p.id and (not f.is_test or public.test_mode())) as pages,
  (select count(*) from public.fundraisers f where f.user_id = p.id and f.status = 'active' and (not f.is_test or public.test_mode())) as live_pages,
  (select coalesce(sum(m.amount_cents), 0)
     from public.v_money_in_all m join public.fundraisers f on f.id = m.fundraiser_id
    where f.user_id = p.id) as raised_cents,
  (select count(*) from public.teams t where t.captain_id = p.id and (not t.is_test or public.test_mode())) as teams,
  (select count(*) from public.registrations r where r.user_id = p.id and r.status <> 'cancelled' and (not r.is_test or public.test_mode())) as registrations,
  (select count(*) from public.event_rsvps r where r.user_id = p.id and (not r.is_test or public.test_mode())) as rsvps,
  exists (select 1 from public.strava_connections s where s.user_id = p.id) as strava,
  (select s.last_sync_at from public.strava_connections s where s.user_id = p.id) as strava_last_sync,
  (select count(*) from public.activities a
    where a.user_id = p.id and a.source = 'strava'
      and a.started_on >= (now() at time zone 'Europe/Podgorica')::date - 29) as activities_30d,
  (select count(*) from public.perk_awards w where w.user_id = p.id and w.status <> 'revoked') as awards,
  (select count(*) from public.v_money_in_all m
    where m.source = 'ledger' and u.email is not null and m.donor_key = 'e:' || md5(lower(u.email))) as donations,
  (select coalesce(sum(m.amount_cents), 0) from public.v_money_in_all m
    where m.source in ('ledger', 'adjustment') and u.email is not null and m.donor_key = 'e:' || md5(lower(u.email))) as given_cents,
  (select s.athlete_avatar_url from public.strava_connections s where s.user_id = p.id) as avatar_url,
  p.title,
  p.quote,
  p.photo_path,
  p.is_team,
  p.team_order
from public.profiles p
left join auth.users u on u.id = p.id
where public.is_staff();
grant select on public.v_staff_members to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6 ─ purge: flip live children of a test parent first, detach what the
--     single deletes detach, then remove
create or replace function public.purge_test_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
  total int := 0;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- A child of a test parent goes with the purge: mark it test first, the
  -- one edit the immutability triggers allow on live money.
  update public.donations d set is_test = true
   where not d.is_test
     and (exists (select 1 from public.campaigns c where c.id = d.campaign_id and c.is_test)
       or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.is_test)
       or exists (select 1 from public.events e where e.id = d.event_id and e.is_test));
  update public.disbursements db set is_test = true
   where not db.is_test and exists (select 1 from public.campaigns c where c.id = db.campaign_id and c.is_test);
  update public.ledger_adjustments la set is_test = true
   where not la.is_test
     and (exists (select 1 from public.donations d where d.id = la.references_donation_id and d.is_test)
       or exists (select 1 from public.disbursements db where db.id = la.references_disbursement_id and db.is_test));

  delete from public.ledger_adjustments la
   where la.is_test
      or exists (select 1 from public.donations d where d.id = la.references_donation_id and d.is_test)
      or exists (select 1 from public.disbursements db where db.id = la.references_disbursement_id and db.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.donations d where d.is_test;
  get diagnostics n = row_count; total := total + n;

  delete from public.disbursements db where db.is_test;
  get diagnostics n = row_count; total := total + n;

  delete from public.registrations r
   where r.is_test or exists (select 1 from public.events e where e.id = r.event_id and e.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.event_rsvps r
   where r.is_test or exists (select 1 from public.events e where e.id = r.event_id and e.is_test);
  get diagnostics n = row_count; total := total + n;

  -- a live page in a test team keeps its page, minus the team
  update public.fundraisers f set team_id = null
   where exists (select 1 from public.teams t where t.id = f.team_id
                    and (t.is_test or exists (select 1 from public.campaigns c where c.id = t.campaign_id and c.is_test)));

  delete from public.ask_list_items a
   where exists (select 1 from public.fundraisers f where f.id = a.fundraiser_id
                    and (f.is_test or exists (select 1 from public.campaigns c where c.id = f.campaign_id and c.is_test)));
  delete from public.fundraisers f
   where f.is_test or exists (select 1 from public.campaigns c where c.id = f.campaign_id and c.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.teams t
   where t.is_test or exists (select 1 from public.campaigns c where c.id = t.campaign_id and c.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.cause_votes v
   where exists (select 1 from public.cause_proposals p where p.id = v.proposal_id and p.is_test);
  delete from public.cause_proposals where is_test;
  get diagnostics n = row_count; total := total + n;

  delete from public.sponsors s
   where s.is_test
      or exists (select 1 from public.supporters su where su.id = s.supporter_id and su.is_test)
      or exists (select 1 from public.campaigns c where c.id = s.campaign_id and c.is_test)
      or exists (select 1 from public.events e where e.id = s.event_id and e.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.supporters where is_test;
  get diagnostics n = row_count; total := total + n;

  delete from public.beneficiaries b
   where b.is_test or exists (select 1 from public.campaigns c where c.id = b.campaign_id and c.is_test);
  get diagnostics n = row_count; total := total + n;

  update public.year_reports yr set campaign_id = null
   where exists (select 1 from public.campaigns c where c.id = yr.campaign_id and c.is_test);
  delete from public.year_reports where is_test;
  get diagnostics n = row_count; total := total + n;

  -- what the single deletes detach, the purge detaches too
  update public.perk_challenges p set event_id = null
   where exists (select 1 from public.events e where e.id = p.event_id and e.is_test);
  update public.gallery_items g set event_id = null
   where exists (select 1 from public.events e where e.id = g.event_id and e.is_test);
  update public.gallery_items g set campaign_id = null
   where exists (select 1 from public.campaigns c where c.id = g.campaign_id and c.is_test);
  update public.fundraisers f set event_id = null
   where exists (select 1 from public.events e where e.id = f.event_id and e.is_test);
  update public.teams t set event_id = null
   where exists (select 1 from public.events e where e.id = t.event_id and e.is_test);
  update public.cause_proposals p set campaign_id = null
   where exists (select 1 from public.campaigns c where c.id = p.campaign_id and c.is_test);
  update public.events e set campaign_id = null
   where exists (select 1 from public.campaigns c where c.id = e.campaign_id and c.is_test);

  delete from public.events where is_test;
  get diagnostics n = row_count; total := total + n;
  delete from public.campaigns where is_test;
  get diagnostics n = row_count; total := total + n;

  return jsonb_build_object('ok', true, 'deleted', total);
end;
$$;
revoke all on function public.purge_test_data() from public;
grant execute on function public.purge_test_data() to authenticated;

-- delete_campaign: a live gift that came in through one of the cause's pages counts too
create or replace function public.delete_campaign(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select title into v_title from public.campaigns where id = p_id;
  if v_title is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select count(*) into v_count from public.donations d
   where not d.is_test
     and (d.campaign_id = p_id
          or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.campaign_id = p_id));
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.disbursements where campaign_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'handovers', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.fundraisers where campaign_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'pages', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.teams where campaign_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'teams', 'count', v_count, 'name', v_title);
  end if;

  -- test money and test pages go with the cause
  delete from public.ledger_adjustments la using public.donations d
   where la.references_donation_id = d.id and d.is_test
     and (d.campaign_id = p_id
          or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.campaign_id = p_id));
  delete from public.ledger_adjustments la using public.disbursements db
   where la.references_disbursement_id = db.id and db.campaign_id = p_id and db.is_test;
  delete from public.donations d
   where d.is_test
     and (d.campaign_id = p_id
          or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.campaign_id = p_id));
  delete from public.disbursements where campaign_id = p_id and is_test;
  delete from public.ask_list_items a using public.fundraisers f where a.fundraiser_id = f.id and f.campaign_id = p_id and f.is_test;
  delete from public.fundraisers where campaign_id = p_id and is_test;
  delete from public.teams where campaign_id = p_id and is_test;

  update public.events          set campaign_id = null where campaign_id = p_id;
  update public.sponsors        set campaign_id = null where campaign_id = p_id;
  update public.gallery_items   set campaign_id = null where campaign_id = p_id;
  update public.cause_proposals set campaign_id = null where campaign_id = p_id;
  update public.beneficiaries   set campaign_id = null where campaign_id = p_id;
  update public.year_reports    set campaign_id = null where campaign_id = p_id;
  delete from public.campaigns where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_title);
end;
$$;

-- purge_demo_data: admin only, and corrections on demo gifts go too
create or replace function public.purge_demo_data()
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_users uuid[];
  v_real  integer;
begin
  if not public.is_admin() then
    raise exception 'purge_demo_data: admin only' using errcode = '42501';
  end if;

  select coalesce(array_agg(row_id), '{}')
    into v_users
    from public.demo_records where kind = 'user';

  -- Real money on a demo page is the owner's call, never the purge's.
  select count(*) into v_real
    from public.donations d
   where d.status in ('approved', 'refunded')
     and d.fundraiser_id in (select row_id from public.demo_records where kind = 'fundraiser')
     and d.id not in (select row_id from public.demo_records where kind = 'donation');
  if v_real > 0 then
    raise exception
      'purge_demo_data: % approved donation(s) sit on demo pages and were not generated — see supabase/demo_blockers.sql',
      v_real using errcode = 'P0001';
  end if;

  -- Abandoned checkouts against demo pages carry no money.
  delete from public.donations d
   where d.status not in ('approved', 'refunded')
     and d.fundraiser_id in (select row_id from public.demo_records where kind = 'fundraiser')
     and d.id not in (select row_id from public.demo_records where kind = 'donation');

  alter table public.donations disable trigger trg_donations_immutability;
  alter table public.ledger_adjustments disable trigger trg_ledger_adjustments_immutability;

  delete from public.ledger_adjustments
   where references_donation_id in
         (select row_id from public.demo_records where kind = 'donation');

  delete from public.donations
   where id in (select row_id from public.demo_records where kind = 'donation');

  alter table public.ledger_adjustments enable trigger trg_ledger_adjustments_immutability;
  alter table public.donations enable trigger trg_donations_immutability;

  delete from public.activities
   where fundraiser_id in
         (select row_id from public.demo_records where kind = 'fundraiser');

  delete from public.ask_list_items
   where fundraiser_id in
         (select row_id from public.demo_records where kind = 'fundraiser');

  delete from public.fundraisers
   where id in (select row_id from public.demo_records where kind = 'fundraiser');

  -- A real member who joined a demo team keeps their page, minus the team.
  update public.fundraisers
     set team_id = null
   where team_id in (select row_id from public.demo_records where kind = 'team');

  delete from public.teams
   where id in (select row_id from public.demo_records where kind = 'team');

  delete from public.registrations
   where user_id = any (v_users);

  delete from public.event_rsvps
   where user_id = any (v_users);

  delete from public.demo_records where kind <> 'user';

  return v_users;
end;
$$;
revoke all on function public.purge_demo_data() from public;
grant execute on function public.purge_demo_data() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 7 ─ a member proposes; only staff decide
drop policy if exists cause_proposals_insert_own on public.cause_proposals;
create policy cause_proposals_insert_own on public.cause_proposals
  for insert to authenticated
  with check (proposer_id = (select auth.uid())
              and status in ('open', 'rejected')
              and campaign_id is null and decided_at is null and staff_note is null);

notify pgrst, 'reload schema';
