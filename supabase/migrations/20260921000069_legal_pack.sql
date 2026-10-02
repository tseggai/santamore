-- ============================================================================
-- Santamore — legal pack: the registration forms and policy drafts the
-- founders complete together in the console (/admin/registracija).
-- Apply AFTER 20260920000068_donors_by_year.sql. Re-runnable.
--
-- One row per document part: 'fields' (the shared blanks of the five
-- Ministry forms, in both languages), 'checks' (the founding checklist),
-- 'draft:<id>' (an edited policy draft). Staff read and write; nobody
-- else sees it. Nothing here is money and nothing here is public.
-- ============================================================================
create table if not exists public.legal_pack (
  key        text primary key check (key ~ '^(fields|checks|draft:[a-z0-9-]{1,60})$'),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.legal_pack enable row level security;
revoke all on public.legal_pack from public, anon;
grant select, insert, update on public.legal_pack to authenticated;

drop policy if exists legal_pack_staff on public.legal_pack;
create policy legal_pack_staff on public.legal_pack
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
