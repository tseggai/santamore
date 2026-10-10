-- 0069 — set_member_access(): the Accounts panel sets a name and an
-- access level, nothing else. It used to call set_member_profile(), which
-- also rewrote the legacy profile columns (title, quote, photo, is_team)
-- with blanks — harmless since the team record moved to team_members, but
-- wrong in principle. Same guards: admin only, an admin cannot demote
-- themselves.

create or replace function public.set_member_access(
  p_id uuid,
  p_full_name text,
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
  if p_role not in ('member', 'accounting', 'chapter_lead', 'admin') then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  if p_id = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot change own role' using errcode = '42501';
  end if;
  update public.profiles
     set full_name = nullif(trim(p_full_name), ''),
         role      = p_role
   where id = p_id;
  if not found then
    raise exception 'no such member' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_member_access(uuid, text, text) from public, anon;
grant execute on function public.set_member_access(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
