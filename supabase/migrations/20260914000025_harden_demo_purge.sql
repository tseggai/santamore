-- 0025 · purge_demo_data() copes with real rows that lean on demo rows.
-- A real member may have joined a demo team, and a test checkout may have
-- been started against a demo page. Both used to make the purge fail with
-- a foreign-key error and no explanation. Now:
--   * real pages in demo teams are detached (team_id -> null);
--   * abandoned checkouts (pending / failed) on demo pages are dropped —
--     they carry no money and their page is going away;
--   * approved or refunded donations on demo pages are never touched:
--     the purge stops and says how many there are, so the owner decides.
-- Re-runnable.

create or replace function public.purge_demo_data()
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_users uuid[];
  v_real  integer;
begin
  if not public.is_staff() then
    raise exception 'purge_demo_data: staff only' using errcode = '42501';
  end if;

  select coalesce(array_agg(row_id), '{}')
    into v_users
    from public.demo_records where kind = 'user';

  -- Real money on a demo page is the owner's call, never the purge's.
  select count(*) into v_real
    from public.donations d
   where d.status in ('approved', 'refunded')
     and d.fundraiser_id in (select row_id from public.demo_records where kind = 'fundraiser')
     and d.id not in (select row_id from public.demo_records where kind = 'donation');
  if v_real > 0 then
    raise exception
      'purge_demo_data: % approved donation(s) sit on demo pages and were not generated — see supabase/demo_blockers.sql',
      v_real using errcode = 'P0001';
  end if;

  -- Abandoned checkouts against demo pages carry no money.
  delete from public.donations d
   where d.status not in ('approved', 'refunded')
     and d.fundraiser_id in (select row_id from public.demo_records where kind = 'fundraiser')
     and d.id not in (select row_id from public.demo_records where kind = 'donation');

  alter table public.donations disable trigger trg_donations_immutability;

  delete from public.ledger_adjustments
   where references_donation_id in
         (select row_id from public.demo_records where kind = 'donation');

  delete from public.donations
   where id in (select row_id from public.demo_records where kind = 'donation');

  alter table public.donations enable trigger trg_donations_immutability;

  delete from public.activities
   where fundraiser_id in
         (select row_id from public.demo_records where kind = 'fundraiser');

  delete from public.ask_list_items
   where fundraiser_id in
         (select row_id from public.demo_records where kind = 'fundraiser');

  delete from public.fundraisers
   where id in (select row_id from public.demo_records where kind = 'fundraiser');

  -- A real member who joined a demo team keeps their page, minus the team.
  update public.fundraisers
     set team_id = null
   where team_id in (select row_id from public.demo_records where kind = 'team');

  delete from public.teams
   where id in (select row_id from public.demo_records where kind = 'team');

  delete from public.registrations
   where user_id = any (v_users);

  delete from public.event_rsvps
   where user_id = any (v_users);

  delete from public.demo_records where kind <> 'user';

  return v_users;
end;
$$;

comment on function public.purge_demo_data() is
  '0025: removes generated rows only; detaches real pages from demo teams; refuses when approved donations sit on demo pages.';

revoke all on function public.purge_demo_data() from public;
grant execute on function public.purge_demo_data() to authenticated;
