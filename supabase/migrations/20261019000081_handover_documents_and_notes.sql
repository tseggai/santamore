-- ============================================================================
-- Santamore — paperwork and a note on recorded hand-overs
-- Apply AFTER 20261019000080_santamore25_salon_prive_and_split.sql. Re-runnable.
--
-- A hand-over recorded on a year report (before the ledger existed) can now
-- carry its documents, exactly as a disbursement does: the public ledger
-- links them. A year report also carries two notes: one public, shown under
-- the hand-overs on the money page (how the money moved that year), and
-- one internal, read only in the console (where the originals are).
--
-- 2025: Santamore had no bank account. The two bank slips for what the
-- association paid itself are published with personal details masked, and
-- the note says how the rest reached Bijela.
-- ============================================================================

alter table public.year_reports add column if not exists money_note_md text;
alter table public.year_reports add column if not exists internal_note_md text;
comment on column public.year_reports.money_note_md is 'Public: how the money moved that year, shown under the hand-overs on the money page. Markdown.';
comment on column public.year_reports.internal_note_md is 'Staff only: where the originals are, who paid, anything not for the public page. Markdown.';

-- 1 ─ recorded hand-overs carry their documents (same columns, same order)
create or replace view public.v_money_out_all as
select
  db.id,
  'ledger'::text as source,
  (coalesce(db.paid_at, db.published_at))::date as entry_date,
  db.amount_cents,
  db.beneficiary_label,
  db.category,
  db.chapter_id,
  db.campaign_id,
  db.documentation_paths,
  db.committee_decision_ref,
  (db.paid_at is not null) as is_paid
from public.disbursements db
where db.published_at is not null and (not db.is_test or public.test_mode())
union all
select
  la.id,
  'adjustment',
  la.created_at::date,
  la.amount_cents,
  db.beneficiary_label,
  db.category,
  db.chapter_id,
  db.campaign_id,
  '{}'::text[],
  db.committee_decision_ref,
  (db.paid_at is not null)
from public.ledger_adjustments la
join public.disbursements db on db.id = la.references_disbursement_id
where db.published_at is not null
  and (not db.is_test or public.test_mode()) and (not la.is_test or public.test_mode())
union all
select
  md5('handover:' || yr.year::text || ':' || h.ordinality::text)::uuid,
  'recorded',
  coalesce(c.starts_at::date, make_date(yr.year, 12, 31)),
  (h.value->>'amount_cents')::bigint,
  trim(h.value->>'label'),
  null,
  null,
  yr.campaign_id,
  coalesce((select array_agg(d) from jsonb_array_elements_text(
             case when jsonb_typeof(h.value->'documents') = 'array' then h.value->'documents' else '[]'::jsonb end) d),
           '{}'::text[]),
  null,
  true
from public.year_reports yr
cross join lateral jsonb_array_elements(yr.beneficiaries_list) with ordinality as h(value, ordinality)
left join public.campaigns c on c.id = yr.campaign_id
where yr.is_public and h.value->>'amount_cents' ~ '^[0-9]+$'
  and (h.value->>'amount_cents')::bigint > 0 and (not yr.is_test or public.test_mode());

revoke all on public.v_money_out_all from public, anon, authenticated;

-- 2 ─ the public note travels with the public report
create or replace view public.v_public_year_reports
  with (security_invoker = off, security_barrier = on) as
select year, headline, summary_md, plan_md, volunteers, beneficiaries, venues,
       is_legacy, figures, events, supporters, beneficiaries_list, donors_list,
       volunteers_list, campaign_id, money_note_md
from public.year_reports
where is_public and (not is_test or public.test_mode());

-- 3 ─ 2025: the slips, and how the money moved
update public.year_reports
   set beneficiaries_list = (
     select jsonb_agg(
       case when b->>'label' in ('Dnevni Centar Tivat', 'Dječji dom „Mladost“ Bijela')
            then jsonb_set(b, '{documents}', '["/documents/2025/santamore-25-isplate.pdf"]'::jsonb)
            else b end)
     from jsonb_array_elements(beneficiaries_list) b),
       money_note_md = coalesce(money_note_md,
         E'**How the money moved in 2025.** Santamore had no bank account of its own in its first year. The donations received through the platform and the cash collected at VRIII were paid to the beneficiaries from a board member''s personal account: the full amount for Dnevni Centar Tivat on 23 December 2025, and €1,700 of the amount for Dječji dom „Mladost“ Bijela on 24 April 2026. The bank slips for both are linked on the lines above, with the payer''s address, account number and signatures masked. The remainder of the amount for Bijela was paid by the sponsors directly to the home, on our instruction. From 2026 every euro moves through the association''s own account.')
 where year = 2025;

notify pgrst, 'reload schema';
