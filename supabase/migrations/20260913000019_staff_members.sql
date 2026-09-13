-- ============================================================================
-- Santamore — the staff roster of members
-- Apply AFTER 20260913000018_supporters.sql. Re-runnable.
--
-- One row per account with everything staff ask about a person: what
-- they raise, whether Strava is on, where they registered, what they
-- gave (matched by their sign-in email). Aggregates only, gated on
-- is_staff() inside the definer view; tokens never appear.
-- ============================================================================

create or replace view public.v_staff_members
  with (security_invoker = off, security_barrier = on) as
select
  p.id,
  p.full_name,
  p.role,
  u.email,
  u.created_at as joined_at,
  (select count(*) from public.fundraisers f where f.user_id = p.id) as pages,
  (select count(*) from public.fundraisers f where f.user_id = p.id and f.status = 'active') as live_pages,
  (select coalesce(sum(d.amount_cents), 0)
     from public.donations d join public.fundraisers f on f.id = d.fundraiser_id
    where f.user_id = p.id and d.status = 'approved') as raised_cents,
  (select count(*) from public.teams t where t.captain_id = p.id) as teams,
  (select count(*) from public.registrations r where r.user_id = p.id and r.status <> 'cancelled') as registrations,
  (select count(*) from public.event_rsvps r where r.user_id = p.id) as rsvps,
  exists (select 1 from public.strava_connections s where s.user_id = p.id) as strava,
  (select s.last_sync_at from public.strava_connections s where s.user_id = p.id) as strava_last_sync,
  (select count(*) from public.activities a
    where a.user_id = p.id and a.source = 'strava'
      and a.started_on >= (now() at time zone 'Europe/Podgorica')::date - 29) as activities_30d,
  (select count(*) from public.perk_awards w where w.user_id = p.id and w.status <> 'revoked') as awards,
  (select count(*) from public.donations d
    where d.status = 'approved' and d.donor_email is not null
      and lower(d.donor_email) = lower(u.email)) as donations,
  (select coalesce(sum(d.amount_cents), 0) from public.donations d
    where d.status = 'approved' and d.donor_email is not null
      and lower(d.donor_email) = lower(u.email)) as given_cents
from public.profiles p
left join auth.users u on u.id = p.id
where public.is_staff();

grant select on public.v_staff_members to authenticated;
