-- ============================================================================
-- Santamore — pages and teams hang off a cause, so an event may go
-- Apply AFTER 20260919000051_delete_team_counts_money.sql. Re-runnable.
--
-- Since 0024 a fundraising page and a team belong to a cause; event_id is
-- only the event that was next when they were made. delete_event still
-- refused an event because of them, while the Events list counted the
-- cause's pages. Now event_id may be empty: deleting an event leaves its
-- pages and teams on their cause. Money (donations, paid registrations)
-- still keeps an event.
-- ============================================================================

alter table public.fundraisers alter column event_id drop not null;
alter table public.teams       alter column event_id drop not null;

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

  select count(*) into v_count from public.donations where event_id = p_id;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_name);
  end if;
  select count(*) into v_count from public.registrations
   where event_id = p_id and amount_paid_cents > 0;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'paid', 'count', v_count, 'name', v_name);
  end if;

  update public.fundraisers     set event_id = null where event_id = p_id;
  update public.teams           set event_id = null where event_id = p_id;
  delete from public.registrations where event_id = p_id;
  delete from public.event_rsvps   where event_id = p_id;
  update public.perk_challenges set event_id = null where event_id = p_id;
  update public.sponsors        set event_id = null where event_id = p_id;
  update public.gallery_items   set event_id = null where event_id = p_id;
  delete from public.events where id = p_id;

  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

notify pgrst, 'reload schema';
