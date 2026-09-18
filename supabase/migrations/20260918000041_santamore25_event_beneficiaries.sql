-- ============================================================================
-- Santamore — the Santamore 25 event, and the beneficiaries' stories
-- Apply AFTER 20260918000040_team_profiles_site_pages.sql. Re-runnable.
--
-- 1. Photos live with events. The first Santamore, December 2025, becomes
--    a published past event on the 'santamore-25' cause so its photos can
--    be attached. Its date is the cause's placeholder start date until the
--    team sets the real one in the event form (docs/PLACEHOLDERS.md).
-- 2. Beneficiaries get their own record: name, photo, website, a story in
--    each language, optionally the cause that reached them.
-- ============================================================================

-- 1 ─ the Santamore 25 event ----------------------------------------------------
do $$
declare
  v_campaign uuid;
  v_chapter  uuid;
  v_starts   timestamptz;
begin
  select id, chapter_id, starts_at into v_campaign, v_chapter, v_starts
    from public.campaigns where slug = 'santamore-25';
  if v_campaign is null then
    raise notice 'santamore-25 cause missing (apply 0032 first); event not seeded';
    return;
  end if;
  if not exists (select 1 from public.events where slug = 'santamore-25') then
    insert into public.events (campaign_id, chapter_id, name, slug, starts_at, venue, kind, hosting, is_published, description)
    values (v_campaign, v_chapter, 'Santamore 25', 'santamore-25', v_starts, 'Tivat', 'race', 'own', true,
            'The first Santamore: a run and a walk through Tivat in red suits, December 2025. Every cent raised went to Dnevni Centar Tivat and Dječji dom „Mladost“ Bijela.');
  end if;
end $$;

-- 2 ─ beneficiaries -------------------------------------------------------------
create table if not exists public.beneficiaries (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  website      text,
  photo_path   text,
  -- one story per language, {"me": "...", "en": "...", "ru": "..."}, Markdown
  story        jsonb not null default '{}'::jsonb,
  campaign_id  uuid references public.campaigns (id) on delete set null,
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.beneficiaries enable row level security;
grant select, insert, update, delete on public.beneficiaries to authenticated;
drop policy if exists beneficiaries_staff_all on public.beneficiaries;
create policy beneficiaries_staff_all on public.beneficiaries
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace view public.v_public_beneficiaries
  with (security_invoker = off, security_barrier = on) as
select b.id, b.slug, b.name, b.website, b.photo_path, b.story, b.sort_order,
       c.slug as campaign_slug, c.title as campaign_title
from public.beneficiaries b
left join public.campaigns c on c.id = b.campaign_id
where b.is_published;
grant select on public.v_public_beneficiaries to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('beneficiary-photos', 'beneficiary-photos', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists beneficiary_photos_staff_insert on storage.objects;
create policy beneficiary_photos_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'beneficiary-photos' and public.is_staff());
drop policy if exists beneficiary_photos_staff_update on storage.objects;
create policy beneficiary_photos_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'beneficiary-photos' and public.is_staff())
  with check (bucket_id = 'beneficiary-photos' and public.is_staff());
drop policy if exists beneficiary_photos_staff_delete on storage.objects;
create policy beneficiary_photos_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'beneficiary-photos' and public.is_staff());
