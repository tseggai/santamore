-- ============================================================================
-- Santamore — donors, from the ledger
-- Apply AFTER 20260920000066_vote_guard.sql. Re-runnable.
--
-- The Donors tab listed accounts with approved gifts, so a donor without an
-- account — every name recorded on the 2025 report, every SEPA gift from
-- someone who never signed up — was missing. A donor is whoever a money-in
-- row belongs to: v_donors groups v_money_in_all by donor_key (a hashed
-- email, a recorded name, a supporter), staff only, with the real name a
-- staff member may see and the account when an email matches one.
-- v_donor_gifts lists the rows behind each donor.
-- ============================================================================

drop view if exists public.v_donor_gifts;
drop view if exists public.v_donors;

create view public.v_donor_gifts
  with (security_invoker = off, security_barrier = on) as
select
  m.id,
  m.donor_key,
  m.source,
  m.entry_date,
  m.amount_cents,
  m.rail,
  coalesce(d.donor_name, m.display_name) as name,
  c.title as campaign_title,
  m.fundraiser_title
from public.v_money_in_all m
left join public.donations d on d.id = m.id and m.source = 'ledger'
left join public.campaigns c on c.id = m.campaign_id
where public.is_staff();
grant select on public.v_donor_gifts to authenticated;

create view public.v_donors
  with (security_invoker = off, security_barrier = on) as
select
  g.donor_key,
  coalesce(max(g.name), '') as name,
  sum(g.amount_cents) as given_cents,
  count(*) filter (where g.source <> 'adjustment') as gifts,
  min(g.entry_date) as first_date,
  max(g.entry_date) as last_date,
  array_agg(distinct g.source) as sources,
  array_remove(array_agg(distinct g.campaign_title), null) as causes,
  (select p.id from auth.users u join public.profiles p on p.id = u.id
    where g.donor_key = 'e:' || md5(lower(u.email)) limit 1) as user_id
from public.v_donor_gifts g
where public.is_staff()
group by g.donor_key;
grant select on public.v_donors to authenticated;

notify pgrst, 'reload schema';
