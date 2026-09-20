-- ============================================================================
-- Santamore — qualify a record for live mode, or mark it as test, one by one
-- Apply AFTER 20260920000058_proposal_edit.sql. Re-runnable.
--
-- After a practice run, some of what was made in test mode is worth keeping
-- (a real cause drafted while the switch was on, a supporter, a year report)
-- and the rest should go with the purge. set_record_test flips one record
-- and everything that hangs off it either way: to test (it stops counting
-- when the switch is off, loses immutability, goes with the next purge) or
-- to live (it counts, and its money becomes immutable again). Live money
-- that is not attached to the record is never touched.
--
-- A child of a test parent (a page under a test cause, a gift on a test
-- event) still goes with the purge whatever its own flag says; qualify the
-- parent, or delete the child.
-- ============================================================================

create or replace function public.set_record_test(p_kind text, p_id uuid, p_test boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_kind = 'campaign' then
    select title into v_name from public.campaigns where id = p_id;
    if v_name is null then return jsonb_build_object('ok', false, 'reason', 'missing'); end if;
    update public.campaigns set is_test = p_test where id = p_id and is_test <> p_test;
    update public.donations d set is_test = p_test
     where d.is_test <> p_test
       and (d.campaign_id = p_id
            or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.campaign_id = p_id));
    update public.disbursements set is_test = p_test where campaign_id = p_id and is_test <> p_test;
    update public.ledger_adjustments la set is_test = p_test
     where la.is_test <> p_test
       and (exists (select 1 from public.donations d where d.id = la.references_donation_id
                      and (d.campaign_id = p_id
                           or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.campaign_id = p_id)))
            or exists (select 1 from public.disbursements db where db.id = la.references_disbursement_id and db.campaign_id = p_id));
    update public.fundraisers   set is_test = p_test where campaign_id = p_id and is_test <> p_test;
    update public.teams         set is_test = p_test where campaign_id = p_id and is_test <> p_test;
    update public.sponsors      set is_test = p_test where campaign_id = p_id and is_test <> p_test;
    update public.beneficiaries set is_test = p_test where campaign_id = p_id and is_test <> p_test;

  elsif p_kind = 'event' then
    select name into v_name from public.events where id = p_id;
    if v_name is null then return jsonb_build_object('ok', false, 'reason', 'missing'); end if;
    update public.events set is_test = p_test where id = p_id and is_test <> p_test;
    update public.donations set is_test = p_test where event_id = p_id and is_test <> p_test;
    update public.ledger_adjustments la set is_test = p_test
     where la.is_test <> p_test
       and exists (select 1 from public.donations d where d.id = la.references_donation_id and d.event_id = p_id);
    update public.registrations set is_test = p_test where event_id = p_id and is_test <> p_test;
    update public.event_rsvps   set is_test = p_test where event_id = p_id and is_test <> p_test;
    update public.sponsors      set is_test = p_test where event_id = p_id and is_test <> p_test;

  elsif p_kind = 'fundraiser' then
    select title into v_name from public.fundraisers where id = p_id;
    if v_name is null then return jsonb_build_object('ok', false, 'reason', 'missing'); end if;
    update public.fundraisers set is_test = p_test where id = p_id and is_test <> p_test;
    update public.donations set is_test = p_test where fundraiser_id = p_id and is_test <> p_test;
    update public.ledger_adjustments la set is_test = p_test
     where la.is_test <> p_test
       and exists (select 1 from public.donations d where d.id = la.references_donation_id and d.fundraiser_id = p_id);

  elsif p_kind = 'team' then
    select name into v_name from public.teams where id = p_id;
    if v_name is null then return jsonb_build_object('ok', false, 'reason', 'missing'); end if;
    update public.teams set is_test = p_test where id = p_id and is_test <> p_test;
    update public.fundraisers set is_test = p_test where team_id = p_id and is_test <> p_test;
    update public.donations d set is_test = p_test
     where d.is_test <> p_test
       and exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.team_id = p_id);
    update public.ledger_adjustments la set is_test = p_test
     where la.is_test <> p_test
       and exists (select 1 from public.donations d join public.fundraisers f on f.id = d.fundraiser_id
                    where d.id = la.references_donation_id and f.team_id = p_id);

  elsif p_kind = 'supporter' then
    select name into v_name from public.supporters where id = p_id;
    if v_name is null then return jsonb_build_object('ok', false, 'reason', 'missing'); end if;
    update public.supporters set is_test = p_test where id = p_id and is_test <> p_test;
    update public.sponsors set is_test = p_test where supporter_id = p_id and is_test <> p_test;

  elsif p_kind = 'beneficiary' then
    select name into v_name from public.beneficiaries where id = p_id;
    if v_name is null then return jsonb_build_object('ok', false, 'reason', 'missing'); end if;
    update public.beneficiaries set is_test = p_test where id = p_id and is_test <> p_test;

  elsif p_kind = 'proposal' then
    select title into v_name from public.cause_proposals where id = p_id;
    if v_name is null then return jsonb_build_object('ok', false, 'reason', 'missing'); end if;
    update public.cause_proposals set is_test = p_test where id = p_id and is_test <> p_test;

  else
    raise exception 'set_record_test: unknown kind %', p_kind using errcode = '22023';
  end if;

  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

-- A year report is keyed by its year, not a uuid.
create or replace function public.set_year_report_test(p_year integer, p_test boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.year_reports where year = p_year) then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  update public.year_reports set is_test = p_test where year = p_year and is_test <> p_test;
  return jsonb_build_object('ok', true, 'name', p_year::text);
end;
$$;

-- The one-way helpers from 0056 now go through the same path.
create or replace function public.mark_campaign_test(p_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.set_record_test('campaign', p_id, true);
$$;

create or replace function public.mark_event_test(p_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.set_record_test('event', p_id, true);
$$;

revoke all on function public.set_record_test(text, uuid, boolean), public.set_year_report_test(integer, boolean) from public;
grant execute on function public.set_record_test(text, uuid, boolean), public.set_year_report_test(integer, boolean) to authenticated;

notify pgrst, 'reload schema';
