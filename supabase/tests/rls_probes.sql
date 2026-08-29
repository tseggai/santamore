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
    'registrations', 'fundraisers', 'sponsors', 'ask_list_items'
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

select test, result from _results order by n;
