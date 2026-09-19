-- ============================================================================
-- Santamore — fundraising teams and pages added by mistake can be deleted
-- Apply AFTER 20260919000048_delete_campaign.sql. Re-runnable.
--
-- A team is a grouping of pages; deleting one unlinks its pages and keeps
-- every euro they raised. A team whose pages already took donations is
-- refused, so the leaderboard's history stays true. A page is refused
-- once a donation names it; otherwise its ask list and activities go
-- with it. Both admin only.
-- ============================================================================

create or replace function public.delete_team(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text;
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select name into v_name from public.teams where id = p_id;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
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

create or replace function public.delete_fundraiser(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_photo text;
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select title, photo_path into v_title, v_photo from public.fundraisers where id = p_id;
  if v_title is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select count(*) into v_count from public.donations where fundraiser_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_title);
  end if;

  delete from public.ask_list_items where fundraiser_id = p_id;
  delete from public.activities where fundraiser_id = p_id;
  delete from public.fundraisers where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_title, 'photo_path', v_photo);
end;
$$;

revoke all on function public.delete_team(uuid) from public;
revoke all on function public.delete_fundraiser(uuid) from public;
grant execute on function public.delete_team(uuid) to authenticated;
grant execute on function public.delete_fundraiser(uuid) to authenticated;

notify pgrst, 'reload schema';
