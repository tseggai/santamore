-- ============================================================================
-- Santamore — the proposer withdraws their proposal until the first vote
-- Apply AFTER 20260920000059_set_record_test.sql. Re-runnable.
--
-- Same rule as update_my_proposal (0058): only the proposer, only while
-- the proposal is open, only before anyone has voted. After that the
-- wording is fixed and staff decide.
-- ============================================================================

create or replace function public.delete_my_proposal(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposer uuid;
  v_status   text;
  v_votes    bigint;
begin
  select proposer_id, status into v_proposer, v_status from public.cause_proposals where id = p_id;
  if v_proposer is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if v_proposer <> (select auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_status <> 'open' then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  select count(*) into v_votes from public.cause_votes where proposal_id = p_id;
  if v_votes > 0 then
    return jsonb_build_object('ok', false, 'reason', 'voted', 'count', v_votes);
  end if;
  delete from public.cause_proposals where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_my_proposal(uuid) from public;
grant execute on function public.delete_my_proposal(uuid) to authenticated;

notify pgrst, 'reload schema';
