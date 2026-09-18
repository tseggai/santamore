-- ============================================================================
-- Santamore — the team: officers, staff, board, committee and volunteers
-- Apply AFTER 20260918000041_santamore25_event_beneficiaries.sql. Re-runnable.
--
-- A person on the team is a record of their own, whether or not they have
-- an account: name, role, a few words, a photo, private contact details,
-- the years they were active, and an optional link to their account for
-- the access level. /o-nama shows the public ones; a year's volunteers
-- come from the volunteers active that year.
-- ============================================================================

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'staff'
              check (kind in ('officer', 'staff', 'board', 'committee', 'volunteer')),
  full_name   text not null,
  title       text,
  quote       text,
  photo_path  text,
  email       text,
  phone       text,
  notes       text,
  years       integer[] not null default '{}',
  is_public   boolean not null default false,
  sort_order  integer not null default 0,
  user_id     uuid unique references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.team_members enable row level security;
grant select, insert, update, delete on public.team_members to authenticated;
drop policy if exists team_members_staff_all on public.team_members;
create policy team_members_staff_all on public.team_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Members already marked "on the team" become team records linked to their account.
insert into public.team_members (kind, full_name, title, quote, photo_path, is_public, sort_order, user_id)
select 'staff', p.full_name, p.title, p.quote, p.photo_path, true, p.team_order, p.id
  from public.profiles p
 where p.is_team and p.full_name is not null
   and not exists (select 1 from public.team_members t where t.user_id = p.id);

drop view if exists public.v_public_team;
create view public.v_public_team
  with (security_invoker = off, security_barrier = on) as
select t.id, t.kind, t.full_name, t.title, t.quote, t.photo_path, t.years, t.sort_order
from public.team_members t
where t.is_public;
grant select on public.v_public_team to anon, authenticated;
