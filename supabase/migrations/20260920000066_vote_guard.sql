-- ============================================================================
-- Santamore — the vote guard sees every proposal
-- Apply AFTER 20260920000065_site_settings_public.sql. Re-runnable.
--
-- enforce_vote_target (0029) checked the proposal's status with the voter's
-- own rights, and cause_proposals lets only the proposer and staff read a
-- row. So a member voting on anyone else's proposal was told it was not
-- open. The check now runs as the function owner and reads the row itself;
-- nothing else changes: votes still land only on open or shortlisted
-- proposals.
-- ============================================================================

create or replace function public.enforce_vote_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.cause_proposals p
                  where p.id = new.proposal_id and p.status in ('open', 'shortlisted')) then
    raise exception 'cause_votes: this proposal is not open for votes';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_vote_target() from public;

notify pgrst, 'reload schema';
