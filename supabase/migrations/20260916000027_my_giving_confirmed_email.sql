-- 0027 · "My giving" trusts only a confirmed email.
-- Sign-in gains a password path (0027 app release). An account created
-- with a password has an unconfirmed address until the confirmation link
-- is clicked, and auth.email() already returns it. The two views that
-- show a person the gifts made with their address must therefore insist
-- on email_confirmed_at, or anyone could type a donor's address and read
-- their history. Magic-link accounts are confirmed by construction, so
-- nothing changes for them. Re-runnable.

create or replace function public.my_confirmed_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
    from auth.users u
   where u.id = auth.uid()
     and u.email_confirmed_at is not null
$$;

revoke all on function public.my_confirmed_email() from public;
grant execute on function public.my_confirmed_email() to authenticated;

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
  coalesce(f.payment_reference, c.payment_reference) as payment_reference,
  f.event_id,
  d.campaign_id
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
left join public.events e on e.id = f.event_id
left join public.campaigns c on c.id = d.campaign_id
where d.donor_email is not null
  and lower(d.donor_email) = public.my_confirmed_email();

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
   or lower(s.donor_email) = public.my_confirmed_email();

grant select on public.v_my_donations, public.v_my_subscriptions to authenticated;
