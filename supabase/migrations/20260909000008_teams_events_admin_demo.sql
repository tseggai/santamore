-- ============================================================================
-- Santamore — team profiles, staff event/campaign management, demo data
-- Apply AFTER 20260901000007_refund_rpc.sql.
--
--  1. Teams get a face: description + photo_path, editable by the captain
--     (owner request — joining or creating a team is its own flow with a
--     name, a photo and a description, exactly like a fundraiser page).
--     v_team_totals / v_leaderboard_teams project both so the team page and
--     the leaderboard can show them.
--  2. Staff manage events and campaigns from the console (brief §4:
--     /admin/dogadjaji). Insert/update only — nothing is ever deleted,
--     because donations, registrations and pages hang off both.
--  3. Demo data (owner request): a registry of every row the demo generator
--     creates, plus purge_demo_data() which removes exactly those rows and
--     nothing else. The immutability triggers are disabled for the purge
--     ONLY — the same sanctioned pattern as supabase/cleanup_samples.sql —
--     and the function is SECURITY DEFINER gated on is_staff().
-- ============================================================================

-- 1 ─ team profile ------------------------------------------------------------
alter table public.teams
  add column if not exists description text,
  add column if not exists photo_path  text;

grant update (name, goal_cents, description, photo_path)
  on public.teams to authenticated;

drop view if exists public.v_leaderboard_teams;

create or replace view public.v_team_totals
  with (security_invoker = off, security_barrier = on) as
select
  t.id,
  t.slug,
  t.name,
  t.goal_cents,
  t.event_id,
  e.slug as event_slug,
  e.name as event_name,
  count(ft.id) as member_count,
  coalesce(sum(ft.raised_cents), 0) as raised_cents,
  coalesce(sum(ft.donor_count), 0) as donor_count,
  t.description,
  t.photo_path
from public.teams t
join public.events e on e.id = t.event_id
left join public.v_fundraiser_totals ft on ft.team_id = t.id
group by t.id, e.id;

create or replace view public.v_leaderboard_teams
  with (security_invoker = off, security_barrier = on) as
select
  tt.*,
  rank() over (partition by tt.event_id order by tt.raised_cents desc) as rank
from public.v_team_totals tt
where tt.member_count > 0;

grant select on public.v_team_totals, public.v_leaderboard_teams
  to anon, authenticated;

-- 2 ─ staff event + campaign management -------------------------------------
grant select, insert, update on public.events to authenticated;

drop policy if exists events_staff_select on public.events;
create policy events_staff_select on public.events
  for select to authenticated using (public.is_staff());
drop policy if exists events_staff_insert on public.events;
create policy events_staff_insert on public.events
  for insert to authenticated with check (public.is_staff());
drop policy if exists events_staff_update on public.events;
create policy events_staff_update on public.events
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant insert, update on public.campaigns to authenticated;

drop policy if exists campaigns_staff_insert on public.campaigns;
create policy campaigns_staff_insert on public.campaigns
  for insert to authenticated with check (public.is_staff());
drop policy if exists campaigns_staff_update on public.campaigns;
create policy campaigns_staff_update on public.campaigns
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- 3 ─ demo data registry + purge ---------------------------------------------
create table if not exists public.demo_records (
  kind        text not null
              check (kind in ('user', 'team', 'fundraiser', 'donation')),
  row_id      uuid not null,
  created_at  timestamptz not null default now(),
  primary key (kind, row_id)
);

-- Service-role only: no grants, no policies.
alter table public.demo_records enable row level security;

/**
 * Remove every demo row the generator registered, in dependency order,
 * and return the demo auth user ids so the caller can delete the users
 * (auth.admin API) and their storage folders. Immutability triggers are
 * disabled for exactly the demo deletes and re-enabled in the same
 * transaction. Staff only.
 */
create or replace function public.purge_demo_data()
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_users uuid[];
begin
  if not public.is_staff() then
    raise exception 'purge_demo_data: staff only' using errcode = '42501';
  end if;

  select coalesce(array_agg(row_id), '{}')
    into v_users
    from public.demo_records where kind = 'user';

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

  delete from public.teams
   where id in (select row_id from public.demo_records where kind = 'team');

  delete from public.registrations
   where user_id = any (v_users);

  delete from public.demo_records where kind <> 'user';

  return v_users;
end;
$$;

revoke all on function public.purge_demo_data() from public;
grant execute on function public.purge_demo_data() to authenticated;
