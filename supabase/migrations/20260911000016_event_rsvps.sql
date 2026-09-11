-- ============================================================================
-- Santamore — RSVPs, and the member's own view of events and campaigns
-- Apply AFTER 20260911000015_strava_athlete_profile.sql. Re-runnable.
--
-- An RSVP is a free "I'm going / interested" from a signed-in member,
-- separate from a paid registration. Members own their rows; staff read
-- all of them; the public sees only the going count on each event.
-- v_my_donations gains the ids the console needs to say "you supported
-- this event / campaign".
-- ============================================================================

create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  status     text not null check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_rsvps enable row level security;
grant select, insert, update, delete on public.event_rsvps to authenticated;

drop policy if exists event_rsvps_own on public.event_rsvps;
create policy event_rsvps_own on public.event_rsvps
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists event_rsvps_staff_select on public.event_rsvps;
create policy event_rsvps_staff_select on public.event_rsvps
  for select to authenticated using (public.is_staff());

create index if not exists event_rsvps_event_idx on public.event_rsvps (event_id, status);

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
    where r.event_id = e.id and r.status = 'going') as going_count
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published;

grant select on public.v_public_events to anon, authenticated;

create or replace view public.v_my_donations
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.created_at,
  d.amount_cents,
  d.fee_covered_cents,
  d.net_cents,
  d.rail,
  d.status,
  d.is_recurring,
  d.is_anonymous,
  d.display_name,
  d.message,
  f.slug  as fundraiser_slug,
  f.title as fundraiser_title,
  c.slug  as campaign_slug,
  c.title as campaign_title,
  e.name  as event_name,
  coalesce(f.payment_reference, c.payment_reference) as payment_reference,
  f.event_id,
  d.campaign_id
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
left join public.events e on e.id = f.event_id
left join public.campaigns c on c.id = d.campaign_id
where d.donor_email is not null
  and lower(d.donor_email) = lower(coalesce(auth.email(), ''));

grant select on public.v_my_donations to authenticated;
