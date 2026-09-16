-- 0028 · Two more shapes of taking part.
--   Races we do not organise ("Run for Santamore"): the event points at
--   the organiser, members join our roster, and we may buy a limited
--   number of bibs for the team.
--   Gatherings with guests: a member brings up to max_guests people by
--   name; a paid gathering charges the whole party on one reference; the
--   guests' rows follow the payer's status.
--   Price tiers may carry an "until" date (early bird): the public page and
--   the register action only offer tiers still valid.
-- Re-runnable.

alter table public.events
  add column if not exists hosting      text not null default 'own',
  add column if not exists external_url text,
  add column if not exists bib_policy   text not null default 'none',
  add column if not exists bib_capacity integer check (bib_capacity is null or bib_capacity >= 0),
  add column if not exists max_guests   integer not null default 0 check (max_guests between 0 and 20);
alter table public.events drop constraint if exists events_hosting_check;
alter table public.events add constraint events_hosting_check check (hosting in ('own', 'external'));
alter table public.events drop constraint if exists events_bib_policy_check;
alter table public.events add constraint events_bib_policy_check check (bib_policy in ('none', 'we_buy'));

alter table public.registrations
  add column if not exists needs_bib boolean not null default false,
  add column if not exists party_of  uuid references public.registrations (id) on delete cascade;
create index if not exists registrations_party_idx on public.registrations (party_of);

-- A guest's place is confirmed or cancelled with the person who pays.
create or replace function public.cascade_registration_party()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.party_of is null then
    update public.registrations
       set status = new.status
     where party_of = new.id and status is distinct from new.status;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_registrations_party on public.registrations;
create trigger trg_registrations_party
  after update of status on public.registrations
  for each row execute function public.cascade_registration_party();

-- The public view learns the new shape; bibs_claimed lets the page say how
-- many bibs are left without exposing who took them.
create or replace view public.v_public_events
  with (security_invoker = off, security_barrier = on) as
select
  e.id,
  e.slug,
  e.name,
  e.starts_at,
  e.venue,
  e.registration_opens_at,
  e.registration_closes_at,
  e.distances,
  c.slug as campaign_slug,
  e.kind,
  e.challenge_metric,
  e.ends_at,
  e.price_tiers,
  e.capacity,
  (select count(*) from public.event_rsvps r
    where r.event_id = e.id and r.status = 'going') as going_count,
  e.description,
  e.offers_shirts,
  e.cover_path,
  c.title as campaign_title,
  e.hosting,
  e.external_url,
  e.bib_policy,
  e.bib_capacity,
  e.max_guests,
  (select count(*) from public.registrations r
    where r.event_id = e.id and r.needs_bib and r.status <> 'cancelled') as bibs_claimed
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published;

grant select on public.v_public_events to anon, authenticated;
