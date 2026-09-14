-- 0021 · Cover images on events and causes; gallery photos scoped to an
-- event or a cause. Re-runnable.

alter table public.events    add column if not exists cover_path text;
alter table public.campaigns add column if not exists cover_path text;
alter table public.gallery_items
  add column if not exists campaign_id uuid references public.campaigns (id);
create index if not exists gallery_items_campaign_idx on public.gallery_items (campaign_id);

-- v_public_events: same as 0017 plus cover_path (appended; views only grow).
create or replace view public.v_public_events
  with (security_invoker = off, security_barrier = on) as
select
  e.id,
  e.slug,
  e.name,
  e.starts_at,
  e.venue,
  e.registration_opens_at,
  e.registration_closes_at,
  e.distances,
  c.slug as campaign_slug,
  e.kind,
  e.challenge_metric,
  e.ends_at,
  e.price_tiers,
  e.capacity,
  (select count(*) from public.event_rsvps r
    where r.event_id = e.id and r.status = 'going') as going_count,
  e.description,
  e.offers_shirts,
  e.cover_path
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published;

grant select on public.v_public_events to anon, authenticated;

-- v_public_campaigns: same as 0009 plus cover_path.
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
            left join public.events e on e.id = f.event_id
            where d.status in ('approved', 'refunded')
              and (d.campaign_id = c.id or e.campaign_id = c.id)), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              left join public.fundraisers f2 on f2.id = dd.fundraiser_id
              left join public.events e2 on e2.id = f2.event_id
              where dd.status in ('approved', 'refunded')
                and (dd.campaign_id = c.id or e2.campaign_id = c.id)), 0)
    as raised_cents,
  (select count(distinct coalesce(lower(d.donor_email), d.id::text))
   from public.donations d
   left join public.fundraisers f on f.id = d.fundraiser_id
   left join public.events e on e.id = f.event_id
   where d.status in ('approved', 'refunded')
     and (d.campaign_id = c.id or e.campaign_id = c.id)) as donor_count,
  c.cover_path
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public;

grant select on public.v_public_campaigns to anon, authenticated;

-- v_public_gallery: plus the cause a photo belongs to.
create or replace view public.v_public_gallery
  with (security_invoker = off, security_barrier = on) as
select g.id, g.event_id, g.storage_path, g.caption, g.credit, g.sort_order,
       e.slug as event_slug, e.name as event_name, e.starts_at as event_starts_at,
       g.campaign_id, c.slug as campaign_slug, c.title as campaign_title
from public.gallery_items g
left join public.events e on e.id = g.event_id
left join public.campaigns c on c.id = g.campaign_id
where g.is_published;

grant select on public.v_public_gallery to anon, authenticated;
