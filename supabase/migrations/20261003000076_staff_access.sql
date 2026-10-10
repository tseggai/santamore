-- 0076 — access lives on the Staff record (docs/ROLES.md).
--
-- An admin grants access to a person, not to a login. The record carries
-- the level (`access`); it reaches the account the moment one is linked,
-- or when the person signs up with the record's email. Only an admin may
-- set a level above None or move the email/account of a record that has
-- one — otherwise an editor could route an admin record to themselves.

alter table public.team_members
  add column if not exists access text not null default 'member'
  check (access in ('member', 'accounting', 'chapter_lead', 'admin'));

-- Backfill: linked records take the account's level; the rest the level
-- their role usually comes with.
update public.team_members t set access = p.role
  from public.profiles p where p.id = t.user_id;
update public.team_members set access = 'chapter_lead'
  where user_id is null and kind in ('officer', 'staff', 'chapter_lead');

-- Guard: who may change what, and no admin demoting themselves.
create or replace function public.team_members_access_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  claiming boolean := coalesce(current_setting('santamore.claim', true), '') = '1';
  involves_access boolean;
begin
  if claiming then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.access <> 'member' and not public.is_admin() then
      raise exception 'admin only' using errcode = '42501';
    end if;
    return new;
  end if;
  involves_access := new.access <> 'member' or old.access <> 'member';
  if not public.is_admin() and (
       new.access is distinct from old.access
       or (involves_access and (new.email is distinct from old.email or new.user_id is distinct from old.user_id))
     ) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if new.user_id is not null and new.user_id = auth.uid() and new.access <> 'admin' then
    raise exception 'cannot change own role' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists team_members_access_guard on public.team_members;
create trigger team_members_access_guard
  before insert or update on public.team_members
  for each row execute function public.team_members_access_guard();

-- Apply: a linked account takes the record's level whenever the record
-- gains an account or changes level (the guard above already said who may).
create or replace function public.team_members_apply_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null
     and (tg_op = 'INSERT' or new.user_id is distinct from old.user_id or new.access is distinct from old.access) then
    update public.profiles set role = new.access where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists team_members_apply_access on public.team_members;
create trigger team_members_apply_access
  after insert or update on public.team_members
  for each row execute function public.team_members_apply_access();

-- Sign-up: a staff record waiting for this email takes the account and
-- hands over its level. Never blocks the sign-up itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access text;
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  begin
    perform set_config('santamore.claim', '1', true);
    update public.team_members t
       set user_id = new.id, updated_at = now()
     where t.id = (select id from public.team_members
                    where user_id is null and email is not null and lower(email) = lower(new.email)
                    order by sort_order, full_name limit 1)
    returning t.access into v_access;
    if v_access is not null then
      update public.profiles set role = v_access where id = new.id;
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

notify pgrst, 'reload schema';
