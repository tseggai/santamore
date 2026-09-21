-- ============================================================================
-- Santamore — a cause is completed by decision, and says so everywhere
-- Apply AFTER 20260920000062_ledger_integrity.sql. Re-runnable.
--
-- Until now a cause counted as completed only from its records (end date
-- passed, or everything raised handed over). Staff can now close one
-- explicitly: completed_at set means no more gifts, no new pages, and every
-- surface reads it (lib/cause-status.ts adds it to the derived rules).
-- ============================================================================

alter table public.campaigns add column if not exists completed_at timestamptz;

drop view if exists public.v_public_campaigns;
create view public.v_public_campaigns
  with (security_invoker = off, security_barrier = on) as
select
  c.slug, c.title, c.description, c.goal_cents, c.payment_reference, c.suggested_amounts,
  c.starts_at, c.ends_at, c.beneficiary_summary,
  ch.slug as chapter_slug, ch.name as chapter_name,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  c.cover_path,
  c.id,
  coalesce((select sum(m.amount_cents) from public.v_money_out_all m where m.campaign_id = c.id and m.is_paid), 0) as disbursed_cents,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id and m.fundraiser_id is not null), 0) as pages_raised_cents,
  c.completed_at
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public and (not c.is_test or public.test_mode());
grant select on public.v_public_campaigns to anon, authenticated;

notify pgrst, 'reload schema';
