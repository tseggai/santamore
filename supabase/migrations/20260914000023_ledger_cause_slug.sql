-- 0023 · The public money-in ledger names the cause each euro serves —
-- directly, or through a fundraiser page on one of the cause's events —
-- so a cause page can show its own ledger. Re-runnable; the view only grows.
create or replace view public.v_public_ledger_in
  with (security_invoker = off, security_barrier = on) as
select
  d.id,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.net_cents as amount_cents,
  case when d.is_anonymous then null
       else coalesce(d.display_name, d.donor_name) end as display_name,
  case when f.status = 'active' then f.slug  end as fundraiser_slug,
  case when f.status = 'active' then f.title end as fundraiser_title,
  case when c.is_public then c.slug  end as campaign_slug,
  case when c.is_public then c.title end as campaign_title,
  ch.slug as chapter_slug,
  d.rail,
  coalesce(case when c.is_public then c.slug end,
           case when ec.is_public then ec.slug end) as cause_slug
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
left join public.events e on e.id = f.event_id
left join public.campaigns ec on ec.id = e.campaign_id
left join public.campaigns c on c.id = d.campaign_id
left join public.chapters ch on ch.id = d.chapter_id
where d.status in ('approved', 'refunded');

grant select on public.v_public_ledger_in to anon, authenticated;
