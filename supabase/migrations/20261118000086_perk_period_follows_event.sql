-- ============================================================================
-- Santamore — a reward runs for its challenge's period
-- Apply AFTER 20261022000085_meeting_images.sql. Re-runnable.
--
-- A reward (perk_challenges) used to carry dates of its own, typed a second
-- time under the challenge's. Left empty, as they usually were, the reward
-- had no period at all: evaluate_activity_perks() reads only the reward's
-- starts_at / ends_at, so it awarded before the challenge began and after
-- it ended. The console no longer asks for them. The challenge event's
-- period is the one period, and the database keeps the reward's two
-- columns equal to it, so every reader (the awarding function, the public
-- view, the sponsor reports) stays as it is:
--   • a reward takes its event's period when it is saved;
--   • a change to an event's period reaches its rewards;
--   • existing rewards are brought in line once, below.
-- ============================================================================

create or replace function public.perk_challenge_take_event_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_id is not null then
    select e.starts_at, e.ends_at
      into new.starts_at, new.ends_at
      from public.events e
     where e.id = new.event_id;
  end if;
  return new;
end;
$$;
revoke all on function public.perk_challenge_take_event_period() from public, anon, authenticated;

drop trigger if exists perk_challenges_take_event_period on public.perk_challenges;
create trigger perk_challenges_take_event_period
  before insert or update of event_id, starts_at, ends_at on public.perk_challenges
  for each row execute function public.perk_challenge_take_event_period();

create or replace function public.event_period_to_perk_challenges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then
    update public.perk_challenges
       set starts_at = new.starts_at, ends_at = new.ends_at
     where event_id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function public.event_period_to_perk_challenges() from public, anon, authenticated;

drop trigger if exists events_period_to_perk_challenges on public.events;
create trigger events_period_to_perk_challenges
  after update of starts_at, ends_at on public.events
  for each row execute function public.event_period_to_perk_challenges();

-- Existing rewards: the event's period, once.
update public.perk_challenges c
   set starts_at = e.starts_at, ends_at = e.ends_at
  from public.events e
 where c.event_id = e.id
   and (c.starts_at is distinct from e.starts_at or c.ends_at is distinct from e.ends_at);
