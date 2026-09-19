-- ============================================================================
-- Santamore — is_admin() is back, and means admin only
-- Apply AFTER 20260919000046_event_registration_mode.sql. Re-runnable.
--
-- 0002 renamed the first is_admin() to is_staff() (admin or chapter lead).
-- set_member_profile (0040) and delete_event (0045) call is_admin() for
-- the actions only an admin may take: access levels and deletion. They
-- failed with "function public.is_admin() does not exist". This defines
-- it: true for the admin role alone, stricter than is_staff().
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

notify pgrst, 'reload schema';
