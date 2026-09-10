-- ============================================================================
-- Santamore — partner perk rules: pace, "x days", partner link
-- Apply AFTER 20260910000010_multi_pages_sponsor_links.sql. Re-runnable.
--
-- Partners define their own offers (owner request): "run 5 km on 3 days
-- this week", "5 km under 5:00/km", "any run of 10 km". Two rule
-- dimensions join the per-activity ones from 0009:
--   • max_pace_s_per_km — moving time per kilometre must be at or under.
--   • required_days + window_days — the athlete needs qualifying activities
--     on N DISTINCT days inside a rolling window of W days ending on the
--     activity's day (W null = the challenge's own period). One award per
--     athlete per window, so a 3-in-7 rule pays once a week, not once for
--     every run after the third.
-- The qualification predicate lives in one function so the single-run and
-- multi-day paths can never disagree.
-- ============================================================================

alter table public.perk_challenges
  add column if not exists max_pace_s_per_km integer check (max_pace_s_per_km > 0),
  add column if not exists required_days     integer not null default 1 check (required_days >= 1),
  add column if not exists window_days       integer check (window_days >= 1),
  add column if not exists partner_url       text;

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
  c.partner_url
from public.perk_challenges c
where c.is_active;

grant select on public.v_public_perk_challenges to anon, authenticated;

/** Does one activity satisfy a challenge's per-activity rule? */
create or replace function public.perk_activity_qualifies(
  a public.activities,
  c public.perk_challenges
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (a.source = 'strava' or c.allow_manual)
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

create or replace function public.evaluate_activity_perks(p_activity_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_act    public.activities%rowtype;
  v_ch     public.perk_challenges%rowtype;
  v_count  integer := 0;
  v_code   text;
  v_tries  integer;
  v_from   date;
  v_days   integer;
begin
  select * into v_act from public.activities where id = p_activity_id;
  if not found then
    return 0;
  end if;

  for v_ch in
    select * from public.perk_challenges c
     where c.is_active
       and (c.starts_at is null or c.starts_at <= v_act.started_at)
       and (c.ends_at is null or c.ends_at >= v_act.started_at)
     order by c.id
     for update
  loop
    if not public.perk_activity_qualifies(v_act, v_ch) then continue; end if;

    if exists (select 1 from public.perk_awards a
                where a.challenge_id = v_ch.id and a.activity_id = v_act.id) then
      continue;
    end if;

    if v_ch.required_days > 1 then
      -- Rolling window ending today; without a window, the challenge period.
      v_from := case
        when v_ch.window_days is not null then v_act.started_on - (v_ch.window_days - 1)
        when v_ch.starts_at is not null then (v_ch.starts_at at time zone 'Europe/Podgorica')::date
        else v_act.started_on - 3650
      end;
      -- One award per athlete per window.
      if exists (select 1 from public.perk_awards a
                  where a.challenge_id = v_ch.id and a.user_id = v_act.user_id
                    and a.awarded_on >= v_from and a.status <> 'revoked') then
        continue;
      end if;
      select count(distinct x.started_on) into v_days
        from public.activities x
       where x.user_id = v_act.user_id
         and x.started_on between v_from and v_act.started_on
         and public.perk_activity_qualifies(x, v_ch);
      if v_days < v_ch.required_days then continue; end if;
    end if;

    if (select count(*) from public.perk_awards a
         where a.challenge_id = v_ch.id and a.user_id = v_act.user_id
           and a.awarded_on = v_act.started_on and a.status <> 'revoked')
       >= v_ch.per_user_daily_cap then
      continue;
    end if;
    if v_ch.daily_cap is not null and
       (select count(*) from public.perk_awards a
         where a.challenge_id = v_ch.id and a.awarded_on = v_act.started_on
           and a.status <> 'revoked') >= v_ch.daily_cap then
      continue;
    end if;

    v_tries := 0;
    loop
      v_code := public.perk_award_code();
      begin
        insert into public.perk_awards
          (challenge_id, user_id, activity_id, awarded_on, code, expires_at)
        values
          (v_ch.id, v_act.user_id, v_act.id, v_act.started_on, v_code,
           (v_act.started_on + v_ch.valid_days)::timestamp at time zone 'Europe/Podgorica');
        v_count := v_count + 1;
        exit;
      exception when unique_violation then
        v_tries := v_tries + 1;
        if v_tries >= 5 then exit; end if;
      end;
    end loop;
  end loop;

  return v_count;
end;
$$;
revoke all on function public.evaluate_activity_perks(uuid) from public, anon, authenticated;
