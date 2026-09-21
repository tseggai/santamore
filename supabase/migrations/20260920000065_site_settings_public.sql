-- ============================================================================
-- Santamore — a few site settings the public site reads
-- Apply AFTER 20260920000064_proposal_media.sql. Re-runnable.
--
-- site_settings (0055) holds the test-mode switch and has no client grants.
-- Two functions open a whitelist of keys: public_setting(key) for the site
-- to read, set_site_setting(key, value) for staff to write. The first key
-- is home_photo: the picture on the landing page's opening slide, a path
-- in the gallery bucket.
-- ============================================================================

create or replace function public.public_setting(p_key text)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select value from public.site_settings
   where key = p_key and p_key in ('home_photo');
$$;
revoke all on function public.public_setting(text) from public;
grant execute on function public.public_setting(text) to anon, authenticated;

create or replace function public.set_site_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_key not in ('home_photo') then
    raise exception 'set_site_setting: unknown key %', p_key using errcode = '22023';
  end if;
  insert into public.site_settings (key, value, updated_at) values (p_key, coalesce(p_value, 'null'::jsonb), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;
revoke all on function public.set_site_setting(text, jsonb) from public;
grant execute on function public.set_site_setting(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
