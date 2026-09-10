-- ============================================================================
-- Santamore — public campaign pages, Strava connections, partner perks
-- Apply AFTER 20260909000008_teams_events_admin_demo.sql.
--
--  1. v_public_campaigns grows the columns a public campaign page needs
--     (dates, beneficiary line, chapter, raised total, donor count).
--  2. Activities become person-owned facts: user_id (backfilled), a
--     nullable fundraiser_id, the athlete's local date and a name. A runner
--     without a fundraiser page can still connect Strava.
--  3. strava_connections — OAuth tokens, SERVICE-ROLE ONLY except a
--     column-level owner view of the non-secret columns. share_public is
--     the athlete's explicit consent to appear on public challenge
--     standings (Strava API Agreement §2.3: a user's Strava data may be
--     shown only to that user unless they consent). Standings therefore
--     exclude Strava rows without it.
--  4. Partner perks (owner request): a partner defines a rule — sport,
--     minimum distance, optional time cap, elevation — and a reward; a
--     qualifying Strava activity mints a one-time award code the athlete
--     shows (QR) at the partner, who redeems it with a PIN. Caps per
--     athlete per day and per partner per day. All evaluation happens in
--     evaluate_activity_perks() under a row lock, so caps hold under
--     concurrent webhooks. Redemption is an anonymous RPC (the partner scans
--     a QR without an account) throttled per code against PIN guessing.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1 ─ public campaigns ---------------------------------------------------------
create or replace view public.v_public_campaigns
  with (security_invoker = off, security_barrier = on) as
select
  c.slug,
  c.title,
  c.description,
  c.goal_cents,
  c.payment_reference,
  c.suggested_amounts,
  c.starts_at,
  c.ends_at,
  c.beneficiary_summary,
  ch.slug as chapter_slug,
  ch.name as chapter_name,
  -- Money for the campaign directly OR through pages of its events, plus
  -- append-only corrections — the same rule v_fundraiser_totals applies.
  coalesce((select sum(d.net_cents)
            from public.donations d
            left join public.fundraisers f on f.id = d.fundraiser_id
            left join public.events e on e.id = f.event_id
            where d.status in ('approved', 'refunded')
              and (d.campaign_id = c.id or e.campaign_id = c.id)), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              left join public.fundraisers f2 on f2.id = dd.fundraiser_id
              left join public.events e2 on e2.id = f2.event_id
              where dd.status in ('approved', 'refunded')
                and (dd.campaign_id = c.id or e2.campaign_id = c.id)), 0)
    as raised_cents,
  (select count(distinct coalesce(lower(d.donor_email), d.id::text))
   from public.donations d
   left join public.fundraisers f on f.id = d.fundraiser_id
   left join public.events e on e.id = f.event_id
   where d.status in ('approved', 'refunded')
     and (d.campaign_id = c.id or e.campaign_id = c.id)) as donor_count
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public;

-- 2 ─ activities belong to people ---------------------------------------------
alter table public.activities
  add column user_id    uuid references public.profiles (id) on delete cascade,
  add column started_on date,
  add column name       text;

update public.activities a
   set user_id = f.user_id
  from public.fundraisers f
 where f.id = a.fundraiser_id and a.user_id is null;

update public.activities
   set started_on = (started_at at time zone 'Europe/Podgorica')::date
 where started_on is null;

alter table public.activities
  alter column user_id set not null,
  alter column started_on set not null,
  alter column fundraiser_id drop not null;

create index activities_user_started_idx on public.activities (user_id, started_on);

drop policy activities_owner_select on public.activities;
drop policy activities_owner_insert on public.activities;
drop policy activities_owner_delete on public.activities;

create policy activities_owner_select on public.activities
  for select to authenticated
  using (public.is_staff() or user_id = (select auth.uid()));

-- Manual entries only; Strava rows arrive through the service role. A
-- fundraiser_id, when set, must be the runner's own page.
create policy activities_owner_insert on public.activities
  for insert to authenticated
  with check (
    source = 'manual'
    and user_id = (select auth.uid())
    and (fundraiser_id is null or exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id and f.user_id = (select auth.uid())))
  );

create policy activities_owner_delete on public.activities
  for delete to authenticated
  using (source = 'manual' and user_id = (select auth.uid()));

-- 3 ─ Strava connections --------------------------------------------------------
create table public.strava_connections (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  athlete_id    bigint not null unique,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  scope         text not null default '',
  share_public  boolean not null default false,
  connected_at  timestamptz not null default now(),
  last_sync_at  timestamptz
);

alter table public.strava_connections enable row level security;

-- Owners see their own connection minus the tokens, and may toggle consent.
grant select (user_id, athlete_id, scope, share_public, connected_at, last_sync_at)
  on public.strava_connections to authenticated;
grant update (share_public) on public.strava_connections to authenticated;

create policy strava_connections_owner_select on public.strava_connections
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy strava_connections_owner_update on public.strava_connections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Challenge standings: pages only, and Strava rows only with consent.
create or replace view public.v_activity_totals
  with (security_invoker = off, security_barrier = on) as
select
  f.id,
  f.slug,
  f.title,
  f.event_id,
  count(a.id)                          as activity_count,
  coalesce(sum(a.distance_m), 0)       as distance_m,
  coalesce(sum(a.moving_time_s), 0)    as moving_time_s,
  coalesce(sum(a.elevation_m), 0)      as elevation_m,
  max(a.started_at)                    as last_activity_at
from public.fundraisers f
left join public.activities a
  on a.fundraiser_id = f.id
 and (a.source = 'manual' or exists (
       select 1 from public.strava_connections sc
       where sc.user_id = a.user_id and sc.share_public))
where f.status = 'active'
group by f.id;

-- 4 ─ partner perks --------------------------------------------------------------
create table public.perk_challenges (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  partner_name       text not null,
  title              text not null,
  description        text,
  reward_label       text not null,
  sport_types        text[] not null default array['Run', 'TrailRun', 'VirtualRun'],
  min_distance_m     integer not null default 5000 check (min_distance_m >= 0),
  max_moving_time_s  integer check (max_moving_time_s > 0),
  min_elevation_m    integer not null default 0 check (min_elevation_m >= 0),
  allow_manual       boolean not null default false,
  per_user_daily_cap integer not null default 1 check (per_user_daily_cap > 0),
  daily_cap          integer check (daily_cap > 0),
  valid_days         integer not null default 7 check (valid_days > 0),
  starts_at          timestamptz,
  ends_at            timestamptz,
  is_active          boolean not null default false,
  redeem_pin_hash    text,
  created_at         timestamptz not null default now()
);

alter table public.perk_challenges enable row level security;

grant select, insert, update on public.perk_challenges to authenticated;

create policy perk_challenges_staff_select on public.perk_challenges
  for select to authenticated using (public.is_staff());
create policy perk_challenges_staff_insert on public.perk_challenges
  for insert to authenticated with check (public.is_staff());
create policy perk_challenges_staff_update on public.perk_challenges
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create table public.perk_awards (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.perk_challenges (id),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  activity_id   uuid references public.activities (id) on delete set null,
  awarded_on    date not null,
  code          text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  status        text not null default 'issued'
                check (status in ('issued', 'redeemed', 'revoked', 'expired')),
  issued_at     timestamptz not null default now(),
  redeemed_at   timestamptz,
  expires_at    timestamptz not null,
  unique (challenge_id, activity_id)
);

alter table public.perk_awards enable row level security;

create index perk_awards_challenge_day_idx on public.perk_awards (challenge_id, awarded_on);
create index perk_awards_user_idx on public.perk_awards (user_id);

grant select on public.perk_awards to authenticated;

create policy perk_awards_owner_select on public.perk_awards
  for select to authenticated
  using (public.is_staff() or user_id = (select auth.uid()));

-- PIN-guessing throttle; definer-function use only.
create table public.perk_redeem_attempts (
  code         text not null,
  attempted_at timestamptz not null default now()
);
alter table public.perk_redeem_attempts enable row level security;
create index perk_redeem_attempts_idx on public.perk_redeem_attempts (code, attempted_at);

-- Public views: the challenge catalogue and one award by its code. The
-- award view shows the award (ours) — never the underlying Strava activity.
create view public.v_public_perk_challenges
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
    where a.challenge_id = c.id and a.status = 'redeemed') as redeemed_total
from public.perk_challenges c
where c.is_active;

create view public.v_public_perk_award
  with (security_invoker = off, security_barrier = on) as
select
  a.code,
  case when a.status = 'issued' and a.expires_at < now() then 'expired'
       else a.status end as status,
  a.awarded_on,
  a.expires_at,
  a.redeemed_at,
  c.slug as challenge_slug,
  c.title as challenge_title,
  c.partner_name,
  c.reward_label,
  p.full_name as participant_name
from public.perk_awards a
join public.perk_challenges c on c.id = a.challenge_id
left join public.profiles p on p.id = a.user_id;

grant select on public.v_public_perk_challenges, public.v_public_perk_award
  to anon, authenticated;

-- Staff set the partner's PIN; only the bcrypt hash is stored.
create or replace function public.set_perk_challenge_pin(p_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'set_perk_challenge_pin: staff only' using errcode = '42501';
  end if;
  if p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'set_perk_challenge_pin: PIN must be 4-8 digits';
  end if;
  update public.perk_challenges
     set redeem_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
   where id = p_id;
end;
$$;
revoke all on function public.set_perk_challenge_pin(uuid, text) from public;
grant execute on function public.set_perk_challenge_pin(uuid, text) to authenticated;

-- Award codes: 8 chars from an unambiguous alphabet (no 0/O/1/I).
create or replace function public.perk_award_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32))::int + 1, 1), '')
  from generate_series(1, 8);
$$;
revoke all on function public.perk_award_code() from public;

/**
 * Evaluate one activity against every active challenge and mint awards.
 * Service role only (called after a Strava sync). Challenge rows are locked
 * so the per-day caps cannot be exceeded by concurrent webhooks. Returns
 * the number of awards created.
 */
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
    if v_act.source <> 'strava' and not v_ch.allow_manual then continue; end if;
    if v_act.sport_type is null or not (v_act.sport_type = any (v_ch.sport_types)) then
      continue;
    end if;
    if v_act.distance_m < v_ch.min_distance_m then continue; end if;
    if v_ch.max_moving_time_s is not null
       and (v_act.moving_time_s <= 0 or v_act.moving_time_s > v_ch.max_moving_time_s) then
      continue;
    end if;
    if v_act.elevation_m < v_ch.min_elevation_m then continue; end if;
    if exists (select 1 from public.perk_awards a
                where a.challenge_id = v_ch.id and a.activity_id = v_act.id) then
      continue;
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

/**
 * Partner-side redemption: anyone holding the code (scanned from the
 * athlete's phone) plus the partner's PIN. Five wrong attempts per code in
 * fifteen minutes lock that code for the window. Returns one of:
 * ok · not_found · bad_pin · locked · already_redeemed · revoked · expired.
 */
create or replace function public.redeem_perk_award(p_code text, p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code   text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_award  public.perk_awards%rowtype;
  v_hash   text;
  v_fails  integer;
begin
  delete from public.perk_redeem_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_fails from public.perk_redeem_attempts
   where code = v_code and attempted_at > now() - interval '15 minutes';
  if v_fails >= 5 then
    return 'locked';
  end if;

  select a.* into v_award from public.perk_awards a where a.code = v_code;
  if not found then
    insert into public.perk_redeem_attempts (code) values (v_code);
    return 'not_found';
  end if;

  select c.redeem_pin_hash into v_hash from public.perk_challenges c where c.id = v_award.challenge_id;
  if v_hash is null or extensions.crypt(coalesce(p_pin, ''), v_hash) <> v_hash then
    insert into public.perk_redeem_attempts (code) values (v_code);
    return 'bad_pin';
  end if;

  if v_award.status = 'redeemed' then return 'already_redeemed'; end if;
  if v_award.status = 'revoked' then return 'revoked'; end if;
  if v_award.status = 'expired' or v_award.expires_at < now() then return 'expired'; end if;

  update public.perk_awards
     set status = 'redeemed', redeemed_at = now()
   where id = v_award.id;
  return 'ok';
end;
$$;
revoke all on function public.redeem_perk_award(text, text) from public;
grant execute on function public.redeem_perk_award(text, text) to anon, authenticated;
