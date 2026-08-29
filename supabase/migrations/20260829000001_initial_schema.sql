-- ============================================================================
-- Santamore — initial schema (Task 2)
-- Source of truth: docs/BUILD-BRIEF.md §6.
--
-- Design notes:
--  * Money is ALWAYS integer cents (bigint, non-negative). ledger_adjustments
--    is the single signed exception: a correction row carries its direction.
--  * donations.net_cents is a stored generated column — computed at write
--    time by Postgres, never recomputed by application code.
--  * Approved donations and published disbursements are immutable, enforced
--    by triggers here, not by application code.
--  * RLS is enabled on every table AND table grants are revoked from anon/
--    authenticated, so anonymous probes fail loudly (42501) instead of
--    returning empty sets. Public data flows only through the v_public_*
--    views below, which run with owner rights (security_invoker = off) and
--    expose only safe columns. Supabase's advisor flags definer-style views;
--    here that is the deliberate design required by the brief.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  locale      text not null default 'me' check (locale in ('me', 'en', 'ru')),
  role        text not null default 'member'
              check (role in ('member', 'chapter_lead', 'admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies. SECURITY DEFINER so it can read profiles
-- regardless of the caller's own grants.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'chapter_lead')
  );
$$;

-- ---------------------------------------------------------------------------
-- chapters
-- ---------------------------------------------------------------------------
create table public.chapters (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  municipality        text,
  is_active           boolean not null default true,
  split_local_bp      integer not null check (split_local_bp between 0 and 10000),
  split_national_bp   integer not null check (split_national_bp between 0 and 10000),
  split_solidarity_bp integer not null check (split_solidarity_bp between 0 and 10000),
  constraint chapters_split_sums_to_10000
    check (split_local_bp + split_national_bp + split_solidarity_bp = 10000)
);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id                  uuid primary key default gen_random_uuid(),
  chapter_id          uuid not null references public.chapters (id),
  title               text not null,
  slug                text not null unique,
  description         text,
  goal_cents          bigint check (goal_cents >= 0),
  starts_at           timestamptz,
  ends_at             timestamptz,
  beneficiary_summary text,
  is_public           boolean not null default false,
  suggested_amounts   jsonb
);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id                      uuid primary key default gen_random_uuid(),
  campaign_id             uuid references public.campaigns (id),
  chapter_id              uuid not null references public.chapters (id),
  name                    text not null,
  slug                    text not null unique,
  starts_at               timestamptz,
  venue                   text,
  capacity                integer check (capacity >= 0),
  registration_opens_at   timestamptz,
  registration_closes_at  timestamptz,
  price_tiers             jsonb,
  distances               jsonb,
  is_published            boolean not null default false
);

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id),
  name        text not null,
  slug        text not null,
  captain_id  uuid references public.profiles (id),
  goal_cents  bigint check (goal_cents >= 0),
  created_at  timestamptz not null default now(),
  unique (event_id, slug)
);

-- ---------------------------------------------------------------------------
-- fundraisers
-- ---------------------------------------------------------------------------
create table public.fundraisers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id),
  event_id           uuid not null references public.events (id),
  team_id            uuid references public.teams (id),
  slug               text not null unique,
  title              text not null,
  story              text,
  goal_cents         bigint check (goal_cents >= 0),
  photo_path         text,
  payment_reference  text not null unique
                     check (payment_reference ~ '^SM-[0-9]{4}-[0-9]{4}$'),
  status             text not null default 'draft'
                     check (status in ('draft', 'active', 'hidden')),
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- registrations
-- ---------------------------------------------------------------------------
create table public.registrations (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events (id),
  user_id            uuid not null references public.profiles (id),
  distance           text,
  shirt_size         text,
  waiver_signed_at   timestamptz,
  waiver_version     text,
  bib_number         text,
  amount_paid_cents  bigint not null default 0 check (amount_paid_cents >= 0),
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'cancelled')),
  unique (event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- subscriptions (monthly giving, Card on File — Task 4)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id),
  donor_email     text not null,
  amount_cents    bigint not null check (amount_cents > 0),
  pan_token       text,
  interval        text not null default 'monthly' check (interval in ('monthly')),
  next_charge_on  date,
  status          text not null default 'active'
                  check (status in ('active', 'paused', 'past_due', 'canceled')),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- donations
-- ---------------------------------------------------------------------------
create table public.donations (
  id                     uuid primary key default gen_random_uuid(),
  amount_cents           bigint not null check (amount_cents > 0),
  fee_covered_cents      bigint not null default 0 check (fee_covered_cents >= 0),
  -- Computed at write time; the ledger never recomputes fees.
  net_cents              bigint not null
                         generated always as (amount_cents - fee_covered_cents) stored,
  fundraiser_id          uuid references public.fundraisers (id),
  campaign_id            uuid references public.campaigns (id),
  chapter_id             uuid references public.chapters (id),
  event_id               uuid references public.events (id),
  donor_name             text,
  donor_email            text,
  display_name           text,
  is_anonymous           boolean not null default false,
  message                text,
  is_recurring           boolean not null default false,
  subscription_id        uuid references public.subscriptions (id),
  rail                   text not null check (rail in ('card', 'sepa', 'cash', 'other')),
  provider               text check (provider in ('monri')),
  provider_order_number  text unique,
  provider_transaction_id text,
  pan_token              text,
  status                 text not null default 'pending'
                         check (status in ('pending', 'approved', 'declined', 'refunded')),
  created_at             timestamptz not null default now(),
  approved_at            timestamptz,
  constraint donations_fee_not_above_amount check (amount_cents >= fee_covered_cents),
  constraint donations_have_a_target check (fundraiser_id is not null or campaign_id is not null)
);

-- Approved donations are immutable. The ONLY permitted change afterwards is
-- the single status transition approved -> refunded with every other column
-- untouched. Corrections are new ledger_adjustments rows.
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

  if old.status = 'refunded' then
    raise exception 'donations: refunded rows are immutable';
  end if;

  if old.status = 'approved' then
    -- net_cents is excluded: it is a generated column, and in a BEFORE
    -- trigger NEW does not carry its computed value yet.
    if new.status = 'refunded'
       and to_jsonb(new) - 'status' - 'net_cents'
         = to_jsonb(old) - 'status' - 'net_cents' then
      return new;
    end if;
    raise exception 'donations: approved rows are immutable (only approved -> refunded, changing nothing else, is allowed; corrections go in ledger_adjustments)';
  end if;

  return new;
end;
$$;

create trigger trg_donations_immutability
  before update or delete on public.donations
  for each row execute function public.enforce_donation_immutability();

-- ---------------------------------------------------------------------------
-- disbursements
-- ---------------------------------------------------------------------------
create table public.disbursements (
  id                       uuid primary key default gen_random_uuid(),
  chapter_id               uuid not null references public.chapters (id),
  campaign_id              uuid references public.campaigns (id),
  beneficiary_label        text not null,
  beneficiary_private_note text,
  category                 text,
  amount_cents             bigint not null check (amount_cents > 0),
  decided_at               timestamptz,
  paid_at                  timestamptz,
  published_at             timestamptz,
  documentation_paths      text[] not null default '{}',
  committee_decision_ref   text
);

-- Published disbursements are immutable too — the public ledger is
-- append-only in both directions. Corrections are ledger_adjustments rows.
create or replace function public.enforce_disbursement_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null then
    raise exception 'disbursements: published rows are immutable (corrections go in ledger_adjustments)';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_disbursements_immutability
  before update or delete on public.disbursements
  for each row execute function public.enforce_disbursement_immutability();

-- ---------------------------------------------------------------------------
-- ledger_adjustments (append-only corrections; amount is SIGNED)
-- ---------------------------------------------------------------------------
create table public.ledger_adjustments (
  id                        uuid primary key default gen_random_uuid(),
  references_donation_id    uuid references public.donations (id),
  references_disbursement_id uuid references public.disbursements (id),
  amount_cents              bigint not null check (amount_cents <> 0),
  reason                    text not null,
  created_by                uuid references public.profiles (id),
  created_at                timestamptz not null default now(),
  constraint adjustments_reference_something
    check (references_donation_id is not null or references_disbursement_id is not null)
);

-- ---------------------------------------------------------------------------
-- sponsors
-- ---------------------------------------------------------------------------
create table public.sponsors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  tier           text,
  chapter_id     uuid references public.chapters (id),
  amount_cents   bigint check (amount_cents >= 0),
  is_in_kind     boolean not null default false,
  logo_path      text,
  website        text,
  contract_path  text,
  deliverables   jsonb,
  status         text not null default 'prospect'
                 check (status in ('prospect', 'negotiating', 'signed', 'active', 'ended'))
);

-- ---------------------------------------------------------------------------
-- beneficiary_applications
-- ---------------------------------------------------------------------------
create table public.beneficiary_applications (
  id                      uuid primary key default gen_random_uuid(),
  applicant_name          text not null,
  contact                 text not null,
  category                text,
  amount_requested_cents  bigint check (amount_requested_cents >= 0),
  description             text,
  attachments             text[] not null default '{}',
  status                  text not null default 'received'
                          check (status in ('received', 'in_review', 'approved', 'declined')),
  chapter_id              uuid references public.chapters (id),
  created_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- gallery_items
-- ---------------------------------------------------------------------------
create table public.gallery_items (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references public.events (id),
  storage_path  text not null,
  caption       text,
  credit        text,
  sort_order    integer not null default 0,
  is_published  boolean not null default false
);

-- ---------------------------------------------------------------------------
-- posts (news)
-- ---------------------------------------------------------------------------
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  title         text not null,
  excerpt       text,
  body_md       text,
  cover_path    text,
  published_at  timestamptz,
  locale        text not null default 'me' check (locale in ('me', 'en', 'ru')),
  unique (locale, slug)
);

-- ---------------------------------------------------------------------------
-- ask_list_items (Phase 2)
-- ---------------------------------------------------------------------------
create table public.ask_list_items (
  id             uuid primary key default gen_random_uuid(),
  fundraiser_id  uuid not null references public.fundraisers (id),
  contact_label  text not null,
  status         text not null default 'listed'
                 check (status in ('listed', 'asked', 'gave')),
  asked_at       timestamptz,
  gave_at        timestamptz
);

-- ---------------------------------------------------------------------------
-- webhook_events (service-role only; handlers must be idempotent)
-- ---------------------------------------------------------------------------
create table public.webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null,
  provider_event_id  text not null unique,
  payload            jsonb not null,
  signature_valid    boolean not null,
  processed_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes for the paths the views and admin queries take
-- ---------------------------------------------------------------------------
create index donations_fundraiser_status_idx on public.donations (fundraiser_id, status);
create index donations_campaign_status_idx   on public.donations (campaign_id, status);
create index donations_chapter_status_idx    on public.donations (chapter_id, status);
create index donations_approved_at_idx       on public.donations (approved_at desc)
  where status = 'approved';
create index disbursements_published_idx     on public.disbursements (published_at desc)
  where published_at is not null;
create index fundraisers_event_idx           on public.fundraisers (event_id);
create index fundraisers_team_idx            on public.fundraisers (team_id);
create index gallery_items_event_idx         on public.gallery_items (event_id);
create index ledger_adjustments_donation_idx on public.ledger_adjustments (references_donation_id);
create index ledger_adjustments_disbursement_idx
  on public.ledger_adjustments (references_disbursement_id);

-- ---------------------------------------------------------------------------
-- RLS: enable everywhere, revoke direct table access from client roles.
-- With no grants and no policies, anon/authenticated get a loud 42501.
-- ---------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.chapters                 enable row level security;
alter table public.campaigns                enable row level security;
alter table public.events                   enable row level security;
alter table public.teams                    enable row level security;
alter table public.fundraisers              enable row level security;
alter table public.registrations            enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.donations                enable row level security;
alter table public.disbursements            enable row level security;
alter table public.ledger_adjustments       enable row level security;
alter table public.sponsors                 enable row level security;
alter table public.beneficiary_applications enable row level security;
alter table public.gallery_items            enable row level security;
alter table public.posts                    enable row level security;
alter table public.ask_list_items           enable row level security;
alter table public.webhook_events           enable row level security;

revoke all on all tables in schema public from anon, authenticated;

-- Minimal Task-2 policies: a signed-in user can read and update their own
-- profile. Everything else gets policies in the task that builds on it.
grant select, update on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = 'member');

-- ---------------------------------------------------------------------------
-- Public views — the ONLY read surface for anonymous users.
-- security_invoker = off: they run with owner rights, bypassing table RLS,
-- and expose exactly the safe columns. This is the brief's intended design.
-- ---------------------------------------------------------------------------
create view public.v_public_ledger_in
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.net_cents as amount_cents,
  case when d.is_anonymous then null
       else coalesce(d.display_name, d.donor_name) end as display_name,
  f.slug  as fundraiser_slug,
  f.title as fundraiser_title,
  c.slug  as campaign_slug,
  c.title as campaign_title,
  ch.slug as chapter_slug,
  d.rail
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
left join public.campaigns   c on c.id = d.campaign_id
left join public.chapters   ch on ch.id = d.chapter_id
where d.status = 'approved';

create view public.v_public_ledger_out
  with (security_invoker = off, security_barrier = on) as
select
  db.id,
  (coalesce(db.paid_at, db.published_at))::date as entry_date,
  db.amount_cents,
  db.beneficiary_label,
  db.category,
  ch.slug as chapter_slug,
  db.documentation_paths,
  db.committee_decision_ref
from public.disbursements db
join public.chapters ch on ch.id = db.chapter_id
where db.published_at is not null;

create view public.v_fundraiser_totals
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
  coalesce(sum(d.net_cents) filter (where d.status = 'approved'), 0) as raised_cents,
  count(d.id) filter (where d.status = 'approved') as donor_count
from public.fundraisers f
left join public.donations d on d.fundraiser_id = f.id
where f.status = 'active'
group by f.id;

create view public.v_chapter_totals
  with (security_invoker = off, security_barrier = on) as
select
  ch.id,
  ch.name,
  ch.slug,
  coalesce((select sum(d.net_cents) from public.donations d
            where d.chapter_id = ch.id and d.status = 'approved'), 0) as raised_cents,
  coalesce((select sum(db.amount_cents) from public.disbursements db
            where db.chapter_id = ch.id and db.published_at is not null), 0) as disbursed_cents
from public.chapters ch
where ch.is_active;

create view public.v_leaderboard
  with (security_invoker = off, security_barrier = on) as
select
  ft.id,
  ft.slug,
  ft.title,
  ft.photo_path,
  ft.event_id,
  ft.team_id,
  ft.raised_cents,
  ft.donor_count,
  rank() over (partition by ft.event_id order by ft.raised_cents desc) as rank
from public.v_fundraiser_totals ft;

grant select on public.v_public_ledger_in,
                public.v_public_ledger_out,
                public.v_fundraiser_totals,
                public.v_chapter_totals,
                public.v_leaderboard
  to anon, authenticated;
