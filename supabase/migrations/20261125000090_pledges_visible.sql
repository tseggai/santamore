-- ============================================================================
-- Santamore — pledges are visible on a fundraiser's page
-- Apply AFTER 20261119000089_prospects_live.sql. Re-runnable.
--
-- While the bank account is not open, every gift is a pledge: a pending
-- SEPA donation. A page with two pledges read "€0 · 0 donors", so the
-- people who pledged, and the fundraiser, thought the gifts were lost
-- (owner decision 2026-11-25: pledges show).
--
-- A pledge is a promise, not money. It never enters v_money_in_all, so no
-- "raised" figure, donor count, ledger or leaderboard changes. It is its
-- own source with its own figure: v_pledges_open holds every open pledge
-- (internal, no grants), and v_public_fundraiser_pledges sums them per
-- published page — an amount and a count, never a name. When staff match
-- the transfer the row turns 'approved': it leaves this view and enters
-- the ledger, so a euro is never shown twice.
-- ============================================================================

drop view if exists public.v_public_fundraiser_pledges;
drop view if exists public.v_pledges_open;

create view public.v_pledges_open
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  d.net_cents as amount_cents,
  d.fundraiser_id,
  coalesce(d.campaign_id, f.campaign_id) as campaign_id,
  d.created_at
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
where d.status = 'pending'
  and d.rail = 'sepa'
  and (not d.is_test or public.test_mode());

revoke all on public.v_pledges_open from public, anon, authenticated;

create view public.v_public_fundraiser_pledges
  with (security_invoker = off, security_barrier = on) as
select
  f.id,
  f.slug,
  sum(p.amount_cents)::bigint as pledged_cents,
  count(*)::integer as pledge_count
from public.fundraisers f
join public.v_pledges_open p on p.fundraiser_id = f.id
where f.status = 'active' and (not f.is_test or public.test_mode())
group by f.id, f.slug;

grant select on public.v_public_fundraiser_pledges to anon, authenticated;
