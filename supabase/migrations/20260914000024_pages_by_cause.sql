-- 0024 · A fundraising page (and a team) belongs to a cause, not an event.
-- Several events can raise for one cause; a runner has one page, one link
-- and one total per cause. The event stays on the row as provenance only.
-- Re-runnable.

-- 1 ─ columns and keys ---------------------------------------------------------
alter table public.fundraisers
  add column if not exists campaign_id uuid references public.campaigns (id);
update public.fundraisers f
   set campaign_id = e.campaign_id
  from public.events e
 where e.id = f.event_id and f.campaign_id is null;
alter table public.fundraisers alter column event_id drop not null;
drop index if exists public.fundraisers_user_event_key;

-- One page per member per cause. A member who already holds pages on
-- several events of one cause has to be resolved first: approved donations
-- are immutable, so this migration never moves them between pages. Run
-- supabase/duplicate_pages.sql to see who is affected; demo rows go away
-- with Admin › Demo › Purge, after which this migration applies cleanly.
do $$
declare
  n integer;
begin
  select count(*) into n
    from (select 1 from public.fundraisers
           where campaign_id is not null
           group by user_id, campaign_id having count(*) > 1) d;
  if n > 0 then
    raise exception
      'fundraisers: % member/cause pairs hold more than one page — see supabase/duplicate_pages.sql', n;
  end if;
end $$;

create unique index if not exists fundraisers_user_campaign_key
  on public.fundraisers (user_id, campaign_id);
create index if not exists fundraisers_campaign_idx on public.fundraisers (campaign_id);

alter table public.teams
  add column if not exists campaign_id uuid references public.campaigns (id);
update public.teams t
   set campaign_id = e.campaign_id
  from public.events e
 where e.id = t.event_id and t.campaign_id is null;
alter table public.teams alter column event_id drop not null;

-- Two teams on different events of one cause may share a slug; the newer
-- ones get a short suffix so both links keep working under the cause.
update public.teams t
   set slug = t.slug || '-' || left(replace(t.id::text, '-', ''), 4)
  from (
    select id,
           row_number() over (partition by campaign_id, slug order by created_at, id) as n
      from public.teams
     where campaign_id is not null
  ) r
 where r.id = t.id and r.n > 1;

create unique index if not exists teams_campaign_slug_key on public.teams (campaign_id, slug);
create index if not exists teams_campaign_idx on public.teams (campaign_id);

-- 2 ─ a team and its members share a cause --------------------------------------
create or replace function public.enforce_fundraiser_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' then
    if new.photo_path is null
       or coalesce(new.goal_cents, 0) <= 0
       or length(btrim(coalesce(new.story, ''))) < 80 then
      raise exception 'fundraisers: a page cannot be active without a photo, a goal and a story (brief §10)';
    end if;
  end if;
  if new.campaign_id is null then
    raise exception 'fundraisers: a page raises for a cause';
  end if;
  if new.team_id is not null and not exists (
    select 1 from public.teams t
    where t.id = new.team_id and t.campaign_id = new.campaign_id
  ) then
    raise exception 'fundraisers: team % belongs to a different cause', new.team_id;
  end if;
  return new;
end;
$$;

-- 3 ─ totals and boards, per cause ---------------------------------------------
drop view if exists public.v_leaderboard_teams;
drop view if exists public.v_leaderboard;
drop view if exists public.v_team_totals;
drop view if exists public.v_fundraiser_totals;

create view public.v_fundraiser_totals
  with (security_invoker = off, security_barrier = on) as
select
  f.id,
  f.slug,
  f.title,
  f.story,
  f.photo_path,
  f.goal_cents,
  f.event_id,
  f.team_id,
  coalesce(sum(d.net_cents) filter (where d.status in ('approved', 'refunded')), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              where dd.fundraiser_id = f.id
                and dd.status in ('approved', 'refunded')), 0) as raised_cents,
  count(distinct coalesce(lower(d.donor_email), d.id::text))
    filter (where d.status in ('approved', 'refunded')) as donor_count,
  f.payment_reference,
  f.created_at,
  e.slug as event_slug,
  e.name as event_name,
  c.slug as campaign_slug,
  t.slug as team_slug,
  t.name as team_name,
  f.campaign_id,
  c.title as campaign_title
from public.fundraisers f
left join public.events e on e.id = f.event_id
left join public.campaigns c on c.id = f.campaign_id and c.is_public
left join public.teams t on t.id = f.team_id
left join public.donations d on d.fundraiser_id = f.id
where f.status = 'active'
group by f.id, e.id, c.id, t.id;

create view public.v_leaderboard
  with (security_invoker = off, security_barrier = on) as
select
  ft.id,
  ft.slug,
  ft.title,
  ft.photo_path,
  ft.event_id,
  ft.team_id,
  ft.raised_cents,
  ft.donor_count,
  rank() over (partition by ft.campaign_id order by ft.raised_cents desc) as rank,
  ft.campaign_id
from public.v_fundraiser_totals ft;

create view public.v_team_totals
  with (security_invoker = off, security_barrier = on) as
select
  t.id,
  t.slug,
  t.name,
  t.goal_cents,
  t.event_id,
  e.slug as event_slug,
  e.name as event_name,
  count(ft.id) as member_count,
  coalesce(sum(ft.raised_cents), 0) as raised_cents,
  coalesce(sum(ft.donor_count), 0) as donor_count,
  t.description,
  t.photo_path,
  t.campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title
from public.teams t
left join public.events e on e.id = t.event_id
left join public.campaigns c on c.id = t.campaign_id and c.is_public
left join public.v_fundraiser_totals ft on ft.team_id = t.id
group by t.id, e.id, c.id;

create view public.v_leaderboard_teams
  with (security_invoker = off, security_barrier = on) as
select
  tt.*,
  rank() over (partition by tt.campaign_id order by tt.raised_cents desc) as rank
from public.v_team_totals tt
where tt.member_count > 0;

grant select on public.v_fundraiser_totals, public.v_leaderboard,
                public.v_team_totals, public.v_leaderboard_teams
  to anon, authenticated;

-- 4 ─ challenge standings: the cause's pages, activities inside the event window
create or replace view public.v_challenge_standings
  with (security_invoker = off, security_barrier = on) as
select
  e.id as event_id,
  f.id,
  f.slug,
  f.title,
  f.photo_path,
  count(a.id)                       as activity_count,
  coalesce(sum(a.distance_m), 0)    as distance_m,
  coalesce(sum(a.moving_time_s), 0) as moving_time_s,
  coalesce(sum(a.elevation_m), 0)   as elevation_m,
  max(a.started_at)                 as last_activity_at
from public.events e
join public.fundraisers f on f.campaign_id = e.campaign_id and f.status = 'active'
left join public.activities a
  on a.fundraiser_id = f.id
 and a.started_at >= coalesce(e.starts_at, a.started_at)
 and a.started_at <= coalesce(e.ends_at, e.starts_at, a.started_at) + interval '1 day'
 and (a.source = 'manual' or exists (
       select 1 from public.strava_connections sc
       where sc.user_id = a.user_id and sc.share_public))
where e.kind = 'challenge' and e.is_published
group by e.id, f.id;

grant select on public.v_challenge_standings to anon, authenticated;

-- 5 ─ the cause's money counts its own pages directly ---------------------------
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
  coalesce((select sum(d.net_cents)
            from public.donations d
            left join public.fundraisers f on f.id = d.fundraiser_id
            where d.status in ('approved', 'refunded')
              and (d.campaign_id = c.id or f.campaign_id = c.id)), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              left join public.fundraisers f2 on f2.id = dd.fundraiser_id
              where dd.status in ('approved', 'refunded')
                and (dd.campaign_id = c.id or f2.campaign_id = c.id)), 0)
    as raised_cents,
  (select count(distinct coalesce(lower(d.donor_email), d.id::text))
   from public.donations d
   left join public.fundraisers f on f.id = d.fundraiser_id
   where d.status in ('approved', 'refunded')
     and (d.campaign_id = c.id or f.campaign_id = c.id)) as donor_count,
  c.cover_path,
  c.id
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public;

grant select on public.v_public_campaigns to anon, authenticated;

create or replace view public.v_public_ledger_in
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.net_cents as amount_cents,
  case when d.is_anonymous then null
       else coalesce(d.display_name, d.donor_name) end as display_name,
  case when f.status = 'active' then f.slug  end as fundraiser_slug,
  case when f.status = 'active' then f.title end as fundraiser_title,
  case when c.is_public then c.slug  end as campaign_slug,
  case when c.is_public then c.title end as campaign_title,
  ch.slug as chapter_slug,
  d.rail,
  coalesce(case when c.is_public then c.slug end,
           case when fc.is_public then fc.slug end) as cause_slug
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
left join public.campaigns fc on fc.id = f.campaign_id
left join public.campaigns c on c.id = d.campaign_id
left join public.chapters ch on ch.id = d.chapter_id
where d.status in ('approved', 'refunded');

grant select on public.v_public_ledger_in to anon, authenticated;

-- 6 ─ events name their cause, so pages can say what they raise for --------------
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
  c.title as campaign_title
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published;

grant select on public.v_public_events to anon, authenticated;
