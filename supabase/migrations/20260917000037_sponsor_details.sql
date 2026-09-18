-- ============================================================================
-- Santamore — what a sponsorship was for, on the public site
-- Apply AFTER 20260917000036_supporter_kind.sql. Re-runnable.
--
-- Clicking a sponsor or a donor on the site opens the detail of each gift:
-- the cause or event it was on and when. The view gains those names.
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
  coalesce(su.kind, 'sponsor') as kind,
  case when s.is_in_kind then null else s.amount_cents end as amount_cents,
  extract(year from coalesce(e.starts_at, c.starts_at))::int as year,
  c.title as campaign_title,
  e.name as event_name,
  coalesce(e.starts_at, c.starts_at) as starts_at
from public.sponsors s
left join public.campaigns  c  on c.id  = s.campaign_id
left join public.events     e  on e.id  = s.event_id
left join public.supporters su on su.id = s.supporter_id
where s.status in ('signed', 'active');

grant select on public.v_public_sponsors to anon, authenticated;
