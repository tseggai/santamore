-- ============================================================================
-- Santamore — team profiles and access levels, editable pages
-- Apply AFTER 20260918000039_sponsor_fund.sql. Re-runnable.
--
-- 1. A member's public profile (title, own words, photo) and whether they
--    appear in the team section of /o-nama; an admin sets these and the
--    access level from the Members screen, through one definer RPC so a
--    member can never widen their own role.
-- 2. The editorial pages (/o-nama, /kako-radimo) are editable: a row per
--    page and locale holds the fields staff changed; the site falls back
--    to the shipped text for anything left empty.
-- ============================================================================

-- 1 ─ profiles -----------------------------------------------------------------
alter table public.profiles add column if not exists title      text;
alter table public.profiles add column if not exists quote      text;
alter table public.profiles add column if not exists photo_path text;
alter table public.profiles add column if not exists is_team    boolean not null default false;
alter table public.profiles add column if not exists team_order integer not null default 0;

create or replace function public.set_member_profile(
  p_id uuid,
  p_full_name text,
  p_title text,
  p_quote text,
  p_photo_path text,
  p_is_team boolean,
  p_team_order integer,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_role not in ('member', 'chapter_lead', 'admin') then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  -- An admin cannot demote themselves: someone must keep the keys.
  if p_id = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot change own role' using errcode = '42501';
  end if;
  update public.profiles
     set full_name  = nullif(trim(p_full_name), ''),
         title      = nullif(trim(p_title), ''),
         quote      = nullif(trim(p_quote), ''),
         photo_path = nullif(trim(p_photo_path), ''),
         is_team    = coalesce(p_is_team, false),
         team_order = coalesce(p_team_order, 0),
         role       = p_role
   where id = p_id;
  if not found then
    raise exception 'no such member' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.set_member_profile(uuid, text, text, text, text, boolean, integer, text) from public;
grant execute on function public.set_member_profile(uuid, text, text, text, text, boolean, integer, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-photos', 'team-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists team_photos_staff_insert on storage.objects;
create policy team_photos_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'team-photos' and public.is_staff());
drop policy if exists team_photos_staff_update on storage.objects;
create policy team_photos_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'team-photos' and public.is_staff())
  with check (bucket_id = 'team-photos' and public.is_staff());
drop policy if exists team_photos_staff_delete on storage.objects;
create policy team_photos_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'team-photos' and public.is_staff());

-- The team section of /o-nama: only what a member agreed to publish.
create or replace view public.v_public_team
  with (security_invoker = off, security_barrier = on) as
select p.id, p.full_name, p.title, p.quote, p.photo_path, p.team_order
from public.profiles p
where p.is_team and p.full_name is not null;
grant select on public.v_public_team to anon, authenticated;

create or replace view public.v_staff_members
  with (security_invoker = off, security_barrier = on) as
select
  p.id,
  p.full_name,
  p.role,
  u.email,
  u.created_at as joined_at,
  (select count(*) from public.fundraisers f where f.user_id = p.id) as pages,
  (select count(*) from public.fundraisers f where f.user_id = p.id and f.status = 'active') as live_pages,
  (select coalesce(sum(d.amount_cents), 0)
     from public.donations d join public.fundraisers f on f.id = d.fundraiser_id
    where f.user_id = p.id and d.status = 'approved') as raised_cents,
  (select count(*) from public.teams t where t.captain_id = p.id) as teams,
  (select count(*) from public.registrations r where r.user_id = p.id and r.status <> 'cancelled') as registrations,
  (select count(*) from public.event_rsvps r where r.user_id = p.id) as rsvps,
  exists (select 1 from public.strava_connections s where s.user_id = p.id) as strava,
  (select s.last_sync_at from public.strava_connections s where s.user_id = p.id) as strava_last_sync,
  (select count(*) from public.activities a
    where a.user_id = p.id and a.source = 'strava'
      and a.started_on >= (now() at time zone 'Europe/Podgorica')::date - 29) as activities_30d,
  (select count(*) from public.perk_awards w where w.user_id = p.id and w.status <> 'revoked') as awards,
  (select count(*) from public.donations d
    where d.status = 'approved' and d.donor_email is not null
      and lower(d.donor_email) = lower(u.email)) as donations,
  (select coalesce(sum(d.amount_cents), 0) from public.donations d
    where d.status = 'approved' and d.donor_email is not null
      and lower(d.donor_email) = lower(u.email)) as given_cents,
  (select s.athlete_avatar_url from public.strava_connections s where s.user_id = p.id) as avatar_url,
  p.title,
  p.quote,
  p.photo_path,
  p.is_team,
  p.team_order
from public.profiles p
left join auth.users u on u.id = p.id
where public.is_staff();

grant select on public.v_staff_members to authenticated;

-- 2 ─ editable pages -----------------------------------------------------------
create table if not exists public.site_pages (
  page        text not null check (page in ('about', 'how')),
  locale      text not null check (locale in ('me', 'en', 'ru')),
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id),
  primary key (page, locale)
);
alter table public.site_pages enable row level security;
grant select, insert, update, delete on public.site_pages to authenticated;
drop policy if exists site_pages_staff_all on public.site_pages;
create policy site_pages_staff_all on public.site_pages
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace view public.v_public_site_pages
  with (security_invoker = off, security_barrier = on) as
select page, locale, content, updated_at from public.site_pages;
grant select on public.v_public_site_pages to anon, authenticated;
