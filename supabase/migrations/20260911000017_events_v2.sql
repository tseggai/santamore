-- ============================================================================
-- Santamore — events, second pass (owner review 2026-09-13)
-- Apply AFTER 20260911000016_event_rsvps.sql. Re-runnable.
--
--   • kind gains 'social' (party, happy hour, pub crawl): no distances, no
--     metric, no waiver; RSVP and optional ticket tiers.
--   • events.description — the "about" text; events.offers_shirts — the
--     shirt-size question only appears when there are shirts.
--   • Registrations carry the participant (name, email, phone) so one
--     account can register a child, a partner, a friend: the (event, user)
--     uniqueness goes; a created_at arrives for ordering.
--   • perk_challenges.event_id — a partner reward can belong to a
--     challenge event and is shown on its page.
--   • Staff may add chapters from the event form.
-- ============================================================================

alter table public.events drop constraint if exists events_kind_check;
alter table public.events
  add constraint events_kind_check check (kind in ('race', 'challenge', 'social'));

alter table public.events
  add column if not exists description   text,
  add column if not exists offers_shirts boolean not null default false;

alter table public.registrations
  add column if not exists participant_name  text,
  add column if not exists participant_email text,
  add column if not exists participant_phone text,
  add column if not exists created_at        timestamptz not null default now();
alter table public.registrations drop constraint if exists registrations_event_id_user_id_key;
create index if not exists registrations_event_user_idx on public.registrations (event_id, user_id);

alter table public.perk_challenges
  add column if not exists event_id uuid references public.events (id);

grant insert on public.chapters to authenticated;
drop policy if exists chapters_staff_insert on public.chapters;
create policy chapters_staff_insert on public.chapters
  for insert to authenticated with check (public.is_staff());

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
  e.offers_shirts
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published;

grant select on public.v_public_events to anon, authenticated;

create or replace view public.v_public_perk_challenges
  with (security_invoker = off, security_barrier = on) as
select
  c.id, c.slug, c.partner_name, c.title, c.description, c.reward_label,
  c.sport_types, c.min_distance_m, c.max_moving_time_s, c.min_elevation_m,
  c.allow_manual, c.per_user_daily_cap, c.daily_cap, c.valid_days,
  c.starts_at, c.ends_at,
  (select count(*) from public.perk_awards a
    where a.challenge_id = c.id
      and a.awarded_on = (now() at time zone 'Europe/Podgorica')::date
      and a.status <> 'revoked') as issued_today,
  (select count(*) from public.perk_awards a
    where a.challenge_id = c.id and a.status = 'redeemed') as redeemed_total,
  c.max_pace_s_per_km,
  c.required_days,
  c.window_days,
  c.partner_url,
  c.event_id,
  (select e.slug from public.events e where e.id = c.event_id and e.is_published) as event_slug
from public.perk_challenges c
where c.is_active;

grant select on public.v_public_perk_challenges to anon, authenticated;
