-- ============================================================================
-- Santamore — a race someone else organises: register with them, or with us
-- Apply AFTER 20260919000045_delete_event.sql. Re-runnable.
--
-- An external race takes registrations in one of two ways:
--   organizer  people register (and pay) on the organiser's site; here they
--              only tell us they run for Santamore, free. The default.
--   here       we register the team with the organiser and pay for the
--              places in one go, so people register and pay here; the
--              organiser's price is a price tier, bibs come from our pool.
-- Our own events always register here. The organiser's name is shown on
-- the event page and carried into the year's events.
-- ============================================================================

alter table public.events
  add column if not exists registration_mode text not null default 'organizer',
  add column if not exists organizer_name    text;
alter table public.events drop constraint if exists events_registration_mode_check;
alter table public.events add constraint events_registration_mode_check
  check (registration_mode in ('organizer', 'here'));

update public.events set registration_mode = 'here'
 where hosting = 'own' and registration_mode <> 'here';

create or replace view public.v_public_events
  with (security_invoker = off, security_barrier = on) as
select
  e.id,
  e.slug,
  e.name,
  e.starts_at,
  e.venue,
  e.registration_opens_at,
  e.registration_closes_at,
  e.distances,
  c.slug as campaign_slug,
  e.kind,
  e.challenge_metric,
  e.ends_at,
  e.price_tiers,
  e.capacity,
  (select count(*) from public.event_rsvps r
    where r.event_id = e.id and r.status = 'going') as going_count,
  e.description,
  e.offers_shirts,
  e.cover_path,
  c.title as campaign_title,
  e.hosting,
  e.external_url,
  e.bib_policy,
  e.bib_capacity,
  e.max_guests,
  (select count(*) from public.registrations r
    where r.event_id = e.id and r.needs_bib and r.status <> 'cancelled') as bibs_claimed,
  e.registration_mode,
  e.organizer_name
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published;

grant select on public.v_public_events to anon, authenticated;

notify pgrst, 'reload schema';
