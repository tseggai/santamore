-- 0070 — v_public_event_progress: the live figures behind an event's
-- share card — what its cause has raised so far, today, and on the event
-- day(s). Sums over v_money_in_all (docs/MONEY-MODEL.md); honours
-- is_public and test mode like every v_public_* view. "Today" is the
-- Montenegrin day, not UTC.

create or replace view public.v_public_event_progress
  with (security_invoker = off, security_barrier = on) as
select
  e.slug as event_slug,
  e.name as event_name,
  e.starts_at,
  e.ends_at,
  c.slug as campaign_slug,
  c.title as campaign_title,
  c.goal_cents,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m
             where m.campaign_id = c.id
               and m.entry_date = timezone('Europe/Podgorica', now())::date), 0) as today_cents,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m
             where m.campaign_id = c.id
               and m.entry_date between timezone('Europe/Podgorica', e.starts_at)::date
                                    and timezone('Europe/Podgorica', coalesce(e.ends_at, e.starts_at))::date), 0) as event_day_cents
from public.events e
join public.campaigns c on c.id = e.campaign_id and c.is_public and (not c.is_test or public.test_mode())
where e.is_published and (not e.is_test or public.test_mode());

grant select on public.v_public_event_progress to anon, authenticated;

notify pgrst, 'reload schema';
