-- ============================================================================
-- Which migrations has this database received? Paste into the Supabase SQL
-- editor. One row per migration file; "applied" is judged by an object that
-- only that migration creates. Apply missing ones IN ORDER — each file
-- assumes every earlier one.
-- ============================================================================

select * from (values
  ('20260829000001_initial_schema',
     to_regclass('public.donations') is not null),
  ('20260829000002_review_fixes',
     to_regproc('public.is_staff') is not null),
  ('20260829000003_scope_adjustment_visibility',
     to_regclass('public.v_public_ledger_adjustments') is not null),
  ('20260829000004_sepa_rail',
     to_regclass('public.v_public_campaigns') is not null),
  ('20260831000005_fundraiser_pages',
     to_regclass('public.v_team_totals') is not null),
  ('20260901000006_public_site_ledger_challenges',
     to_regclass('public.activities') is not null),
  ('20260901000007_refund_rpc',
     to_regprocedure('public.refund_donation(uuid, text)') is not null),
  ('20260909000008_teams_events_admin_demo',
     to_regclass('public.demo_records') is not null),
  ('20260910000009_campaign_pages_strava_perks',
     to_regclass('public.perk_awards') is not null),
  ('20260910000010_multi_pages_sponsor_links',
     to_regclass('public.v_public_sponsors') is not null),
  ('20260911000011_perk_rules_days_pace',
     to_regprocedure('public.perk_activity_qualifies(activities, perk_challenges)') is not null),
  ('20260911000012_my_giving',
     to_regclass('public.v_my_donations') is not null),
  ('20260911000013_strava_visibility',
     to_regclass('public.v_staff_athletes') is not null),
  ('20260911000014_manual_activities',
     exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'activities'
                and column_name = 'is_manual')),
  ('20260911000015_strava_athlete_profile',
     exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'strava_connections'
                and column_name = 'athlete_name')),
  ('20260911000016_event_rsvps',
     to_regclass('public.event_rsvps') is not null)
) as m (migration, applied)
order by migration;
