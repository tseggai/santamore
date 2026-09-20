-- ============================================================================
-- Santamore — marking a gift or a hand-over as test is the one change allowed
-- Apply AFTER 20260920000056_mark_as_test.sql. Re-runnable.
--
-- mark_campaign_test and mark_event_test set is_test on approved gifts and
-- published hand-overs, and the immutability triggers refused them like any
-- other edit. Flipping is_test from false to true, and nothing else, is now
-- allowed; every other change to live money stays refused. Only an admin
-- reaches those functions, and a test row cannot become live again.
-- ============================================================================

create or replace function public.enforce_donation_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A gift made in test mode is practice: it may change or go.
  if old.is_test then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('approved', 'refunded') then
      raise exception 'donations: % rows are immutable and cannot be deleted', old.status;
    end if;
    return old;
  end if;

  -- Marking a live gift as test data, changing nothing else, is allowed.
  if new.is_test
     and to_jsonb(new) - 'is_test' - 'net_cents' = to_jsonb(old) - 'is_test' - 'net_cents' then
    return new;
  end if;

  if old.status in ('approved', 'refunded') then
    if to_jsonb(new) - 'is_message_hidden' - 'net_cents'
       = to_jsonb(old) - 'is_message_hidden' - 'net_cents' then
      return new;
    end if;
    if old.status = 'approved'
       and new.status = 'refunded'
       and to_jsonb(new) - 'status' - 'net_cents'
         = to_jsonb(old) - 'status' - 'net_cents' then
      return new;
    end if;
    raise exception 'donations: % rows are immutable (only approved -> refunded or message moderation, changing nothing else, is allowed; corrections go in ledger_adjustments)', old.status;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_disbursement_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_test then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'DELETE' and new.is_test
     and to_jsonb(new) - 'is_test' = to_jsonb(old) - 'is_test' then
    return new;
  end if;
  if old.published_at is not null then
    raise exception 'disbursements: published rows are immutable (corrections go in ledger_adjustments)';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
