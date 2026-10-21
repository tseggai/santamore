-- ============================================================================
-- Santamore — the Executive Director access level (docs/ROLES.md)
-- Apply AFTER 20261019000081_handover_documents_and_notes.sql. Re-runnable.
--
-- Roles on a profile: member, accounting, chapter_lead (Editor), director,
-- admin. director is staff for every policy (is_staff), opens the whole
-- console like an admin except what stays admin-only (is_admin: roles,
-- deletes, the switches), and with admin forms the leadership that reads
-- the pay and staffing policy (is_leadership). The Executive Director is
-- the person authorised to represent the association; the super-admin
-- keeps the keys.
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('member', 'accounting', 'chapter_lead', 'director', 'admin'));

alter table public.team_members drop constraint if exists team_members_access_check;
alter table public.team_members
  add constraint team_members_access_check check (access in ('member', 'accounting', 'chapter_lead', 'director', 'admin'));

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'director', 'chapter_lead', 'accounting')
  );
$$;

-- The Executive Director and the administrators: who may read documents
-- that carry pay figures. Enforced in the app for the documents (they are
-- shipped with the code, not stored), and available to policies that need it.
create or replace function public.is_leadership()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'director')
  );
$$;

grant execute on function public.is_leadership() to authenticated;

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
  if p_role not in ('member', 'accounting', 'chapter_lead', 'director', 'admin') then
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

notify pgrst, 'reload schema';
