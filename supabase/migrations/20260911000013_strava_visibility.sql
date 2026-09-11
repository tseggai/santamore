-- ============================================================================
-- Santamore — Strava visibility: staff athlete roster, runner progress
-- Apply AFTER 20260911000012_my_giving.sql. Re-runnable.
--
--   • v_staff_athletes — who is connected, how active, what they earned.
--     Aggregates only (counts, distance), never individual activities and
--     never tokens; gated on is_staff() inside the definer view.
--   • my_perk_progress() — the signed-in runner's standing against every
--     active challenge as of today, using the SAME qualification predicate
--     as the awarding engine (perk_activity_qualifies) so "2 of 3 days"
--     here and the award there can never disagree.
-- ============================================================================

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
  (select count(*) from public.fundraisers f where f.user_id = sc.user_id) as pages
from public.strava_connections sc
join public.profiles p on p.id = sc.user_id
left join auth.users u on u.id = sc.user_id
where public.is_staff();

grant select on public.v_staff_athletes to authenticated;

/**
 * The caller's progress on each active challenge, as of today in the
 * organisation's time zone. Definer: runners cannot read perk_challenges
 * directly, and the predicate needs the full row.
 */
create or replace function public.my_perk_progress()
returns table (
  challenge_id       uuid,
  slug               text,
  title              text,
  partner_name       text,
  reward_label       text,
  partner_url        text,
  sport_types        text[],
  min_distance_m     integer,
  max_pace_s_per_km  integer,
  required_days      integer,
  window_days        integer,
  window_from        date,
  today              date,
  qualifying_days    integer,
  today_qualified    boolean,
  best_today_m       integer,
  awarded_in_window  boolean
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Europe/Podgorica')::date;
  v_ch    public.perk_challenges%rowtype;
  v_from  date;
begin
  if v_uid is null then
    return;
  end if;

  for v_ch in
    select * from public.perk_challenges c
     where c.is_active
       and (c.starts_at is null or c.starts_at <= now())
       and (c.ends_at is null or c.ends_at >= now())
     order by c.partner_name, c.title
  loop
    -- Same window arithmetic as evaluate_activity_perks, ending today.
    v_from := case
      when v_ch.required_days <= 1 then v_today
      when v_ch.window_days is not null then v_today - (v_ch.window_days - 1)
      when v_ch.starts_at is not null then (v_ch.starts_at at time zone 'Europe/Podgorica')::date
      else v_today - 3650
    end;

    challenge_id      := v_ch.id;
    slug              := v_ch.slug;
    title             := v_ch.title;
    partner_name      := v_ch.partner_name;
    reward_label      := v_ch.reward_label;
    partner_url       := v_ch.partner_url;
    sport_types       := v_ch.sport_types;
    min_distance_m    := v_ch.min_distance_m;
    max_pace_s_per_km := v_ch.max_pace_s_per_km;
    required_days     := v_ch.required_days;
    window_days       := v_ch.window_days;
    window_from       := v_from;
    today             := v_today;

    select count(distinct x.started_on) into qualifying_days
      from public.activities x
     where x.user_id = v_uid
       and x.started_on between v_from and v_today
       and public.perk_activity_qualifies(x, v_ch);

    select exists (
      select 1 from public.activities x
       where x.user_id = v_uid and x.started_on = v_today
         and public.perk_activity_qualifies(x, v_ch)
    ) into today_qualified;

    select coalesce(max(x.distance_m), 0) into best_today_m
      from public.activities x
     where x.user_id = v_uid and x.started_on = v_today
       and x.sport_type = any (v_ch.sport_types);

    select case
      when v_ch.required_days <= 1 then
        (select count(*) from public.perk_awards a
          where a.challenge_id = v_ch.id and a.user_id = v_uid
            and a.awarded_on = v_today and a.status <> 'revoked')
          >= v_ch.per_user_daily_cap
      else exists (
        select 1 from public.perk_awards a
         where a.challenge_id = v_ch.id and a.user_id = v_uid
           and a.awarded_on >= v_from and a.status <> 'revoked')
    end into awarded_in_window;

    return next;
  end loop;
end;
$$;

revoke all on function public.my_perk_progress() from public, anon;
grant execute on function public.my_perk_progress() to authenticated;
