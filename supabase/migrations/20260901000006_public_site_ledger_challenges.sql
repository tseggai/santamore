-- ============================================================================
-- Santamore — Tasks 6+7: public site, ledger views, admin, challenge-ready
-- Apply AFTER 20260831000005_fundraiser_pages.sql.
--
--  1. Custom challenges (owner request): an event can be a 'challenge' ranked
--     by a configurable metric — distance, moving time, activity count or
--     elevation. Activities are the raw facts; 'manual' entries work day one,
--     'strava' is the reserved source for the future OAuth/webhook task
--     (external_id makes that sync idempotent, no schema change needed).
--  2. Registrations become payable over SEPA: each mints its own payment
--     reference (entry fees reconcile in the same CSV queue but land in
--     registrations/Operations Fund — never in donations/Impact Fund).
--     The cross-table reference uniqueness trigger now spans fundraisers,
--     campaigns AND registrations.
--  3. inbound_messages: one staff-only table behind the contact, volunteer,
--     partner and newsletter forms (service-role insert only).
--  4. Content publishing: staff write policies + public views for posts and
--     gallery, with their storage buckets.
--  5. Ledger views for /transparentnost: the reconciliation summary and the
--     Operations Fund total (sponsors + entry fees), keeping the two funds
--     visibly unmixed.
-- ============================================================================

-- 1 ─ challenge events -------------------------------------------------------
alter table public.events
  add column kind text not null default 'race'
    check (kind in ('race', 'challenge')),
  add column challenge_metric text
    check (challenge_metric in
           ('distance_m', 'moving_time_s', 'activity_count', 'elevation_m')),
  add column ends_at timestamptz;

alter table public.events
  add constraint events_challenge_has_metric
  check (kind <> 'challenge' or challenge_metric is not null);

create table public.activities (
  id             uuid primary key default gen_random_uuid(),
  fundraiser_id  uuid not null references public.fundraisers (id) on delete cascade,
  source         text not null default 'manual'
                 check (source in ('manual', 'strava')),
  external_id    text, -- provider activity id; idempotency key for future sync
  sport_type     text,
  started_at     timestamptz not null,
  distance_m     integer not null default 0 check (distance_m >= 0),
  moving_time_s  integer not null default 0 check (moving_time_s >= 0),
  elevation_m    integer not null default 0 check (elevation_m >= 0),
  created_at     timestamptz not null default now(),
  unique (source, external_id)
);

alter table public.activities enable row level security;

create index activities_fundraiser_idx on public.activities (fundraiser_id);

grant select, insert, delete on public.activities to authenticated;

-- The page owner logs and prunes their own entries; staff see everything.
create policy activities_owner_select on public.activities
  for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.fundraisers f
               where f.id = fundraiser_id and f.user_id = (select auth.uid()))
  );

create policy activities_owner_insert on public.activities
  for insert to authenticated
  with check (
    source = 'manual'
    and exists (select 1 from public.fundraisers f
                where f.id = fundraiser_id and f.user_id = (select auth.uid()))
  );

create policy activities_owner_delete on public.activities
  for delete to authenticated
  using (
    source = 'manual'
    and exists (select 1 from public.fundraisers f
                where f.id = fundraiser_id and f.user_id = (select auth.uid()))
  );

-- Aggregates for ACTIVE pages only; the leaderboard ranks by whichever
-- metric the event declares.
create view public.v_activity_totals
  with (security_invoker = off, security_barrier = on) as
select
  f.id,
  f.slug,
  f.title,
  f.event_id,
  count(a.id)                          as activity_count,
  coalesce(sum(a.distance_m), 0)       as distance_m,
  coalesce(sum(a.moving_time_s), 0)    as moving_time_s,
  coalesce(sum(a.elevation_m), 0)      as elevation_m,
  max(a.started_at)                    as last_activity_at
from public.fundraisers f
left join public.activities a on a.fundraiser_id = f.id
where f.status = 'active'
group by f.id;

grant select on public.v_activity_totals to anon, authenticated;

-- 2 ─ payable registrations --------------------------------------------------
alter table public.registrations
  add column payment_reference text unique
    check (payment_reference ~ '^SM-(0[1-9]|1[0-2])[0-9]{2}-[0-9]{4}$');

-- References are the SEPA matching key across ALL three carriers now.
create or replace function public.enforce_payment_reference_global_uniqueness()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name <> 'fundraisers' and exists (
    select 1 from public.fundraisers f
    where f.payment_reference = new.payment_reference
  ) then
    raise exception 'payment_reference % is already used by a fundraiser',
      new.payment_reference;
  end if;
  if tg_table_name <> 'campaigns' and exists (
    select 1 from public.campaigns c
    where c.payment_reference = new.payment_reference
  ) then
    raise exception 'payment_reference % is already used by a campaign',
      new.payment_reference;
  end if;
  if tg_table_name <> 'registrations' and exists (
    select 1 from public.registrations r
    where r.payment_reference = new.payment_reference
  ) then
    raise exception 'payment_reference % is already used by a registration',
      new.payment_reference;
  end if;
  return new;
end;
$$;

create trigger trg_registrations_reference_globally_unique
  before insert or update of payment_reference on public.registrations
  for each row when (new.payment_reference is not null)
  execute function public.enforce_payment_reference_global_uniqueness();

grant select, update on public.registrations to authenticated;

create policy registrations_select_own on public.registrations
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

-- Staff run the queue: mark paid, assign bibs; inserts stay service-role
-- (the reference is minted server-side, like fundraiser pages).
create policy registrations_staff_update on public.registrations
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create index registrations_event_status_idx on public.registrations (event_id, status);

-- 3 ─ inbound messages -------------------------------------------------------
create table public.inbound_messages (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null
              check (kind in ('contact', 'volunteer', 'partner', 'newsletter')),
  name        text,
  email       text not null,
  phone       text,
  message     text,
  locale      text check (locale in ('me', 'en', 'ru')),
  created_at  timestamptz not null default now()
);

alter table public.inbound_messages enable row level security;

grant select on public.inbound_messages to authenticated;

create policy inbound_messages_staff_select on public.inbound_messages
  for select to authenticated
  using (public.is_staff());

-- 4 ─ content publishing -----------------------------------------------------
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.gallery_items to authenticated;

create policy posts_staff_all on public.posts
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy gallery_staff_all on public.gallery_items
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create view public.v_public_posts
  with (security_invoker = off, security_barrier = on) as
select p.id, p.slug, p.title, p.excerpt, p.body_md, p.cover_path,
       p.published_at, p.locale
from public.posts p
where p.published_at is not null and p.published_at <= now();

create view public.v_public_gallery
  with (security_invoker = off, security_barrier = on) as
select g.id, g.event_id, g.storage_path, g.caption, g.credit, g.sort_order,
       e.slug as event_slug, e.name as event_name, e.starts_at as event_starts_at
from public.gallery_items g
left join public.events e on e.id = g.event_id
where g.is_published;

grant select on public.v_public_posts, public.v_public_gallery
  to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('gallery', 'gallery', true, 8388608,
   array['image/jpeg', 'image/png', 'image/webp']),
  -- Documentation is public BY DESIGN: the ledger links proof for every
  -- disbursement (brief §11). Private notes never enter this bucket.
  ('disbursement-docs', 'disbursement-docs', true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy gallery_staff_write on storage.objects
  for insert to authenticated
  with check (bucket_id in ('gallery', 'disbursement-docs') and public.is_staff());

create policy gallery_staff_update on storage.objects
  for update to authenticated
  using (bucket_id in ('gallery', 'disbursement-docs') and public.is_staff())
  with check (bucket_id in ('gallery', 'disbursement-docs') and public.is_staff());

create policy gallery_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('gallery', 'disbursement-docs') and public.is_staff());

-- 5 ─ ledger views + staff money admin ---------------------------------------
create view public.v_public_ledger_summary
  with (security_invoker = off, security_barrier = on) as
with received as (
  select coalesce(sum(d.net_cents), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.donations dd on dd.id = la.references_donation_id
                   where dd.status in ('approved', 'refunded')), 0) as cents
  from public.donations d
  where d.status in ('approved', 'refunded')
), disbursed as (
  select coalesce(sum(db.amount_cents), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.disbursements dbb
                     on dbb.id = la.references_disbursement_id
                   where dbb.published_at is not null
                     and dbb.paid_at is not null), 0) as cents
  from public.disbursements db
  where db.published_at is not null and db.paid_at is not null
), approved_pending as (
  select coalesce(sum(db.amount_cents), 0) as cents
  from public.disbursements db
  where db.published_at is not null and db.paid_at is null
)
select
  r.cents as received_cents,
  d.cents as disbursed_cents,
  ap.cents as approved_pending_cents,
  r.cents - d.cents - ap.cents as unallocated_cents
from received r, disbursed d, approved_pending ap;

create view public.v_public_ops_total
  with (security_invoker = off, security_barrier = on) as
select
  coalesce((select sum(s.amount_cents) from public.sponsors s
            where s.status in ('signed', 'active')
              and s.is_in_kind = false), 0)
  + coalesce((select sum(r.amount_paid_cents) from public.registrations r
              where r.status = 'confirmed'), 0) as operations_cents;

grant select on public.v_public_ledger_summary, public.v_public_ops_total
  to anon, authenticated;

grant select, insert, update on public.disbursements to authenticated;
grant select, insert, update on public.sponsors to authenticated;
grant select on public.chapters to authenticated;
grant select, insert, update on public.beneficiary_applications to authenticated;

create policy disbursements_staff_select on public.disbursements
  for select to authenticated using (public.is_staff());
create policy disbursements_staff_insert on public.disbursements
  for insert to authenticated with check (public.is_staff());
-- The immutability trigger from 0001/0002 still freezes published rows
-- (except recording paid_at once); this policy only opens the door.
create policy disbursements_staff_update on public.disbursements
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy sponsors_staff_all on public.sponsors
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy chapters_staff_select on public.chapters
  for select to authenticated using (public.is_staff());

create policy beneficiary_applications_staff_select on public.beneficiary_applications
  for select to authenticated using (public.is_staff());
create policy beneficiary_applications_staff_update on public.beneficiary_applications
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
