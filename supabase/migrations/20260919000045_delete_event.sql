-- ============================================================================
-- Santamore — an event added by mistake can be deleted
-- Apply AFTER 20260919000044_campaign_disbursed.sql. Re-runnable.
--
-- Deletion is for a wrong or test event, and only while nothing of value
-- hangs off it: an event with fundraising pages, teams, donations or paid
-- registrations is refused (unpublish it instead), because money and the
-- pages of members are never destroyed. Unpaid registrations and RSVPs go
-- with the event; photos, sponsorships and challenge offers lose the link
-- but stay. Admin only.
-- ============================================================================

create or replace function public.delete_event(p_id uuid)
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

  select name into v_name from public.events where id = p_id;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select count(*) into v_count from public.fundraisers where event_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'pages', 'count', v_count, 'name', v_name);
  end if;
  select count(*) into v_count from public.teams where event_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'teams', 'count', v_count, 'name', v_name);
  end if;
  select count(*) into v_count from public.donations where event_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_name);
  end if;
  select count(*) into v_count from public.registrations
   where event_id = p_id and amount_paid_cents > 0;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'paid', 'count', v_count, 'name', v_name);
  end if;

  delete from public.registrations where event_id = p_id;
  delete from public.event_rsvps where event_id = p_id;
  update public.perk_challenges set event_id = null where event_id = p_id;
  update public.sponsors set event_id = null where event_id = p_id;
  update public.gallery_items set event_id = null where event_id = p_id;
  delete from public.events where id = p_id;

  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

revoke all on function public.delete_event(uuid) from public;
grant execute on function public.delete_event(uuid) to authenticated;

-- PostgREST learns about the new function at once (see 0042).
notify pgrst, 'reload schema';
