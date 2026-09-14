-- Read-only. Why did "Purge demo data" fail with a foreign-key error?
-- Lists every row that points at a demo page or team but was not itself
-- generated, so the purge cannot delete the demo row it references.
-- Migration 0025 teaches the purge to detach real pages from demo teams
-- and to drop abandoned (pending/failed) checkouts on demo pages; approved
-- donations on demo pages are listed here and never touched.
with demo_pages as (select row_id as id from public.demo_records where kind = 'fundraiser'),
     demo_teams as (select row_id as id from public.demo_records where kind = 'team'),
     demo_donations as (select row_id as id from public.demo_records where kind = 'donation')
select 'real page in a demo team' as blocker, f.slug as row, f.status as detail, null::bigint as cents
  from public.fundraisers f
 where f.team_id in (select id from demo_teams) and f.id not in (select id from demo_pages)
union all
select 'unregistered donation on a demo page', d.id::text, d.status || ' · ' || d.rail, d.amount_cents
  from public.donations d
 where d.fundraiser_id in (select id from demo_pages) and d.id not in (select id from demo_donations)
union all
select 'ledger adjustment on such a donation', la.id::text, la.reason, la.amount_cents
  from public.ledger_adjustments la
  join public.donations d on d.id = la.references_donation_id
 where d.fundraiser_id in (select id from demo_pages) and d.id not in (select id from demo_donations)
order by blocker, row;
