-- ============================================================================
-- Santamore — 2025 reconciled against the owner's accounting (2026-10-19)
-- Apply AFTER 20261003000077_role_is_access.sql. Re-runnable.
--
-- Two corrections from the reconciliation of the site against the 2025
-- spreadsheet:
--   1. Marc collected €320 in cash at VRIII for the beneficiaries; it was
--      on the sheet and not on the site. Recorded as a gift on the 2025
--      year report, like the other pre-ledger gifts.
--   2. "David Morgson" and "Anonymous (Porto Montenegro staff member)"
--      are the same €500 sponsorship. The row entered by name in the
--      console goes; the row the 2025 site published, anonymous, stays.
-- The hand-over split to the two beneficiaries is then recomputed from the
-- records, exactly as migration 0053 did. Nothing is typed in.
-- ============================================================================

-- 1 ─ Marc's cash, once
update public.year_reports
   set donors_list = coalesce(donors_list, '[]'::jsonb)
                     || jsonb_build_array(jsonb_build_object('name', 'Marc (cash collected at VRIII)', 'amount_cents', 32000))
 where year = 2025
   and not exists (
     select 1 from jsonb_array_elements(coalesce(donors_list, '[]'::jsonb)) g
      where g->>'name' like 'Marc (cash collected at VRIII)%');

-- 2 ─ the duplicate sponsorship
delete from public.sponsors s
 where lower(s.name) = 'david morgson'
   and s.amount_cents = 50000
   and not s.is_in_kind
   and coalesce(
         s.year,
         extract(year from coalesce(
           (select e.starts_at from public.events e where e.id = s.event_id),
           (select c.starts_at from public.campaigns c where c.id = s.campaign_id)))::int
       ) = 2025
   and exists (
     select 1 from public.sponsors a
      where a.name = 'Anonymous (Porto Montenegro staff member)' and a.amount_cents = 50000
        and a.status in ('signed', 'active'));

-- 3 ─ the hand-overs: the year's raised total, shared equally (as in 0053)
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
