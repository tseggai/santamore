-- ============================================================================
-- Santamore — the athlete's Strava name and picture on their own page
-- Apply AFTER 20260911000014_manual_activities.sql. Re-runnable.
--
-- Shown only to the athlete themselves (API Agreement §2.3) and, as a name,
-- to staff on the roster. Tokens stay out of every grant as before.
-- ============================================================================

alter table public.strava_connections
  add column if not exists athlete_name       text,
  add column if not exists athlete_avatar_url text;

grant select (athlete_name, athlete_avatar_url) on public.strava_connections to authenticated;

create or replace view public.v_staff_athletes
  with (security_invoker = off, security_barrier = on) as
select
  sc.user_id,
  sc.athlete_id,
  sc.scope,
  sc.share_public,
  sc.connected_at,
  sc.last_sync_at,
  p.full_name,
  u.email,
  (select count(*) from public.activities a
    where a.user_id = sc.user_id and a.source = 'strava') as activities_total,
  (select count(*) from public.activities a
    where a.user_id = sc.user_id and a.source = 'strava'
      and a.started_on >= (now() at time zone 'Europe/Podgorica')::date - 29) as activities_30d,
  (select coalesce(sum(a.distance_m), 0) from public.activities a
    where a.user_id = sc.user_id and a.source = 'strava'
      and a.started_on >= (now() at time zone 'Europe/Podgorica')::date - 29) as distance_30d_m,
  (select max(a.started_on) from public.activities a
    where a.user_id = sc.user_id and a.source = 'strava') as last_activity_on,
  (select count(*) from public.perk_awards w
    where w.user_id = sc.user_id and w.status <> 'revoked') as awards_total,
  (select count(*) from public.perk_awards w
    where w.user_id = sc.user_id and w.status = 'redeemed') as awards_redeemed,
  (select count(*) from public.fundraisers f where f.user_id = sc.user_id) as pages,
  sc.athlete_name
from public.strava_connections sc
join public.profiles p on p.id = sc.user_id
left join auth.users u on u.id = sc.user_id
where public.is_staff();

grant select on public.v_staff_athletes to authenticated;
