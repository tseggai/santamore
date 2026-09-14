-- Read-only. Lists members who hold more than one fundraising page for the
-- same cause, which migration 0024 refuses to consolidate on its own
-- (approved donations are immutable and stay with the page they were made
-- to). "demo" says whether every page in the pair came from the demo
-- generator — if so, Admin › Demo › Purge clears them; then re-run 0024.
select
  p.full_name,
  c.title                                          as cause,
  count(*)                                         as pages,
  string_agg(f.slug, ', ' order by f.created_at)   as slugs,
  bool_and(dr.row_id is not null)                  as demo,
  coalesce(sum(t.approved_cents), 0)               as approved_cents
from public.fundraisers f
join public.profiles  p  on p.id = f.user_id
join public.events    e  on e.id = f.event_id
join public.campaigns c  on c.id = e.campaign_id
left join public.demo_records dr on dr.kind = 'fundraiser' and dr.row_id = f.id
left join lateral (
  select sum(d.net_cents) as approved_cents
    from public.donations d
   where d.fundraiser_id = f.id and d.status in ('approved', 'refunded')
) t on true
group by p.full_name, c.title
having count(*) > 1
order by demo, p.full_name;
