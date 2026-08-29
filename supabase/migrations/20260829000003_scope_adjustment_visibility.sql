-- ============================================================================
-- Santamore — security-review hardening (Task 2)
-- Apply AFTER 20260829000002_review_fixes.sql.
--
-- A correction (ledger_adjustments row) must not become publicly visible, or
-- move public totals, before the ledger entry it references is itself public.
-- Previously an adjustment recorded against a pending donation or an
-- unpublished disbursement leaked its amount, reason and chapter to anonymous
-- readers, and shifted v_fundraiser_totals / v_chapter_totals early.
-- ============================================================================

create or replace view public.v_public_ledger_adjustments
  with (security_invoker = off, security_barrier = on) as
select
  la.id,
  la.created_at::date as entry_date,
  la.amount_cents,          -- signed
  la.reason,
  la.references_donation_id,
  la.references_disbursement_id,
  ch.slug as chapter_slug
from public.ledger_adjustments la
left join public.donations     dd on dd.id = la.references_donation_id
left join public.disbursements db on db.id = la.references_disbursement_id
left join public.chapters      ch on ch.id = coalesce(dd.chapter_id, db.chapter_id)
where (dd.id is not null and dd.status in ('approved', 'refunded'))
   or (db.id is not null and db.published_at is not null);

create or replace view public.v_fundraiser_totals
  with (security_invoker = off, security_barrier = on) as
select
  f.id,
  f.slug,
  f.title,
  f.story,
  f.photo_path,
  f.goal_cents,
  f.event_id,
  f.team_id,
  coalesce(sum(d.net_cents) filter (where d.status in ('approved', 'refunded')), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              where dd.fundraiser_id = f.id
                and dd.status in ('approved', 'refunded')), 0) as raised_cents,
  count(distinct coalesce(lower(d.donor_email), d.id::text))
    filter (where d.status in ('approved', 'refunded')) as donor_count
from public.fundraisers f
left join public.donations d on d.fundraiser_id = f.id
where f.status = 'active'
group by f.id;

create or replace view public.v_chapter_totals
  with (security_invoker = off, security_barrier = on) as
select
  ch.id,
  ch.name,
  ch.slug,
  coalesce((select sum(d.net_cents) from public.donations d
            where d.chapter_id = ch.id and d.status in ('approved', 'refunded')), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              where dd.chapter_id = ch.id
                and dd.status in ('approved', 'refunded')), 0) as raised_cents,
  coalesce((select sum(db.amount_cents) from public.disbursements db
            where db.chapter_id = ch.id and db.published_at is not null), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.disbursements dbb on dbb.id = la.references_disbursement_id
              where dbb.chapter_id = ch.id and dbb.published_at is not null), 0)
    as disbursed_cents
from public.chapters ch
where ch.is_active;
