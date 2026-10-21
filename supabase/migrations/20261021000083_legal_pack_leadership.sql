-- ============================================================================
-- Santamore — the legal pack: leadership rows, and every key the console saves
-- Apply AFTER 20261021000082_director_role.sql. Re-runnable.
--
-- The pack now carries the leadership documents (pay and staffing: figures
-- and personal data). Their rows — the edited draft and its cached
-- translations — are read and written by the Executive Director and the
-- administrators only (is_leadership(), 0082); every other row stays with
-- the staff. The key check is widened to the parts the console has saved
-- since 0069: a form's edited text (form:<id>) and cached translations
-- (i18n:…), which the original pattern did not allow.
-- ============================================================================

alter table public.legal_pack drop constraint if exists legal_pack_key_check;
alter table public.legal_pack
  add constraint legal_pack_key_check
  check (key ~ '^(fields|checks|draft:[a-z0-9-]{1,60}|form:[0-9]{2}[a-z]?|i18n:(labels|guide|form:[0-9]{2}[a-z]?|draft:[a-z0-9-]{1,60}):(ru|tr))$');

-- Which drafts are the leadership's. One place, so the policy and the app
-- (lib/legal-docs.ts audiences) cannot drift far: add an id here when a
-- document's audience in docs/legal/governance/manifest.json becomes
-- leadership.
create or replace function public.legal_pack_is_leadership_key(p_key text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_key ~ '^(i18n:)?draft:(pay-and-staffing-policy)(:(ru|tr))?$';
$$;

create or replace function public.legal_pack_allowed(p_key text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when public.legal_pack_is_leadership_key(p_key) then public.is_leadership()
    else public.is_staff()
  end;
$$;

drop policy if exists legal_pack_staff on public.legal_pack;
create policy legal_pack_staff on public.legal_pack
  for all to authenticated
  using (public.legal_pack_allowed(key))
  with check (public.legal_pack_allowed(key));

notify pgrst, 'reload schema';
