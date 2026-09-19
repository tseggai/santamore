-- ============================================================================
-- Santamore — a cause added by mistake can be deleted
-- Apply AFTER 20260919000047_is_admin.sql. Re-runnable.
--
-- Like delete_event: a wrong or test cause goes, while money and the
-- pages of members never do. A cause with donations, hand-overs,
-- fundraising pages or teams is refused (unpublish it instead). Events,
-- sponsorships, photos, proposals, beneficiaries and year reports lose the
-- link but stay. Admin only.
-- ============================================================================

create or replace function public.delete_campaign(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select title into v_title from public.campaigns where id = p_id;
  if v_title is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select count(*) into v_count from public.donations where campaign_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.disbursements where campaign_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'handovers', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.fundraisers where campaign_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'pages', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.teams where campaign_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'teams', 'count', v_count, 'name', v_title);
  end if;

  update public.events          set campaign_id = null where campaign_id = p_id;
  update public.sponsors        set campaign_id = null where campaign_id = p_id;
  update public.gallery_items   set campaign_id = null where campaign_id = p_id;
  update public.cause_proposals set campaign_id = null where campaign_id = p_id;
  update public.beneficiaries   set campaign_id = null where campaign_id = p_id;
  update public.year_reports    set campaign_id = null where campaign_id = p_id;
  delete from public.campaigns where id = p_id;

  return jsonb_build_object('ok', true, 'name', v_title);
end;
$$;

revoke all on function public.delete_campaign(uuid) from public;
grant execute on function public.delete_campaign(uuid) to authenticated;

notify pgrst, 'reload schema';
