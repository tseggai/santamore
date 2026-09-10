-- ============================================================================
-- Santamore — one page per runner PER EVENT, sponsor ↔ campaign/event links
-- Apply AFTER 20260910000009_campaign_pages_strava_perks.sql. Re-runnable.
--
--  1. A runner may hold a fundraiser page for each event they take part
--     in (owner request). The page stays bound to its event; the campaign
--     comes through the event. One page per runner per event is the only
--     new rule, so leaderboards and totals need no change.
--  2. Sponsors can be tied to a campaign and/or an event, so the partner
--     wall and the Operations Fund can be read per campaign and per event
--     (brief §4: /admin/partneri). Staff policies from 0006 already cover
--     sponsors; the public view exposes only the wall fields.
-- ============================================================================

-- 1 ─ one page per runner per event
create unique index if not exists fundraisers_user_event_key
  on public.fundraisers (user_id, event_id);

-- 2 ─ sponsor links + public partner wall
alter table public.sponsors
  add column if not exists campaign_id uuid references public.campaigns (id),
  add column if not exists event_id    uuid references public.events (id),
  add column if not exists created_at  timestamptz not null default now();

create index if not exists sponsors_campaign_idx on public.sponsors (campaign_id);
create index if not exists sponsors_event_idx on public.sponsors (event_id);

-- Signed/active sponsors, wall fields only — never amounts or contracts.
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
  e.slug as event_slug
from public.sponsors s
left join public.campaigns c on c.id = s.campaign_id
left join public.events e on e.id = s.event_id
where s.status in ('signed', 'active');

grant select on public.v_public_sponsors to anon, authenticated;
