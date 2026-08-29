-- ============================================================================
-- Santamore — Task 2 seed data
--
-- Event facts are PLACEHOLDERS from the prototype (docs/PLACEHOLDERS.md):
-- replace with real date/venue/prices/capacity when known (brief §15.5).
--
-- The two rows with fixed UUIDs prefixed [[SAMPLE]] exist ONLY so the RLS
-- tests can prove sensitive columns are unreachable. Delete them before
-- launch with supabase/cleanup_samples.sql.
-- ============================================================================

insert into public.chapters
  (id, name, slug, municipality, is_active,
   split_local_bp, split_national_bp, split_solidarity_bp)
values
  ('10000000-0000-4000-8000-000000000001', 'Boka', 'boka', 'Tivat', true,
   7000, 2000, 1000);

insert into public.campaigns
  (id, chapter_id, title, slug, description, goal_cents,
   starts_at, ends_at, beneficiary_summary, is_public, payment_reference,
   suggested_amounts)
values
  ('20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   'Santa Run 2026', 'santa-run-2026',
   '[[PLACEHOLDER: campaign description]]',
   3000000, -- [[PLACEHOLDER: goal]]
   '2026-11-01T00:00:00+01', '2026-12-31T23:59:59+01',
   '[[PLACEHOLDER: beneficiary summary]]',
   true,
   'SM-0826-4127', -- SEPA matching key, generated at campaign creation
   -- Amounts and impact-line i18n keys from the prototype; copy lives in
   -- messages/*.json (donate.impact10/25/50). The monthly set is the brief's
   -- own €5/€10/€20 suggestion set (§9.2).
   '{"oneoff": [
       {"amount_cents": 1000, "impact_key": "impact10"},
       {"amount_cents": 2500, "impact_key": "impact25", "default": true},
       {"amount_cents": 5000, "impact_key": "impact50"}],
     "monthly": [
       {"amount_cents": 500},
       {"amount_cents": 1000, "default": true},
       {"amount_cents": 2000}]}'::jsonb);

insert into public.events
  (id, campaign_id, chapter_id, name, slug, starts_at, venue, capacity,
   registration_opens_at, registration_closes_at, price_tiers, distances,
   is_published)
values
  ('30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   'Santa Run 2026', 'santa-run-2026',
   '2026-12-20T11:00:00+01',            -- [[PLACEHOLDER: event date/time]]
   '[[PLACEHOLDER: venue, Tivat]]',
   500,                                  -- [[PLACEHOLDER: capacity]]
   '2026-10-01T00:00:00+02',            -- [[PLACEHOLDER: registration opens]]
   '2026-12-18T23:59:59+01',            -- [[PLACEHOLDER: registration closes]]
   '[{"label": "[[PLACEHOLDER: tier]]", "amount_cents": 1500}]'::jsonb,
   '["5 km"]'::jsonb,
   true);

-- [[SAMPLE]] approved SEPA donation (campaign-level). donor_email uses the
-- reserved .invalid TLD; net_cents is generated (2575 - 75 = 2500).
insert into public.donations
  (id, amount_cents, fee_covered_cents, campaign_id, chapter_id,
   donor_name, donor_email, display_name, is_anonymous, message,
   rail, status, created_at, approved_at)
values
  ('40000000-0000-4000-8000-000000000001',
   2575, 75,
   '20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   'Test Donor', 'sample@santamore.invalid', 'Test Donor', false,
   '[[SAMPLE]] seed row for RLS tests — delete before launch',
   'sepa', 'approved', now(), now());

-- [[SAMPLE]] published disbursement. The private note MUST stay unreachable
-- for anonymous clients — the RLS tests probe exactly this row.
insert into public.disbursements
  (id, chapter_id, beneficiary_label, beneficiary_private_note, category,
   amount_cents, decided_at, paid_at, published_at, documentation_paths,
   committee_decision_ref)
values
  ('50000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '[[SAMPLE]] Family in Tivat — medical costs',
   '[[SAMPLE]] private note — must never be publicly readable',
   'medical',
   10000, now(), now(), now(), '{}',
   '[[SAMPLE]]');
