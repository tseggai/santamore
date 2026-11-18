-- ============================================================================
-- Santamore — a reward is live only while its challenge is published
-- Apply AFTER 20261118000086_perk_period_follows_event.sql. Re-runnable.
--
-- A reward had two switches that did not know about each other: its own
-- is_active, and its challenge event's is_published. An active reward on a
-- draft challenge was listed publicly, showed in athletes' progress and
-- awarded codes for a challenge nobody had announced. Publishing the
-- challenge is now what puts its rewards on the site; Pause on a reward
-- still stops that one reward. The three readers gain one condition, the
-- event is published, and are otherwise exactly as they were (the view
-- from 0018, evaluate_activity_perks from 0011, my_perk_progress from
-- 0013).
-- ============================================================================

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
  (select e.slug from public.events e where e.id = c.event_id and e.is_published) as event_slug,
  c.supporter_id,
  (select s.slug from public.supporters s where s.id = c.supporter_id) as supporter_slug,
  (select s.logo_path from public.supporters s where s.id = c.supporter_id) as supporter_logo_path
from public.perk_challenges c
where c.is_active
  and exists (select 1 from public.events e where e.id = c.event_id and e.is_published);
grant select on public.v_public_perk_challenges to anon, authenticated;

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
       and exists (select 1 from public.events e where e.id = c.event_id and e.is_published)
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
       and exists (select 1 from public.events e where e.id = c.event_id and e.is_published)
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
