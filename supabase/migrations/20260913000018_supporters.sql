-- ============================================================================
-- Santamore — Supporters: one record for every organisation that backs us
-- Apply AFTER 20260911000017_events_v2.sql. Re-runnable.
--
-- A sponsor (money or in kind, tied to a cause or an event) and a partner
-- (an offer on a challenge) were two spellings of the same cafe. Now both
-- point at a supporter; the sponsors table becomes the sponsorship
-- relationship, perk_challenges the offer. Standing offers with no event
-- become ongoing challenge events, so every offer belongs to a challenge.
-- ============================================================================

create table if not exists public.supporters (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  logo_path     text,
  website       text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.supporters enable row level security;
grant select, insert, update on public.supporters to authenticated;
drop policy if exists supporters_staff_all on public.supporters;
create policy supporters_staff_all on public.supporters
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

alter table public.sponsors        add column if not exists supporter_id uuid references public.supporters (id);
alter table public.perk_challenges add column if not exists supporter_id uuid references public.supporters (id);

-- Backfill: one supporter per distinct name across sponsors and offers.
do $$
declare
  r record;
  v_slug text;
  v_id uuid;
begin
  for r in
    select name, max(logo_path) as logo_path, max(website) as website
      from (
        select name, logo_path, website from public.sponsors where supporter_id is null
        union all
        select partner_name, null, partner_url from public.perk_challenges where supporter_id is null
      ) x
     where name is not null and btrim(name) <> ''
     group by name
  loop
    select id into v_id from public.supporters where lower(name) = lower(r.name);
    if v_id is null then
      v_slug := btrim(regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g'), '-');
      if v_slug = '' then v_slug := 'podrska'; end if;
      if exists (select 1 from public.supporters where slug = v_slug) then
        v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
      end if;
      insert into public.supporters (name, slug, logo_path, website)
        values (r.name, v_slug, r.logo_path, r.website)
        returning id into v_id;
    end if;
    update public.sponsors set supporter_id = v_id where supporter_id is null and lower(name) = lower(r.name);
    update public.perk_challenges set supporter_id = v_id where supporter_id is null and lower(partner_name) = lower(r.name);
  end loop;
end $$;

-- Standing offers become ongoing challenge events (named after the offer,
-- in the first chapter, published iff the offer is active).
do $$
declare
  r record;
  v_chapter uuid;
  v_slug text;
  v_event uuid;
begin
  select id into v_chapter from public.chapters order by name limit 1;
  if v_chapter is null then return; end if;
  for r in select * from public.perk_challenges where event_id is null loop
    v_slug := r.slug;
    if exists (select 1 from public.events where slug = v_slug) then
      v_slug := v_slug || '-izazov';
    end if;
    if exists (select 1 from public.events where slug = v_slug) then
      v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    end if;
    insert into public.events (name, slug, kind, challenge_metric, chapter_id, starts_at, ends_at, description, is_published)
      values (r.title, v_slug, 'challenge', 'distance_m', v_chapter,
              coalesce(r.starts_at, r.created_at), r.ends_at, r.description, r.is_active)
      returning id into v_event;
    update public.perk_challenges set event_id = v_event where id = r.id;
  end loop;
end $$;

create or replace view public.v_public_supporters
  with (security_invoker = off, security_barrier = on) as
select s.id, s.name, s.slug, s.logo_path, s.website
from public.supporters s
where s.is_active;
grant select on public.v_public_supporters to anon, authenticated;

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
where c.is_active;
grant select on public.v_public_perk_challenges to anon, authenticated;
