-- ============================================================================
-- Santamore — meeting images: pictures in an agenda or the minutes
-- Apply AFTER 20261022000084_meetings.sql. Re-runnable.
--
-- A private bucket: the agenda and the minutes are for members, so the
-- pictures in them are too. Staff upload (the console downsizes to JPEG
-- first); every signed-in member reads, through short-lived signed URLs the
-- sheet creates when it renders. The Markdown keeps the object's path, not
-- a URL, so nothing in the text expires. A meeting's pictures live under
-- its id (or the new-<uuid> folder the editor used before the first save).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meeting-images', 'meeting-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists meeting_images_members_read on storage.objects;
create policy meeting_images_members_read on storage.objects
  for select to authenticated
  using (bucket_id = 'meeting-images');

drop policy if exists meeting_images_staff_insert on storage.objects;
create policy meeting_images_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meeting-images' and public.is_staff());

drop policy if exists meeting_images_staff_update on storage.objects;
create policy meeting_images_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'meeting-images' and public.is_staff())
  with check (bucket_id = 'meeting-images' and public.is_staff());

drop policy if exists meeting_images_staff_delete on storage.objects;
create policy meeting_images_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'meeting-images' and public.is_staff());
