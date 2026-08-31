-- ============================================================================
-- Santamore — fundraiser pages (Task 5)
-- Apply AFTER 20260829000004_sepa_rail.sql.
--
--  1. donations.is_message_hidden — moderation flag for donor-wall messages.
--     The immutability trigger permits flipping ONLY this flag on approved/
--     refunded rows; money and identity stay frozen (corrections still go in
--     ledger_adjustments).
--  2. Fundraiser owner access: a runner can read their own page in any
--     status and edit its content columns. payment_reference, slug, user_id
--     and event_id are excluded from the update grant — the SEPA matching
--     key is minted server-side at creation and can never be chosen or
--     changed by a client (Task 3 security review). There is NO insert grant:
--     creation goes through the service role, where the reference is minted.
--  3. Publish gate: status='active' requires photo, goal and a real story
--     (brief §10 — "onboarding refuses to publish an empty page"), enforced
--     in the database, not just the form. Plus: a fundraiser's team must
--     belong to the fundraiser's event.
--  4. Team captain access, same shape as fundraiser owner access.
--  5. Public views: fundraiser totals gain the payment reference and event/
--     team context; new donor wall, team totals, team leaderboard and
--     published-events views. Donor wall deliberately projects `message` —
--     public and moderatable per brief §9.7 — masked when hidden.
--  6. Storage bucket for fundraiser photos: public read via CDN URL,
--     authenticated writes confined to the uploader's own folder.
-- ============================================================================

-- 1 ─ donor-wall message moderation flag
alter table public.donations
  add column is_message_hidden boolean not null default false;

-- Approved donations stay immutable. Permitted changes are now exactly:
--   a) approved -> refunded, nothing else touched (as before), and
--   b) flipping is_message_hidden alone (message moderation, staff-only via
--      the donations_staff_update policy) on approved/refunded rows.
create or replace function public.enforce_donation_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('approved', 'refunded') then
      raise exception 'donations: % rows are immutable and cannot be deleted', old.status;
    end if;
    return old;
  end if;

  if old.status in ('approved', 'refunded') then
    -- net_cents is excluded: it is a generated column, and in a BEFORE
    -- trigger NEW does not carry its computed value yet.
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

-- 2 ─ fundraiser owner access (select grant to authenticated exists from 0004)
create policy fundraisers_select_own on public.fundraisers
  for select to authenticated
  using (user_id = (select auth.uid()));

grant update (title, story, goal_cents, photo_path, status, team_id)
  on public.fundraisers to authenticated;

create policy fundraisers_update_own on public.fundraisers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index fundraisers_user_idx on public.fundraisers (user_id);

-- 3 ─ publish gate + team/event integrity, on every insert and update so the
-- service role is held to the same rules as owners
create or replace function public.enforce_fundraiser_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' then
    if new.photo_path is null
       or coalesce(new.goal_cents, 0) <= 0
       or length(btrim(coalesce(new.story, ''))) < 80 then
      raise exception 'fundraisers: a page cannot be active without a photo, a goal and a story (brief §10)';
    end if;
  end if;

  if new.team_id is not null and not exists (
    select 1 from public.teams t
    where t.id = new.team_id and t.event_id = new.event_id
  ) then
    raise exception 'fundraisers: team % belongs to a different event', new.team_id;
  end if;

  return new;
end;
$$;

create trigger trg_fundraisers_integrity
  before insert or update on public.fundraisers
  for each row execute function public.enforce_fundraiser_integrity();

-- 4 ─ team captain access. Creation is service-role only (the captain is set
-- server-side from the session); slug and event stay immutable to clients.
grant select on public.teams to authenticated;

create policy teams_select_own on public.teams
  for select to authenticated
  using (captain_id = (select auth.uid()) or public.is_staff());

grant update (name, goal_cents) on public.teams to authenticated;

create policy teams_update_captain on public.teams
  for update to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid()));

create index teams_captain_idx on public.teams (captain_id);

-- 5a ─ fundraiser totals: append the public payment reference (it appears on
-- donate pages and bank statements by design) and event/campaign/team context
create or replace view public.v_fundraiser_totals
  with (security_invoker = off, security_barrier = on) as
select
  f.id,
  f.slug,
  f.title,
  f.story,
  f.photo_path,
  f.goal_cents,
  f.event_id,
  f.team_id,
  coalesce(sum(d.net_cents) filter (where d.status in ('approved', 'refunded')), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              where dd.fundraiser_id = f.id
                and dd.status in ('approved', 'refunded')), 0) as raised_cents,
  count(distinct coalesce(lower(d.donor_email), d.id::text))
    filter (where d.status in ('approved', 'refunded')) as donor_count,
  f.payment_reference,
  f.created_at,
  e.slug as event_slug,
  e.name as event_name,
  c.slug as campaign_slug,
  t.slug as team_slug,
  t.name as team_name
from public.fundraisers f
join public.events e on e.id = f.event_id
left join public.campaigns c on c.id = e.campaign_id and c.is_public
left join public.teams t on t.id = f.team_id
left join public.donations d on d.fundraiser_id = f.id
where f.status = 'active'
group by f.id, e.id, c.id, t.id;

-- 5b ─ donor wall: display name (masked when anonymous), amount, message
-- (masked when moderated away). Active pages only; approved/refunded rows,
-- matching how raised_cents treats the append-only ledger.
create view public.v_public_donor_wall
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  f.slug as fundraiser_slug,
  case when d.is_anonymous then null
       else coalesce(d.display_name, d.donor_name) end as display_name,
  d.net_cents as amount_cents,
  case when d.is_message_hidden then null else d.message end as message,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.approved_at
from public.donations d
join public.fundraisers f on f.id = d.fundraiser_id
where d.status in ('approved', 'refunded')
  and f.status = 'active';

-- 5c ─ team totals aggregate ACTIVE member pages (v_fundraiser_totals is
-- already active-only). donor_count can count one donor twice across two
-- members; it is a display count, not an accounting figure.
create view public.v_team_totals
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
  coalesce(sum(ft.donor_count), 0) as donor_count
from public.teams t
join public.events e on e.id = t.event_id
left join public.v_fundraiser_totals ft on ft.team_id = t.id
group by t.id, e.id;

create view public.v_leaderboard_teams
  with (security_invoker = off, security_barrier = on) as
select
  tt.*,
  rank() over (partition by tt.event_id order by tt.raised_cents desc) as rank
from public.v_team_totals tt
where tt.member_count > 0;

-- 5d ─ published events, for the event page, leaderboard and signup picker
create view public.v_public_events
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
  c.slug as campaign_slug
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published;

grant select on public.v_public_donor_wall,
                public.v_team_totals,
                public.v_leaderboard_teams,
                public.v_public_events
  to anon, authenticated;

-- 6 ─ fundraiser photos: public-read bucket, writes confined to the
-- uploader's own {user_id}/ folder. The 5 MB limit is a ceiling; the client
-- downscales before upload and pages serve resized variants via next/image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fundraiser-photos', 'fundraiser-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy fundraiser_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fundraiser-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy fundraiser_photos_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'fundraiser-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fundraiser-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy fundraiser_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'fundraiser-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
