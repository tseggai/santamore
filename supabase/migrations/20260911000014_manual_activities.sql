-- ============================================================================
-- Santamore — typed-in activities never mint a reward by default
-- Apply AFTER 20260911000013_strava_visibility.sql. Re-runnable.
--
-- Strava lets anyone add an activity by hand ("5 km run", no GPS). Until
-- now such an entry arrived as source = 'strava' and qualified like a
-- recorded run. is_manual records how the activity was created, whatever
-- the source; a challenge counts manual entries only when the partner
-- explicitly allows it (allow_manual), which now covers both our own
-- dashboard log and Strava's manual entries.
-- ============================================================================

alter table public.activities
  add column if not exists is_manual boolean not null default false;

update public.activities set is_manual = true
 where source = 'manual' and is_manual = false;

create or replace function public.perk_activity_qualifies(
  a public.activities,
  c public.perk_challenges
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (not a.is_manual or c.allow_manual)
     and a.sport_type is not null
     and a.sport_type = any (c.sport_types)
     and a.distance_m >= c.min_distance_m
     and (c.max_moving_time_s is null
          or (a.moving_time_s > 0 and a.moving_time_s <= c.max_moving_time_s))
     and a.elevation_m >= c.min_elevation_m
     and (c.max_pace_s_per_km is null
          or (a.distance_m > 0 and a.moving_time_s > 0
              and a.moving_time_s::numeric * 1000 / a.distance_m <= c.max_pace_s_per_km));
$$;
revoke all on function public.perk_activity_qualifies(public.activities, public.perk_challenges) from public;
