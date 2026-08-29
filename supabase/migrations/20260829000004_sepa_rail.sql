-- ============================================================================
-- Santamore — Task 3: the SEPA rail (donate flow, bank-transfer only)
-- Apply AFTER 20260829000003_scope_adjustment_visibility.sql.
--
--  1. campaigns gain payment_reference — brief §6 requires the SEPA matching
--     key to exist for campaigns as well as fundraisers, and to be globally
--     unique across both tables (cross-table trigger; the app also retries
--     on collision when generating).
--  2. Seeded campaign gets a reference and a monthly suggestion set in
--     suggested_amounts (brief §9: the monthly toggle has its own €5/€10/€20
--     set; amounts come from the database, never hardcoded).
--  3. Staff (is_staff(): admin | chapter_lead) can read donations and run the
--     reconciliation queue: select, insert (record a transfer that arrived
--     with no pledge), and update (pending → approved; the immutability
--     trigger from 0001 still constrains every transition). Anonymous access
--     stays exactly as locked down as Task 2 left it.
-- ============================================================================

-- 0 ─ donations record the donor's UI language so the receipt email can be
-- sent "in the donor's language" (brief §9) days later, at reconciliation.
alter table public.donations
  add column donor_locale text
  check (donor_locale in ('me', 'en', 'ru'));

-- 1 ─ campaigns.payment_reference, same format contract as fundraisers
alter table public.campaigns
  add column payment_reference text;

alter table public.campaigns
  add constraint campaigns_payment_reference_check
  check (payment_reference ~ '^SM-(0[1-9]|1[0-2])[0-9]{2}-[0-9]{4}$');

alter table public.campaigns
  add constraint campaigns_payment_reference_key unique (payment_reference);

-- Global uniqueness across fundraisers AND campaigns (brief §6.2). Two
-- per-table unique constraints cannot see each other, so both tables get a
-- cross-table check; the generator's retry loop handles the rare race.
create or replace function public.enforce_payment_reference_global_uniqueness()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'campaigns' then
    if exists (select 1 from public.fundraisers f
               where f.payment_reference = new.payment_reference) then
      raise exception 'payment_reference % is already used by a fundraiser',
        new.payment_reference;
    end if;
  else
    if exists (select 1 from public.campaigns c
               where c.payment_reference = new.payment_reference) then
      raise exception 'payment_reference % is already used by a campaign',
        new.payment_reference;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_campaigns_reference_globally_unique
  before insert or update of payment_reference on public.campaigns
  for each row when (new.payment_reference is not null)
  execute function public.enforce_payment_reference_global_uniqueness();

create trigger trg_fundraisers_reference_globally_unique
  before insert or update of payment_reference on public.fundraisers
  for each row when (new.payment_reference is not null)
  execute function public.enforce_payment_reference_global_uniqueness();

-- 2 ─ backfill the seeded campaign, then require a reference on every campaign
update public.campaigns
   set payment_reference = 'SM-0826-4127'
 where slug = 'santa-run-2026'
   and payment_reference is null;

alter table public.campaigns
  alter column payment_reference set not null;

update public.campaigns
   set suggested_amounts = '{
     "oneoff": [
       {"amount_cents": 1000, "impact_key": "impact10"},
       {"amount_cents": 2500, "impact_key": "impact25", "default": true},
       {"amount_cents": 5000, "impact_key": "impact50"}
     ],
     "monthly": [
       {"amount_cents": 500},
       {"amount_cents": 1000, "default": true},
       {"amount_cents": 2000}
     ]
   }'::jsonb
 where slug = 'santa-run-2026';

-- 3 ─ staff access for the reconciliation queue. Grants were fully revoked in
-- 0001, so re-grant to authenticated and gate every row behind is_staff();
-- anon keeps zero grants and zero policies on all base tables.
grant select, insert, update on public.donations to authenticated;

create policy donations_staff_select on public.donations
  for select to authenticated
  using (public.is_staff());

create policy donations_staff_insert on public.donations
  for insert to authenticated
  with check (public.is_staff());

create policy donations_staff_update on public.donations
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.campaigns to authenticated;

create policy campaigns_staff_select on public.campaigns
  for select to authenticated
  using (public.is_staff());

grant select on public.fundraisers to authenticated;

create policy fundraisers_staff_select on public.fundraisers
  for select to authenticated
  using (public.is_staff());
