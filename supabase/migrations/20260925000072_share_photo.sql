-- ============================================================================
-- Santamore — the social share photo
-- Apply AFTER 20260924000071_entry_fees_fund.sql. Re-runnable.
--
-- share_photo: the picture social networks show when any page without a
-- card of its own (fundraiser pages and the ledger draw their own) is
-- shared. A path in the gallery bucket, chosen in Settings → Photos.
-- Same two whitelisted functions as home_photo (0065).
-- ============================================================================

create or replace function public.public_setting(p_key text)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select value from public.site_settings
   where key = p_key and p_key in ('home_photo', 'share_photo');
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
  if p_key not in ('home_photo', 'share_photo') then
    raise exception 'set_site_setting: unknown key %', p_key using errcode = '22023';
  end if;
  insert into public.site_settings (key, value, updated_at) values (p_key, coalesce(p_value, 'null'::jsonb), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;
revoke all on function public.set_site_setting(text, jsonb) from public;
grant execute on function public.set_site_setting(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
