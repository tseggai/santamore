-- ============================================================================
-- Santamore — deleting a team is blocked by money, not by unpaid pledges
-- Apply AFTER 20260919000050_captain_deletes_team.sql. Re-runnable.
--
-- delete_team counted every donation row, so a team whose pages only held
-- pending SEPA pledges or declined attempts was refused while the page
-- showed €0. Only approved (and refunded) gifts are money in the ledger;
-- only those keep a team. Pledges stay on their page either way.
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
   where f.team_id = p_id and d.status in ('approved', 'refunded');
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_name);
  end if;

  update public.fundraisers set team_id = null where team_id = p_id;
  delete from public.teams where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

notify pgrst, 'reload schema';
