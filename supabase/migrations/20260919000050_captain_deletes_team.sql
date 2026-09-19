-- ============================================================================
-- Santamore — a captain deletes the team they created
-- Apply AFTER 20260919000049_delete_team_page.sql. Re-runnable.
--
-- Teams are made by runners, so their captain may delete them from the
-- dashboard, on the same terms as an admin: the pages stay and leave the
-- team, every euro stays, and a team whose pages took donations is
-- refused. Admins keep the right for teams they do not captain.
-- ============================================================================

create or replace function public.delete_team(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text;
  v_captain uuid;
  v_count   bigint;
begin
  select name, captain_id into v_name, v_captain from public.teams where id = p_id;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if not (public.is_admin() or v_captain = (select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into v_count
    from public.donations d
    join public.fundraisers f on f.id = d.fundraiser_id
   where f.team_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_name);
  end if;

  update public.fundraisers set team_id = null where team_id = p_id;
  delete from public.teams where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

notify pgrst, 'reload schema';
