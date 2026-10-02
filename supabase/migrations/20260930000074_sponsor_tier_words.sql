-- ============================================================================
-- Santamore — the tier is a sponsor, not a partner
-- Apply AFTER 20260930000073_sponsor_tiers.sql. Re-runnable.
-- The sponsors page now calls the tiers Core Cost Sponsor and Title Sponsor.
-- ============================================================================
update public.sponsors set tier = 'title sponsor' where tier = 'title partner';
update public.sponsors set tier = 'core cost sponsor' where tier in ('core cost partner', 'core');
