-- ============================================================================
-- Santamore — donors are gifts, not sponsorships; every list answers to a year
-- Apply AFTER 20260920000067_donors_view.sql. Re-runnable.
--
-- v_donor_gifts now holds gifts only: ledger rows and their corrections,
-- names recorded on a year report, and the cash of an individual supporter
-- (supporters.kind = 'donor'). An organisation's sponsorship is a sponsor's
-- business and stays on the Sponsors tab. Each row carries its year, and
-- v_donor_years groups the same rows by donor and year so the Donors tab
-- can show one year or all of them from the same sums.
--
-- The 2025 report listed "Santamore 25" as a recorded event while 0041 had
-- made it an event record, so the year counted it twice. The recorded line
-- goes; the record stays, like every event from now on.
-- ============================================================================

drop view if exists public.v_donor_years;
drop view if exists public.v_donors;
drop view if exists public.v_donor_gifts;

create view public.v_donor_gifts
  with (security_invoker = off, security_barrier = on) as
select
  m.id,
  m.donor_key,
  m.source,
  m.entry_date,
  extract(year from m.entry_date)::int as year,
  m.amount_cents,
  m.rail,
  coalesce(d.donor_name, m.display_name) as name,
  c.title as campaign_title,
  m.fundraiser_title
from public.v_money_in_all m
left join public.donations d on d.id = m.id and m.source = 'ledger'
left join public.sponsors s on s.id = m.id and m.source = 'sponsorship'
left join public.supporters su on su.id = s.supporter_id
left join public.campaigns c on c.id = m.campaign_id
where public.is_staff()
  and (m.source in ('ledger', 'adjustment', 'recorded')
       or (m.source = 'sponsorship' and coalesce(su.kind, 'sponsor') = 'donor'));
grant select on public.v_donor_gifts to authenticated;

create view public.v_donors
  with (security_invoker = off, security_barrier = on) as
select
  g.donor_key,
  coalesce(max(g.name), '') as name,
  sum(g.amount_cents) as given_cents,
  count(*) filter (where g.source <> 'adjustment') as gifts,
  min(g.entry_date) as first_date,
  max(g.entry_date) as last_date,
  array_agg(distinct g.source) as sources,
  array_remove(array_agg(distinct g.campaign_title), null) as causes,
  (select p.id from auth.users u join public.profiles p on p.id = u.id
    where g.donor_key = 'e:' || md5(lower(u.email)) limit 1) as user_id
from public.v_donor_gifts g
where public.is_staff()
group by g.donor_key;
grant select on public.v_donors to authenticated;

create view public.v_donor_years
  with (security_invoker = off, security_barrier = on) as
select
  g.donor_key,
  g.year,
  coalesce(max(g.name), '') as name,
  sum(g.amount_cents) as given_cents,
  count(*) filter (where g.source <> 'adjustment') as gifts,
  min(g.entry_date) as first_date,
  max(g.entry_date) as last_date,
  array_agg(distinct g.source) as sources,
  array_remove(array_agg(distinct g.campaign_title), null) as causes,
  (select p.id from auth.users u join public.profiles p on p.id = u.id
    where g.donor_key = 'e:' || md5(lower(u.email)) limit 1) as user_id
from public.v_donor_gifts g
where public.is_staff()
group by g.donor_key, g.year;
grant select on public.v_donor_years to authenticated;

-- the 2025 event is a record (0041); the report's recorded line duplicated it
update public.year_reports yr
   set events = '[]'::jsonb
 where yr.year = 2025
   and exists (select 1 from public.events e where e.slug = 'santamore-25')
   and yr.events = '[{"name":"Santamore 25","date":null,"venue":"Tivat"}]'::jsonb;

notify pgrst, 'reload schema';
