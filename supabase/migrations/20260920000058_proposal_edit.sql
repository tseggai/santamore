-- ============================================================================
-- Santamore — a proposer edits their proposal until the first vote
-- Apply AFTER 20260920000057_mark_test_allowed.sql. Re-runnable.
--
-- A proposal is the proposer's until someone votes on it: after that the
-- votes were cast for a text, and the text stays. The public list says
-- which proposals are the reader's own; update_my_proposal changes the
-- wording of an open, unvoted proposal of the caller and nothing else.
-- ============================================================================

drop view if exists public.v_public_cause_proposals;
create view public.v_public_cause_proposals
  with (security_invoker = off, security_barrier = on) as
with counted as (
  select p.id, p.title, p.summary, p.location, p.beneficiary, p.amount_cents, p.status, p.created_at,
         split_part(coalesce(pr.full_name, ''), ' ', 1) as proposer_first_name,
         c.slug as campaign_slug,
         (select count(*) from public.cause_votes v where v.proposal_id = p.id) as vote_count,
         (p.proposer_id = (select auth.uid())) as is_mine
    from public.cause_proposals p
    join public.profiles pr on pr.id = p.proposer_id
    left join public.campaigns c on c.id = p.campaign_id and c.is_public
   where p.status in ('open', 'shortlisted', 'chosen')
)
select *,
       rank() over (partition by (status in ('open', 'shortlisted')) order by vote_count desc, created_at asc) as vote_rank
from counted;
grant select on public.v_public_cause_proposals to anon, authenticated;

create or replace function public.update_my_proposal(
  p_id uuid,
  p_title text,
  p_summary text,
  p_location text,
  p_beneficiary text,
  p_amount_cents bigint
)
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

  update public.cause_proposals
     set title        = p_title,
         summary      = p_summary,
         location     = nullif(trim(coalesce(p_location, '')), ''),
         beneficiary  = nullif(trim(coalesce(p_beneficiary, '')), ''),
         amount_cents = p_amount_cents
   where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.update_my_proposal(uuid, text, text, text, text, bigint) from public;
grant execute on function public.update_my_proposal(uuid, text, text, text, text, bigint) to authenticated;

notify pgrst, 'reload schema';
