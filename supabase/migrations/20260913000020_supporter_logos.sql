-- ============================================================================
-- Santamore — supporter logos, and the public Partners page's data
-- Apply AFTER 20260913000019_staff_members.sql. Re-runnable.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supporter-logos', 'supporter-logos', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists supporter_logos_staff_insert on storage.objects;
create policy supporter_logos_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'supporter-logos' and public.is_staff());
drop policy if exists supporter_logos_staff_update on storage.objects;
create policy supporter_logos_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'supporter-logos' and public.is_staff())
  with check (bucket_id = 'supporter-logos' and public.is_staff());
drop policy if exists supporter_logos_staff_delete on storage.objects;
create policy supporter_logos_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'supporter-logos' and public.is_staff());

create or replace view public.v_public_sponsors
  with (security_invoker = off, security_barrier = on) as
select
  s.id,
  s.name,
  s.tier,
  s.is_in_kind,
  s.logo_path,
  s.website,
  c.slug as campaign_slug,
  e.slug as event_slug,
  (select su.slug from public.supporters su where su.id = s.supporter_id) as supporter_slug
from public.sponsors s
left join public.campaigns c on c.id = s.campaign_id
left join public.events e on e.id = s.event_id
where s.status in ('signed', 'active');

grant select on public.v_public_sponsors to anon, authenticated;
