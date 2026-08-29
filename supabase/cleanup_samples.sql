-- ============================================================================
-- Deletes the [[SAMPLE]] rows created by supabase/seed.sql. Run ONCE before
-- launch, as table owner, in the Supabase SQL editor.
--
-- The immutability triggers (correctly) refuse to delete an approved donation
-- and a published disbursement, so they are disabled for exactly this
-- statement pair and re-enabled immediately. This is the only sanctioned use.
-- ============================================================================

begin;

alter table public.donations     disable trigger trg_donations_immutability;
alter table public.disbursements disable trigger trg_disbursements_immutability;

delete from public.donations
  where id = '40000000-0000-4000-8000-000000000001'
    and message like '[[SAMPLE]]%';

delete from public.disbursements
  where id = '50000000-0000-4000-8000-000000000001'
    and beneficiary_label like '[[SAMPLE]]%';

alter table public.donations     enable trigger trg_donations_immutability;
alter table public.disbursements enable trigger trg_disbursements_immutability;

commit;
