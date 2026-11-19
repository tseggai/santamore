-- ============================================================================
-- Santamore — prospects: who we ask for support, and where each ask stands
-- Apply AFTER 20261118000087_reward_live_with_published_challenge.sql. Re-runnable.
--
-- The outreach list behind the sponsors: organisations we want to support
-- us, of five kinds (a sponsor, help in kind, a partner, the media, a
-- funder), each with its published contact, the stage of the ask, when to
-- follow up, and a log of what was sent. A prospect that says yes becomes a
-- supporter (supporters, 0018) and keeps the link.
--
-- Staff only, nothing public: the rows carry named business contacts taken
-- from published sources (the sources are kept on the row), and the list
-- of whom we approach is internal.
-- ============================================================================

create table if not exists public.prospects (
  id                 uuid primary key default gen_random_uuid(),
  -- The researched entry the row was developed from (content/prospects/
  -- catalogue.json); null when typed in by hand. One row per entry.
  catalogue_key      text unique,
  kind               text not null check (kind in ('sponsor', 'in_kind', 'partner', 'media', 'funder')),
  name               text not null check (length(name) between 1 and 200),
  sector             text not null,
  area               text not null check (area in ('tivat', 'boka', 'coast', 'national', 'international')),
  town               text,
  website            text,
  email              text,
  phone              text,
  instagram          text,
  contact_name       text,
  contact_role       text,
  contact_email      text,
  contact_phone      text,
  tier_fit           text check (tier_fit is null or tier_fit in ('core', 'title', 'gold', 'silver', 'local', 'inkind')),
  why                text,
  sources            text[] not null default '{}',
  stage              text not null default 'new' check (stage in ('new', 'contacted', 'engaged', 'pledged', 'won', 'declined')),
  next_follow_up     date,
  last_contacted_at  timestamptz,
  notes              text,
  supporter_id       uuid references public.supporters (id) on delete set null,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.prospects is 'Organisations we ask for support and where each ask stands. Staff only: named business contacts from published sources.';

create index if not exists prospects_stage_idx on public.prospects (stage);
create index if not exists prospects_follow_up_idx on public.prospects (next_follow_up) where next_follow_up is not null;

alter table public.prospects enable row level security;
revoke all on public.prospects from public, anon;
grant select, insert, update, delete on public.prospects to authenticated;
drop policy if exists prospects_staff_all on public.prospects;
create policy prospects_staff_all on public.prospects
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- What was sent, noted or changed on a prospect, newest first in the console.
create table if not exists public.prospect_activities (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid not null references public.prospects (id) on delete cascade,
  kind         text not null check (kind in ('message', 'note', 'stage')),
  channel      text check (channel is null or channel in ('whatsapp', 'email', 'instagram', 'copy')),
  template     text,
  lang         text,
  body         text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
comment on table public.prospect_activities is 'The log of an ask: messages opened for sending, notes, stage changes. Staff only.';

create index if not exists prospect_activities_prospect_idx on public.prospect_activities (prospect_id, created_at desc);

alter table public.prospect_activities enable row level security;
revoke all on public.prospect_activities from public, anon;
grant select, insert, delete on public.prospect_activities to authenticated;
drop policy if exists prospect_activities_staff_all on public.prospect_activities;
create policy prospect_activities_staff_all on public.prospect_activities
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
