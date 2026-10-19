-- ============================================================================
-- Santamore — 2025: Sofi's €40 above its sponsorship, recorded as a gift
-- Apply AFTER 20261019000078_santamore25_cash_and_duplicate.sql. Re-runnable.
--
-- Sofi paid €540 directly: €500 is its sponsorship (already on the record),
-- the €40 above it was a gift for the beneficiaries and was on neither the
-- sheet's totals nor the site. Recorded on the 2025 year report like the
-- other pre-ledger gifts; the hand-over split is recomputed as in 0053.
-- ============================================================================

update public.year_reports
   set donors_list = coalesce(donors_list, '[]'::jsonb)
                     || jsonb_build_array(jsonb_build_object('name', 'Sofi (gift above the sponsorship)', 'amount_cents', 4000))
 where year = 2025
   and not exists (
     select 1 from jsonb_array_elements(coalesce(donors_list, '[]'::jsonb)) g
      where g->>'name' = 'Sofi (gift above the sponsorship)');

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
