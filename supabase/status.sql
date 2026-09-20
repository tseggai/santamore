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
  ,('20260916000027_my_giving_confirmed_email',
     to_regproc('public.my_confirmed_email') is not null)
  ,('20260916000028_events_hosting_guests',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'events' and column_name = 'hosting'))
  ,('20260916000029_cause_proposals',
     to_regclass('public.cause_proposals') is not null)
  ,('20260917000030_year_report_legacy',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'year_reports' and column_name = 'is_legacy'))
  ,('20260917000031_year_report_donors',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'year_reports' and column_name = 'donors_list'))
  ,('20260917000032_seed_santamore_25',
     exists (select 1 from public.campaigns where slug = 'santamore-25'))
  ,('20260917000033_seed_santamore_25_donors',
     exists (select 1 from public.year_reports where year = 2025 and jsonb_array_length(donors_list) > 0))
  ,('20260917000034_supporters_delete',
     exists (select 1 from information_schema.role_table_grants
             where table_schema = 'public' and table_name = 'supporters'
               and grantee = 'authenticated' and privilege_type = 'DELETE'))
  ,('20260917000035_sponsor_amounts_public',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'v_public_year_supporters' and column_name = 'cash_cents'))
  ,('20260917000036_supporter_kind',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'supporters' and column_name = 'kind'))
  ,('20260917000037_sponsor_details',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'v_public_sponsors' and column_name = 'campaign_title'))
  ,('20260918000038_years_recorded',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sponsors' and column_name = 'year'))
  ,('20260918000039_sponsor_fund',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sponsors' and column_name = 'fund'))
  ,('20260918000040_team_profiles_site_pages',
     to_regclass('public.site_pages') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_team'))
  ,('20260918000041_santamore25_event_beneficiaries',
     to_regclass('public.beneficiaries') is not null)
  ,('20260918000042_team_members',
     to_regclass('public.team_members') is not null)
  ,('20260919000043_year_report_cause',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'year_reports' and column_name = 'campaign_id'))
  ,('20260919000044_campaign_disbursed',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'v_public_campaigns' and column_name = 'disbursed_cents'))
  ,('20260919000045_delete_event',
     to_regprocedure('public.delete_event(uuid)') is not null)
  ,('20260919000046_event_registration_mode',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'events' and column_name = 'registration_mode'))
  ,('20260919000047_is_admin',
     to_regprocedure('public.is_admin()') is not null)
  ,('20260919000048_delete_campaign',
     to_regprocedure('public.delete_campaign(uuid)') is not null)
  ,('20260919000049_delete_team_page',
     to_regprocedure('public.delete_team(uuid)') is not null
     and to_regprocedure('public.delete_fundraiser(uuid)') is not null)
  ,('20260919000050_captain_deletes_team',
     exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'delete_team'
               and pg_get_functiondef(p.oid) like '%v_captain%'))
  ,('20260919000051_delete_team_counts_money',
     exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'delete_team'
               and pg_get_functiondef(p.oid) like '%''approved'', ''refunded''%'))
  ,('20260920000052_pages_by_cause_only',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'fundraisers'
               and column_name = 'event_id' and is_nullable = 'YES'))
  ,('20260920000053_santamore25_all_to_beneficiaries',
     exists (select 1 from public.year_reports yr, jsonb_array_elements(yr.beneficiaries_list) h
             where yr.year = 2025 and coalesce((h->>'amount_cents')::bigint, 0) > 0))
) as m (migration, applied)
order by migration;
