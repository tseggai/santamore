-- ============================================================================
-- Santamore — a year's recorded gifts belong to a cause
-- Apply AFTER 20260918000042_team_members.sql. Re-runnable.
--
-- A year report can name the cause its recorded donor list and hand-overs
-- belong to. The cause then counts them as raised, together with
-- sponsorship cash that went to the beneficiaries (fund = impact), so a
-- cause from before the ledger shows the money it really raised.
-- ============================================================================

alter table public.year_reports add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;

-- 2025: the seeded report and the seeded cause belong together.
update public.year_reports yr
   set campaign_id = c.id
  from public.campaigns c
 where yr.year = 2025 and yr.campaign_id is null and c.slug = 'santamore-25';

create or replace view public.v_public_year_reports
  with (security_invoker = off, security_barrier = on) as
select year, headline, summary_md, plan_md, volunteers, beneficiaries, venues,
       is_legacy, figures, events, supporters, beneficiaries_list, donors_list,
       volunteers_list, campaign_id
from public.year_reports
where is_public;
grant select on public.v_public_year_reports to anon, authenticated;

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
  c.id
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public;

grant select on public.v_public_campaigns to anon, authenticated;
