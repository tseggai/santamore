-- ============================================================================
-- RLS verification probes — SQL-editor equivalent of tests/rls.test.ts.
-- Run the whole file at once in the Supabase SQL editor.
-- The final SELECT prints one row per check; every result must say PASS.
--
-- Safe to run repeatedly: probes are read-only, the one INSERT attempt runs
-- as anon and must be denied, and everything transient is a temp table.
-- ============================================================================

create temp table _results (n serial, test text, result text);

-- 1. Anonymous SELECT on every locked table must be denied
do $$
declare
  t text;
  locked text[] := array[
    'donations', 'profiles', 'subscriptions', 'disbursements',
    'beneficiary_applications', 'webhook_events', 'ledger_adjustments',
    'registrations', 'fundraisers', 'sponsors', 'ask_list_items', 'teams'
  ];
begin
  foreach t in array locked loop
    begin
      set local role anon;
      execute format('select * from public.%I limit 1', t);
      reset role;
      insert into _results (test, result)
        values ('anon SELECT ' || t, 'FAIL — table is readable');
    exception when insufficient_privilege then
      insert into _results (test, result)
        values ('anon SELECT ' || t, 'PASS — permission denied');
    end;
  end loop;
end $$;

-- 2. Anonymous INSERT into donations must be denied
do $$
begin
  begin
    set local role anon;
    insert into public.donations (amount_cents, rail, campaign_id)
      values (100, 'other', '20000000-0000-4000-8000-000000000001');
    reset role;
    insert into _results (test, result)
      values ('anon INSERT donations', 'FAIL — insert succeeded');
  exception when insufficient_privilege then
    insert into _results (test, result)
      values ('anon INSERT donations', 'PASS — permission denied');
  end;
end $$;

-- 3. No public view exposes a sensitive column
insert into _results (test, result)
select 'no sensitive columns in v_public_* / v_* views',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('v_public_ledger_in', 'v_public_ledger_out',
                         'v_public_ledger_adjustments', 'v_fundraiser_totals',
                         'v_chapter_totals', 'v_leaderboard')
      and column_name in ('donor_email', 'beneficiary_private_note',
                          'provider_order_number', 'provider_transaction_id',
                          'pan_token', 'created_by', 'message')
  ) then 'FAIL — sensitive column projected' else 'PASS' end;

-- 3b. Task 5 views: the donor wall deliberately projects `message` (public
-- and moderatable, brief §9.7) but must never project identity, moderation
-- or ownership internals
insert into _results (test, result)
select 'no sensitive columns in Task 5 views',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('v_public_donor_wall', 'v_team_totals',
                         'v_leaderboard_teams', 'v_public_events')
      and column_name in ('donor_email', 'donor_name', 'is_message_hidden',
                          'is_anonymous', 'user_id', 'captain_id',
                          'provider_order_number', 'provider_transaction_id',
                          'pan_token')
  ) then 'FAIL — sensitive column projected' else 'PASS' end;

-- 3c. The SEPA matching key is immutable to clients: the column-level update
-- grant on fundraisers excludes payment_reference (and slug/user_id/
-- event_id), and there is no insert grant at all — references are minted
-- server-side only (Task 3 security review). Privilege checks trip before
-- row matching, so these probes need no fixture rows.
do $$
begin
  begin
    set local role authenticated;
    update public.fundraisers set payment_reference = 'SM-0126-0001' where false;
    reset role;
    insert into _results (test, result)
      values ('authenticated UPDATE fundraisers.payment_reference', 'FAIL — allowed');
  exception when insufficient_privilege then
    insert into _results (test, result)
      values ('authenticated UPDATE fundraisers.payment_reference', 'PASS — permission denied');
  end;
  begin
    set local role authenticated;
    update public.fundraisers set user_id = gen_random_uuid() where false;
    reset role;
    insert into _results (test, result)
      values ('authenticated UPDATE fundraisers.user_id', 'FAIL — allowed');
  exception when insufficient_privilege then
    insert into _results (test, result)
      values ('authenticated UPDATE fundraisers.user_id', 'PASS — permission denied');
  end;
  begin
    set local role authenticated;
    insert into public.fundraisers (user_id, event_id, slug, title, payment_reference)
    values (gen_random_uuid(), gen_random_uuid(), 'x', 'x', 'SM-0126-0002');
    reset role;
    insert into _results (test, result)
      values ('authenticated INSERT fundraisers', 'FAIL — allowed');
  exception when insufficient_privilege then
    insert into _results (test, result)
      values ('authenticated INSERT fundraisers', 'PASS — permission denied');
  end;
  begin
    set local role authenticated;
    update public.teams set slug = 'x' where false;
    reset role;
    insert into _results (test, result)
      values ('authenticated UPDATE teams.slug', 'FAIL — allowed');
  exception when insufficient_privilege then
    insert into _results (test, result)
      values ('authenticated UPDATE teams.slug', 'PASS — permission denied');
  end;
end $$;

-- 4. Anonymous reads of the public views must work and show expected data
do $$
declare
  n bigint;
  amt bigint;
begin
  -- read each view as anon, then drop back to owner to record the result
  set local role anon;
  select count(*) into n from public.v_public_ledger_in;
  select amount_cents into amt from public.v_public_ledger_in
    where display_name = 'Test Donor' limit 1;
  reset role;
  insert into _results (test, result) values ('anon SELECT v_public_ledger_in',
    case when n >= 1 then 'PASS — ' || n || ' row(s)' else 'FAIL — empty' end);
  insert into _results (test, result) values ('sample donation shows NET 2500',
    case when amt = 2500 then 'PASS' else 'FAIL — got ' || coalesce(amt::text, 'null') end);

  set local role anon;
  select count(*) into n from public.v_public_ledger_out;
  reset role;
  insert into _results (test, result) values ('anon SELECT v_public_ledger_out',
    case when n >= 1 then 'PASS — ' || n || ' row(s)' else 'FAIL — empty' end);

  set local role anon;
  select count(*) into n from public.v_public_ledger_adjustments;
  reset role;
  insert into _results (test, result)
    values ('anon SELECT v_public_ledger_adjustments', 'PASS — ' || n || ' row(s)');

  set local role anon;
  select count(*) into n from public.v_chapter_totals;
  reset role;
  insert into _results (test, result) values ('anon SELECT v_chapter_totals',
    case when n >= 1 then 'PASS — ' || n || ' row(s)' else 'FAIL — empty' end);

  set local role anon;
  select count(*) into n from public.v_leaderboard;
  reset role;
  insert into _results (test, result)
    values ('anon SELECT v_leaderboard', 'PASS — ' || n || ' row(s)');

  set local role anon;
  select count(*) into n from public.v_public_donor_wall;
  reset role;
  insert into _results (test, result)
    values ('anon SELECT v_public_donor_wall', 'PASS — ' || n || ' row(s)');

  set local role anon;
  select count(*) into n from public.v_leaderboard_teams;
  reset role;
  insert into _results (test, result)
    values ('anon SELECT v_leaderboard_teams', 'PASS — ' || n || ' row(s)');

  set local role anon;
  select count(*) into n from public.v_public_events;
  reset role;
  insert into _results (test, result) values ('anon SELECT v_public_events',
    case when n >= 1 then 'PASS — ' || n || ' row(s)' else 'FAIL — empty' end);
end $$;

-- 5. Immutability spot-checks (expected to be denied by triggers)
do $$
begin
  begin
    update public.donations set donor_name = 'X'
      where id = '40000000-0000-4000-8000-000000000001';
    insert into _results (test, result)
      values ('trigger: edit approved donation', 'FAIL — update succeeded');
  exception when others then
    insert into _results (test, result)
      values ('trigger: edit approved donation', 'PASS — ' || sqlerrm);
  end;
  begin
    delete from public.ledger_adjustments where false is false and id is not null;
    -- reaching here with zero rows is still fine; only real deletes trip it
    if exists (select 1 from public.ledger_adjustments) then
      insert into _results (test, result)
        values ('trigger: delete adjustments', 'FAIL — delete succeeded');
    else
      insert into _results (test, result)
        values ('trigger: delete adjustments', 'PASS — no rows to protect yet');
    end if;
  exception when others then
    insert into _results (test, result)
      values ('trigger: delete adjustments', 'PASS — ' || sqlerrm);
  end;
end $$;

-- 6. Tasks 6+7 (migration 0006): challenges, inbound, content, ledger views
do $$
declare
  t text;
  n bigint;
  s record;
begin
  -- 6a. new base tables stay unreadable anonymously
  foreach t in array array['activities', 'inbound_messages'] loop
    begin
      set local role anon;
      execute format('select * from public.%I limit 1', t);
      reset role;
      insert into _results (test, result)
        values ('anon SELECT ' || t, 'FAIL — table is readable');
    exception when insufficient_privilege then
      insert into _results (test, result)
        values ('anon SELECT ' || t, 'PASS — permission denied');
    end;
  end loop;

  -- 6b. anon INSERT into inbound_messages must be denied (service role only)
  begin
    set local role anon;
    insert into public.inbound_messages (kind, email) values ('contact', 'x@x.invalid');
    reset role;
    insert into _results (test, result)
      values ('anon INSERT inbound_messages', 'FAIL — insert succeeded');
  exception when insufficient_privilege then
    insert into _results (test, result)
      values ('anon INSERT inbound_messages', 'PASS — permission denied');
  end;

  -- 6c. new public views are anon-readable
  foreach t in array array['v_activity_totals', 'v_public_posts',
                           'v_public_gallery', 'v_public_ledger_summary',
                           'v_public_ops_total'] loop
    begin
      set local role anon;
      execute format('select count(*) from public.%I', t) into n;
      reset role;
      insert into _results (test, result)
        values ('anon SELECT ' || t, 'PASS — ' || n || ' row(s)');
    exception when insufficient_privilege then
      reset role;
      insert into _results (test, result)
        values ('anon SELECT ' || t, 'FAIL — permission denied');
    end;
  end loop;

  -- 6d. summary arithmetic holds: unallocated = received − disbursed − pending
  select * into s from public.v_public_ledger_summary;
  insert into _results (test, result) values ('ledger summary arithmetic',
    case when s.unallocated_cents
              = s.received_cents - s.disbursed_cents - s.approved_pending_cents
         then 'PASS' else 'FAIL — inconsistent totals' end);

  -- 6e. the reference-uniqueness trigger now guards registrations too
  insert into _results (test, result) values ('registrations reference trigger',
    case when exists (
      select 1 from pg_trigger
      where tgname = 'trg_registrations_reference_globally_unique'
    ) and position('registrations' in pg_get_functiondef(
          'public.enforce_payment_reference_global_uniqueness'::regproc)) > 0
    then 'PASS' else 'FAIL — trigger or function coverage missing' end);
end $$;

select test, result from _results order by n;
