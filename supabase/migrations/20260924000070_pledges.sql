-- ============================================================================
-- Santamore — pledges before the bank account exists
-- Apply AFTER 20260921000069_legal_pack.sql. Re-runnable.
--
-- A SEPA gift made while the site has no real IBAN is a pledge: a pending
-- donation whose transfer details have not been sent. instructions_sent_at
-- records when the donor received them; staff send them in one go from
-- the Money section once the account opens. Existing pending SEPA rows
-- are left at null, so they receive the real details too.
-- ============================================================================
alter table public.donations
  add column if not exists instructions_sent_at timestamptz;

comment on column public.donations.instructions_sent_at is
  'When the donor was emailed the transfer details; null for a pledge still waiting for the bank account.';
