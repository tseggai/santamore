-- ============================================================================
-- Santamore — "My giving": a member sees their own donations
-- Apply AFTER 20260911000011_perk_rules_days_pace.sql. Re-runnable.
--
-- Donors never need an account at checkout. When a person later signs in,
-- the donations made with the SAME email become visible to them — and only
-- to them. The match is on auth.email(), which the magic-link sign-in has
-- verified, so nobody can claim another person's giving by typing an
-- address. The views run with definer rights (the donations table has no
-- member grants) and project money and target fields only — never
-- provider_* columns or the pan token.
-- ============================================================================

create or replace view public.v_my_donations
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.created_at,
  d.amount_cents,
  d.fee_covered_cents,
  d.net_cents,
  d.rail,
  d.status,
  d.is_recurring,
  d.is_anonymous,
  d.display_name,
  d.message,
  f.slug  as fundraiser_slug,
  f.title as fundraiser_title,
  c.slug  as campaign_slug,
  c.title as campaign_title,
  e.name  as event_name,
  coalesce(f.payment_reference, c.payment_reference) as payment_reference
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
left join public.events e on e.id = f.event_id
left join public.campaigns c on c.id = d.campaign_id
where d.donor_email is not null
  and lower(d.donor_email) = lower(coalesce(auth.email(), ''));

create or replace view public.v_my_subscriptions
  with (security_invoker = off, security_barrier = on) as
select
  s.id,
  s.amount_cents,
  s.interval,
  s.status,
  s.next_charge_on,
  s.created_at
from public.subscriptions s
where s.user_id = (select auth.uid())
   or lower(s.donor_email) = lower(coalesce(auth.email(), ''));

grant select on public.v_my_donations, public.v_my_subscriptions to authenticated;
