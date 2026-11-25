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
-- ledger, leaderboard or stored "raised" figure changes. It is its own
-- source: v_pledges_open holds every open pledge (internal, no grants),
-- and two public views sum it, per published page and per public cause —
-- amounts and counts, never a name. Each also carries the figure a page
-- shows while the site takes pledges only (owner decision 2026-11-25: until
-- the payment system is set up, a pledger is a donor): total_cents, what
-- was received plus what is pledged, and donor_count, the distinct people
-- behind both. When staff match the transfer the row turns 'approved': it
-- leaves the pledges and enters the ledger, so a euro is never shown twice.
-- ============================================================================

drop view if exists public.v_public_pledge_wall;
drop view if exists public.v_public_team_pledges;
drop view if exists public.v_public_campaign_pledges;
drop view if exists public.v_public_fundraiser_pledges;
drop view if exists public.v_pledges_open;

create view public.v_pledges_open
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  d.net_cents as amount_cents,
  d.fundraiser_id,
  -- the page is published: only then does the pledge show on a page or a board
  coalesce(f.status = 'active' and (not f.is_test or public.test_mode()), false) as on_live_page,
  coalesce(d.campaign_id, f.campaign_id) as campaign_id,
  -- the same key the ledger gives a donor, so a person is counted once across both
  coalesce('e:' || md5(lower(d.donor_email)), 'd:' || d.id::text) as donor_key,
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
  p.pledged_cents,
  p.pledge_count,
  (p.pledged_cents
    + coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.fundraiser_id = f.id), 0))::bigint as total_cents,
  (select count(*) from (
     select o.donor_key from public.v_pledges_open o where o.fundraiser_id = f.id
     union
     select m.donor_key from public.v_money_in_all m where m.fundraiser_id = f.id
   ) k)::integer as donor_count
from public.fundraisers f
join (
  select o.fundraiser_id, sum(o.amount_cents)::bigint as pledged_cents, count(*)::integer as pledge_count
  from public.v_pledges_open o
  where o.fundraiser_id is not null
  group by o.fundraiser_id
) p on p.fundraiser_id = f.id
where f.status = 'active' and (not f.is_test or public.test_mode());

create view public.v_public_campaign_pledges
  with (security_invoker = off, security_barrier = on) as
select
  c.id,
  c.slug,
  p.pledged_cents,
  p.pledge_count,
  -- the part pledged through fundraisers' pages, for the fundraisers board
  p.pages_pledged_cents,
  (p.pledged_cents
    + coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0))::bigint as total_cents,
  (select count(*) from (
     select o.donor_key from public.v_pledges_open o where o.campaign_id = c.id
     union
     select m.donor_key from public.v_money_in_all m where m.campaign_id = c.id
   ) k)::integer as donor_count
from public.campaigns c
join (
  select o.campaign_id, sum(o.amount_cents)::bigint as pledged_cents, count(*)::integer as pledge_count,
         coalesce(sum(o.amount_cents) filter (where o.on_live_page), 0)::bigint as pages_pledged_cents
  from public.v_pledges_open o
  where o.campaign_id is not null
  group by o.campaign_id
) p on p.campaign_id = c.id
where c.is_public;

-- per team: the pledges on its members' published pages
create view public.v_public_team_pledges
  with (security_invoker = off, security_barrier = on) as
select
  t.id,
  t.slug,
  sum(fp.pledged_cents)::bigint as pledged_cents,
  sum(fp.pledge_count)::integer as pledge_count,
  (sum(fp.pledged_cents)
    + coalesce((select sum(m.amount_cents) from public.v_money_in_all m
                  join public.fundraisers mf on mf.id = m.fundraiser_id and mf.status = 'active'
                 where mf.team_id = t.id), 0))::bigint as total_cents,
  (select count(*) from (
     select o.donor_key from public.v_pledges_open o
       join public.fundraisers f on f.id = o.fundraiser_id and f.status = 'active'
      where f.team_id = t.id
     union
     select m.donor_key from public.v_money_in_all m
       join public.fundraisers f on f.id = m.fundraiser_id and f.status = 'active'
      where f.team_id = t.id
   ) k)::integer as donor_count
from public.teams t
join public.fundraisers f on f.team_id = t.id
join public.v_public_fundraiser_pledges fp on fp.id = f.id
where not t.is_test or public.test_mode()
group by t.id, t.slug;

-- the people who pledged to a page, as the donor wall shows a donor:
-- the name they chose to show (none if anonymous), amount, message
create view public.v_public_pledge_wall
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  f.slug as fundraiser_slug,
  case when d.is_anonymous then null
       else coalesce(d.display_name, d.donor_name) end as display_name,
  d.net_cents as amount_cents,
  case when d.is_message_hidden then null else d.message end as message,
  d.created_at
from public.donations d
join public.fundraisers f on f.id = d.fundraiser_id
where d.status = 'pending'
  and d.rail = 'sepa'
  and f.status = 'active'
  and (not d.is_test or public.test_mode()) and (not f.is_test or public.test_mode());

grant select on public.v_public_fundraiser_pledges, public.v_public_campaign_pledges,
                public.v_public_team_pledges, public.v_public_pledge_wall
  to anon, authenticated;
