-- ============================================================================
-- Fundraiser-page probes (Task 5) — behavioral checks for migration 0005:
-- the publish gate, team/event integrity, per-fundraiser payment references
-- (Task 3 security review), donor-wall masking, message moderation, captain
-- and owner column grants, and storage folder confinement.
--
-- Run the whole file at once in the Supabase SQL editor. It creates fixture
-- rows (auth users, teams, fundraisers, donations) inside ONE transaction
-- and ROLLS BACK at the end, so it is safe to run repeatedly on any
-- database — nothing persists. Every row of the result must say PASS.
-- ============================================================================

begin;

create temp table _r (n serial, test text, result text) on commit drop;

insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'runner@santamore.invalid'),
  ('a0000000-0000-4000-8000-000000000002', 'other@santamore.invalid');

do $$
begin
  if (select count(*) from public.profiles where id in
      ('a0000000-0000-4000-8000-000000000001',
       'a0000000-0000-4000-8000-000000000002')) = 2 then
    insert into _r (test, result) values ('profile auto-creation trigger', 'PASS');
  else
    insert into _r (test, result) values ('profile auto-creation trigger', 'FAIL');
  end if;
end $$;

insert into public.events (id, campaign_id, chapter_id, name, slug, is_published)
values ('30000000-0000-4000-8000-000000000902', null,
        (select id from public.chapters limit 1), 'Probe Event', 'probe-event', false);

insert into public.teams (id, event_id, name, slug, captain_id)
values ('60000000-0000-4000-8000-000000000901',
        (select id from public.events where slug <> 'probe-event' limit 1),
        'Probe Runners', 'probe-runners',
        'a0000000-0000-4000-8000-000000000001'),
       ('60000000-0000-4000-8000-000000000902',
        '30000000-0000-4000-8000-000000000902', 'Wrong Event Team', 'probe-wrong-event',
        'a0000000-0000-4000-8000-000000000002');

-- 1. Publish gate: active without photo/goal/story must be rejected
do $$
begin
  begin
    insert into public.fundraisers (user_id, event_id, slug, title,
                                    payment_reference, status)
    values ('a0000000-0000-4000-8000-000000000001',
            (select event_id from public.teams where slug = 'probe-runners'),
            'probe-empty', 'Empty Page', 'SM-0126-9001', 'active');
    insert into _r (test, result) values ('publish gate: empty active page', 'FAIL — insert succeeded');
  exception when others then
    insert into _r (test, result) values ('publish gate: empty active page', 'PASS — ' || sqlerrm);
  end;
end $$;

-- 2. Draft with nothing is fine; activating later with everything is fine
insert into public.fundraisers (id, user_id, event_id, slug, title,
                                payment_reference, status)
values ('70000000-0000-4000-8000-000000000901',
        'a0000000-0000-4000-8000-000000000001',
        (select event_id from public.teams where slug = 'probe-runners'),
        'probe-ana', 'Ana K.', 'SM-0126-9002', 'draft');
do $$
begin
  update public.fundraisers
     set photo_path = 'a0000000-0000-4000-8000-000000000001/photo.webp',
         goal_cents = 30000,
         story = 'Trčim petu godinu zaredom i ove godine trčim za porodice u Tivtu. Pridružite se — svaki euro ide direktno onima kojima treba.',
         status = 'active',
         team_id = '60000000-0000-4000-8000-000000000901'
   where id = '70000000-0000-4000-8000-000000000901';
  insert into _r (test, result) values ('publish gate: complete page activates', 'PASS');
exception when others then
  insert into _r (test, result) values ('publish gate: complete page activates', 'FAIL — ' || sqlerrm);
end $$;

-- 3. Team from another event must be rejected
do $$
begin
  begin
    update public.fundraisers
       set team_id = '60000000-0000-4000-8000-000000000902'
     where id = '70000000-0000-4000-8000-000000000901';
    insert into _r (test, result) values ('team/event integrity', 'FAIL — update succeeded');
  exception when others then
    insert into _r (test, result) values ('team/event integrity', 'PASS — ' || sqlerrm);
  end;
end $$;

-- 4. Cross-table uniqueness: a fundraiser cannot take a campaign's reference
do $$
declare campaign_ref text;
begin
  select payment_reference into campaign_ref from public.campaigns limit 1;
  if campaign_ref is null then
    insert into _r (test, result)
      values ('reference collision with campaign', 'PASS — no campaign to collide with');
    return;
  end if;
  begin
    insert into public.fundraisers (user_id, event_id, slug, title,
                                    payment_reference, status)
    values ('a0000000-0000-4000-8000-000000000002',
            (select event_id from public.teams where slug = 'probe-runners'),
            'probe-thief', 'Ref Thief', campaign_ref, 'draft');
    insert into _r (test, result) values ('reference collision with campaign', 'FAIL — insert succeeded');
  exception when others then
    insert into _r (test, result) values ('reference collision with campaign', 'PASS — ' || sqlerrm);
  end;
end $$;

-- 5. Owner can edit their own story; an outsider's update matches zero rows
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
  update public.fundraisers set story = story || ' Hvala vam svima od srca!'
   where id = '70000000-0000-4000-8000-000000000901';
  get diagnostics n = row_count;
  reset role;
  insert into _r (test, result) values ('owner update own story',
    case when n = 1 then 'PASS' else 'FAIL — ' || n || ' rows' end);
end $$;
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
  update public.fundraisers set story = 'hijacked'
   where id = '70000000-0000-4000-8000-000000000901';
  get diagnostics n = row_count;
  reset role;
  insert into _r (test, result) values ('outsider update foreign fundraiser',
    case when n = 0 then 'PASS — zero rows matched' else 'FAIL — ' || n || ' rows' end);
end $$;

-- 6. Donor wall: approved visible, hidden message masked, anonymous name
--    masked, pending invisible; moderation may flip ONLY the flag
insert into public.donations (id, amount_cents, fee_covered_cents, fundraiser_id,
  event_id, chapter_id, donor_name, donor_email, display_name, is_anonymous,
  message, rail, status, approved_at)
select x.id, x.amount, 0,
  '70000000-0000-4000-8000-000000000901', f.event_id, e.chapter_id,
  x.donor, x.email, x.display, x.anon, x.msg, x.rail, x.status, x.approved
from public.fundraisers f
join public.events e on e.id = f.event_id,
lateral (values
  ('40000000-0000-4000-8000-000000000911'::uuid, 3000::bigint, 'Marko P.',
   'marko@santamore.invalid', 'Marko P.', false, 'Bravo Ana!', 'sepa', 'approved', now()),
  ('40000000-0000-4000-8000-000000000912'::uuid, 2000::bigint, 'Jovana',
   'jovana@santamore.invalid', null, true, 'Anonimna poruka', 'sepa', 'approved', now()),
  ('40000000-0000-4000-8000-000000000913'::uuid, 1000::bigint, 'Pending P.',
   'pending@santamore.invalid', 'Pending P.', false, 'Ne još', 'sepa', 'pending', null),
  ('40000000-0000-4000-8000-000000000914'::uuid, 12000::bigint, 'Cash C.',
   null, 'Cash C.', false, 'Ružna poruka', 'cash', 'approved', now())
) as x (id, amount, donor, email, display, anon, msg, rail, status, approved)
where f.id = '70000000-0000-4000-8000-000000000901';

do $$
begin
  update public.donations set is_message_hidden = true
   where id = '40000000-0000-4000-8000-000000000914';
  insert into _r (test, result) values ('moderation flag flip on approved row', 'PASS');
exception when others then
  insert into _r (test, result) values ('moderation flag flip on approved row', 'FAIL — ' || sqlerrm);
end $$;
do $$
begin
  begin
    update public.donations set is_message_hidden = true, donor_name = 'X'
     where id = '40000000-0000-4000-8000-000000000911';
    insert into _r (test, result) values ('flag flip smuggling other change', 'FAIL — update succeeded');
  exception when others then
    insert into _r (test, result) values ('flag flip smuggling other change', 'PASS — ' || sqlerrm);
  end;
end $$;
do $$
begin
  update public.donations set status = 'refunded'
   where id = '40000000-0000-4000-8000-000000000912';
  insert into _r (test, result) values ('approved -> refunded still permitted', 'PASS');
exception when others then
  insert into _r (test, result) values ('approved -> refunded still permitted', 'FAIL — ' || sqlerrm);
end $$;

do $$
declare wall_rows int; hidden_msg text; anon_name text; pending_rows int;
begin
  set local role anon;
  select count(*) into wall_rows from public.v_public_donor_wall
    where fundraiser_slug = 'probe-ana';
  select message into hidden_msg from public.v_public_donor_wall
    where id = '40000000-0000-4000-8000-000000000914';
  select display_name into anon_name from public.v_public_donor_wall
    where id = '40000000-0000-4000-8000-000000000912';
  select count(*) into pending_rows from public.v_public_donor_wall
    where id = '40000000-0000-4000-8000-000000000913';
  reset role;
  insert into _r (test, result) values ('donor wall rows (3 approved/refunded)',
    case when wall_rows = 3 then 'PASS' else 'FAIL — ' || wall_rows end);
  insert into _r (test, result) values ('hidden message masked',
    case when hidden_msg is null then 'PASS' else 'FAIL — ' || hidden_msg end);
  insert into _r (test, result) values ('anonymous name masked',
    case when anon_name is null then 'PASS' else 'FAIL — ' || anon_name end);
  insert into _r (test, result) values ('pending invisible on wall',
    case when pending_rows = 0 then 'PASS' else 'FAIL' end);
end $$;

-- 7. Totals and team views (30 + 120 approved, 20 refunded, no adjustment
--    yet: the append-only ledger keeps refunded in raised until corrected)
do $$
declare fr bigint; pr text; tr bigint; mc bigint; rk bigint;
begin
  set local role anon;
  select raised_cents, payment_reference into fr, pr
    from public.v_fundraiser_totals where slug = 'probe-ana';
  select raised_cents, member_count into tr, mc
    from public.v_team_totals where slug = 'probe-runners';
  select rank into rk from public.v_leaderboard_teams where slug = 'probe-runners';
  reset role;
  insert into _r (test, result) values ('fundraiser raised_cents',
    case when fr = 17000 then 'PASS' else 'FAIL — ' || fr end);
  insert into _r (test, result) values ('view exposes payment_reference',
    case when pr = 'SM-0126-9002' then 'PASS' else 'FAIL — ' || coalesce(pr, 'null') end);
  insert into _r (test, result) values ('team totals aggregate members',
    case when tr = 17000 and mc = 1 then 'PASS' else 'FAIL — ' || tr || '/' || mc end);
  insert into _r (test, result) values ('team leaderboard rank',
    case when rk = 1 then 'PASS' else 'FAIL — ' || rk end);
end $$;

-- 8. Captain can rename their own team
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
  update public.teams set name = 'Probe Runners Tivat'
   where id = '60000000-0000-4000-8000-000000000901';
  get diagnostics n = row_count;
  reset role;
  insert into _r (test, result) values ('captain renames own team',
    case when n = 1 then 'PASS' else 'FAIL — ' || n || ' rows' end);
end $$;

-- 9. Storage: uploads confined to the uploader's own folder
do $$
begin
  begin
    set local role authenticated;
    set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
    insert into storage.objects (bucket_id, name)
    values ('fundraiser-photos', 'a0000000-0000-4000-8000-000000000001/evil.webp');
    reset role;
    insert into _r (test, result) values ('storage write to foreign folder', 'FAIL — insert succeeded');
  exception when others then
    insert into _r (test, result) values ('storage write to foreign folder', 'PASS — ' || sqlerrm);
  end;
end $$;
do $$
begin
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
  insert into storage.objects (bucket_id, name)
  values ('fundraiser-photos', 'a0000000-0000-4000-8000-000000000001/photo.webp');
  reset role;
  insert into _r (test, result) values ('storage write to own folder', 'PASS');
exception when others then
  insert into _r (test, result) values ('storage write to own folder', 'FAIL — ' || sqlerrm);
end $$;

-- 10. The moderation flag itself is never projected by any public view
insert into _r (test, result)
select 'is_message_hidden not projected publicly',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name like 'v\_%'
      and column_name = 'is_message_hidden'
  ) then 'FAIL' else 'PASS' end;

select test, result from _r order by n;

rollback;
