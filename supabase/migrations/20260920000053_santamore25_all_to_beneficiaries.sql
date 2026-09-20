-- ============================================================================
-- Santamore — 2025: nothing kept for operations, all shared equally
-- Apply AFTER 20260920000052_pages_by_cause_only.sql. Re-runnable.
--
-- The owner's record of 2025: no money went to operations, and everything
-- raised was divided equally between the two beneficiaries on the year
-- report. Nothing here is typed in: the 2025 sponsorship cash moves to the
-- impact fund, and the hand-over amounts are the year's raised total
-- (recorded gifts plus that cash) split evenly across the labels already
-- on the report. Re-running recomputes from the same records.
-- ============================================================================

-- 1 ─ every 2025 sponsorship paid in cash went to the beneficiaries
update public.sponsors s
   set fund = 'impact'
 where s.fund <> 'impact'
   and not s.is_in_kind
   and s.status in ('signed', 'active')
   and coalesce(
         s.year,
         extract(year from coalesce(
           (select e.starts_at from public.events e where e.id = s.event_id),
           (select c.starts_at from public.campaigns c where c.id = s.campaign_id)))::int
       ) = 2025;

-- 2 ─ the hand-overs: the year's raised total, shared equally
do $$
declare
  v_total bigint;
  v_list  jsonb;
  v_n     int;
  v_each  bigint;
  v_rem   bigint;
  v_out   jsonb := '[]'::jsonb;
  v_item  jsonb;
  i       int := 0;
begin
  select coalesce(sum((g->>'amount_cents')::bigint), 0) into v_total
    from public.year_reports yr, jsonb_array_elements(yr.donors_list) g
   where yr.year = 2025 and g->>'amount_cents' ~ '^[0-9]+$';

  v_total := v_total + (
    select coalesce(sum(s.amount_cents), 0)
      from public.sponsors s
     where s.fund = 'impact' and not s.is_in_kind and s.status in ('signed', 'active')
       and coalesce(
             s.year,
             extract(year from coalesce(
               (select e.starts_at from public.events e where e.id = s.event_id),
               (select c.starts_at from public.campaigns c where c.id = s.campaign_id)))::int
           ) = 2025);

  select beneficiaries_list into v_list from public.year_reports where year = 2025;
  v_n := jsonb_array_length(coalesce(v_list, '[]'::jsonb));
  if v_n = 0 or v_total = 0 then
    return;
  end if;

  v_each := v_total / v_n;
  v_rem  := v_total - v_each * v_n;
  for v_item in select * from jsonb_array_elements(v_list) loop
    v_out := v_out || jsonb_build_object(
      'label', v_item->>'label',
      'amount_cents', v_each + case when i < v_rem then 1 else 0 end);
    i := i + 1;
  end loop;

  update public.year_reports set beneficiaries_list = v_out where year = 2025;
end $$;
