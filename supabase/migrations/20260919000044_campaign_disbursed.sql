-- ============================================================================
-- Santamore — a cause shows what was handed over
-- Apply AFTER 20260919000043_year_report_cause.sql. Re-runnable.
--
-- v_public_campaigns gains disbursed_cents: the published hand-overs booked
-- to the cause, plus the hand-overs recorded on a public year report that
-- names it. The site derives "completed" and "goal reached" from these
-- figures and the cause's end date; nothing is set by hand.
-- ============================================================================

create or replace view public.v_public_campaigns
  with (security_invoker = off, security_barrier = on) as
select
  c.slug,
  c.title,
  c.description,
  c.goal_cents,
  c.payment_reference,
  c.suggested_amounts,
  c.starts_at,
  c.ends_at,
  c.beneficiary_summary,
  ch.slug as chapter_slug,
  ch.name as chapter_name,
  coalesce((select sum(d.net_cents)
            from public.donations d
            left join public.fundraisers f on f.id = d.fundraiser_id
            where d.status in ('approved', 'refunded')
              and (d.campaign_id = c.id or f.campaign_id = c.id)), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              left join public.fundraisers f2 on f2.id = dd.fundraiser_id
              where dd.status in ('approved', 'refunded')
                and (dd.campaign_id = c.id or f2.campaign_id = c.id)), 0)
  -- gifts recorded on a year report that names this cause (before the ledger)
  + coalesce((select sum((g->>'amount_cents')::bigint)
              from public.year_reports yr, jsonb_array_elements(yr.donors_list) g
              where yr.is_public and yr.campaign_id = c.id
                and g->>'amount_cents' ~ '^[0-9]+$'), 0)
  -- sponsorship cash handed to the beneficiaries, as donations are
  + coalesce((select sum(s.amount_cents)
              from public.sponsors s
              where s.campaign_id = c.id and s.status in ('signed', 'active')
                and s.is_in_kind = false and s.fund = 'impact'), 0)
    as raised_cents,
  (select count(distinct coalesce(lower(d.donor_email), d.id::text))
   from public.donations d
   left join public.fundraisers f on f.id = d.fundraiser_id
   where d.status in ('approved', 'refunded')
     and (d.campaign_id = c.id or f.campaign_id = c.id))
  + coalesce((select count(distinct lower(g->>'name'))
              from public.year_reports yr, jsonb_array_elements(yr.donors_list) g
              where yr.is_public and yr.campaign_id = c.id), 0) as donor_count,
  c.cover_path,
  c.id,
  -- hand-overs published in the ledger for this cause
  coalesce((select sum(db.amount_cents)
            from public.disbursements db
            where db.campaign_id = c.id and db.published_at is not null), 0)
  -- plus the hand-overs recorded on a public year report that names it
  + coalesce((select sum((h->>'amount_cents')::bigint)
              from public.year_reports yr, jsonb_array_elements(yr.beneficiaries_list) h
              where yr.is_public and yr.campaign_id = c.id
                and h->>'amount_cents' ~ '^[0-9]+$'), 0)
    as disbursed_cents
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public;

grant select on public.v_public_campaigns to anon, authenticated;
