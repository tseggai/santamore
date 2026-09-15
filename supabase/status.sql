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
     to_regclass('public.event_rsvps') is not null),
  ('20260911000017_events_v2',
     exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'events'
                and column_name = 'offers_shirts')),
  ('20260913000018_supporters',
     to_regclass('public.supporters') is not null),
  ('20260913000019_staff_members',
     to_regclass('public.v_staff_members') is not null),
  ('20260913000020_supporter_logos',
     exists (select 1 from storage.buckets where id = 'supporter-logos'))
  ,('20260914000021_covers_gallery_scope',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'gallery_items' and column_name = 'campaign_id'))
  ,('20260914000022_staff_members_avatar',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'v_staff_members' and column_name = 'avatar_url'))
  ,('20260914000023_ledger_cause_slug',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'v_public_ledger_in' and column_name = 'cause_slug'))
  ,('20260914000024_pages_by_cause',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'fundraisers' and column_name = 'campaign_id'))
  ,('20260914000025_harden_demo_purge',
     coalesce(obj_description('public.purge_demo_data()'::regprocedure, 'pg_proc'), '') like '0025:%')
  ,('20260915000026_years',
     to_regclass('public.v_public_year_stats') is not null)
) as m (migration, applied)
order by migration;
