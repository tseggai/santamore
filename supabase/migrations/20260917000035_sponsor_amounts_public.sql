-- ============================================================================
-- Santamore — sponsor amounts on the public site
-- Apply AFTER 20260917000034_supporters_delete.sql. Re-runnable.
--
-- The site shows each sponsor with what they gave: cash sponsorships as a
-- figure, in-kind ones as "in kind". Only signed/active deals are public,
-- as before. Both views change shape, so they are dropped and recreated.
-- ============================================================================

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
  case when s.is_in_kind then null else s.amount_cents end as amount_cents,
  extract(year from coalesce(e.starts_at, c.starts_at))::int as year
from public.sponsors s
left join public.campaigns  c  on c.id  = s.campaign_id
left join public.events     e  on e.id  = s.event_id
left join public.supporters su on su.id = s.supporter_id
where s.status in ('signed', 'active');

grant select on public.v_public_sponsors to anon, authenticated;

-- One row per supporter and year: cash given, whether anything was in kind,
-- the tiers named on the deals, and how many live challenge offers.
drop view if exists public.v_public_year_supporters;
create view public.v_public_year_supporters
  with (security_invoker = off, security_barrier = on) as
with rows as (
  select s.supporter_id,
         extract(year from coalesce(e.starts_at, c.starts_at))::int as year,
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
  su.id, su.name, su.slug, su.logo_path, su.website,
  sum(r.cash_cents)::bigint as cash_cents,
  bool_or(r.is_in_kind) as in_kind,
  array_remove(array_agg(distinct r.tier), null) as tiers,
  sum(r.offers)::int as offers
from rows r
join public.supporters su on su.id = r.supporter_id and su.is_active
where r.year is not null
group by r.year, su.id, su.name, su.slug, su.logo_path, su.website;

grant select on public.v_public_year_supporters to anon, authenticated;
