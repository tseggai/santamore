-- ============================================================================
-- Santamore — entry fees go to the cause; sponsors pay for the team
-- Apply AFTER 20260924000070_pledges.sql. Re-runnable.
--
-- Decision of 2026-09-24: the Impact Fund is donations, entry fees and
-- grants; the Operations Fund is sponsorship only. Each event says where
-- its entry fees go (fee_fund, 'impact' unless a board decision says
-- otherwise), and each sponsorship already says which fund it feeds, so
-- an unforeseen case is a switch on the record, not a rule bent in code.
--
-- A paid entry on an 'impact' event is a row of the money-in ledger with
-- source 'entry' and rail 'entry', attributed to the event's cause and
-- chapter, with no donor: an entry is not a gift, so it is not on the
-- donor wall and does not count as a donor. The operations total keeps
-- sponsorship cash for operations plus the entry fees of 'operations'
-- events only.
-- ============================================================================

alter table public.events
  add column if not exists fee_fund text not null default 'impact';
alter table public.events drop constraint if exists events_fee_fund_check;
alter table public.events add constraint events_fee_fund_check
  check (fee_fund in ('impact', 'operations'));

comment on column public.events.fee_fund is
  'Which fund the entry fees feed: impact (the cause, the default) or operations (the team), per event.';

-- The same columns as before; one more kind of row.
create or replace view public.v_money_in_all as
select
  d.id,
  'ledger'::text as source,
  (coalesce(d.approved_at, d.created_at))::date as entry_date,
  d.net_cents as amount_cents,
  case when d.is_anonymous then null else coalesce(d.display_name, d.donor_name) end as display_name,
  coalesce('e:' || md5(lower(d.donor_email)), 'd:' || d.id::text) as donor_key,
  f.id as fundraiser_id,
  case when f.status = 'active' then f.slug  end as fundraiser_slug,
  case when f.status = 'active' then f.title end as fundraiser_title,
  coalesce(d.campaign_id, f.campaign_id) as campaign_id,
  d.chapter_id,
  d.rail
from public.donations d
left join public.fundraisers f on f.id = d.fundraiser_id
where d.status in ('approved', 'refunded') and (not d.is_test or public.test_mode())
union all
select
  la.id,
  'adjustment',
  la.created_at::date,
  la.amount_cents,
  case when d.is_anonymous then null else coalesce(d.display_name, d.donor_name) end,
  coalesce('e:' || md5(lower(d.donor_email)), 'd:' || d.id::text),
  f.id,
  case when f.status = 'active' then f.slug  end,
  case when f.status = 'active' then f.title end,
  coalesce(d.campaign_id, f.campaign_id),
  d.chapter_id,
  d.rail
from public.ledger_adjustments la
join public.donations d on d.id = la.references_donation_id
left join public.fundraisers f on f.id = d.fundraiser_id
where d.status in ('approved', 'refunded')
  and (not d.is_test or public.test_mode()) and (not la.is_test or public.test_mode())
union all
select
  md5('recorded:' || yr.year::text || ':' || g.ordinality::text)::uuid as id,
  'recorded',
  coalesce(c.starts_at::date, make_date(yr.year, 12, 31)),
  (g.value->>'amount_cents')::bigint,
  nullif(trim(g.value->>'name'), ''),
  'n:' || lower(trim(g.value->>'name')),
  null, null, null,
  yr.campaign_id,
  null,
  'recorded'
from public.year_reports yr
cross join lateral jsonb_array_elements(yr.donors_list) with ordinality as g(value, ordinality)
left join public.campaigns c on c.id = yr.campaign_id
where yr.is_public and g.value->>'amount_cents' ~ '^[0-9]+$' and (not yr.is_test or public.test_mode())
union all
select
  s.id,
  'sponsorship',
  coalesce(e.starts_at::date, c.starts_at::date, make_date(s.year, 12, 31), now()::date),
  s.amount_cents,
  s.name,
  coalesce('s:' || s.supporter_id::text, 'n:' || lower(s.name)),
  null, null, null,
  s.campaign_id,
  s.chapter_id,
  'sponsorship'
from public.sponsors s
left join public.events e on e.id = s.event_id
left join public.campaigns c on c.id = s.campaign_id
where s.status in ('signed', 'active') and not s.is_in_kind and s.fund = 'impact'
  and coalesce(s.amount_cents, 0) > 0 and (not s.is_test or public.test_mode())
union all
-- a paid entry to an event whose fees go to the cause: money in, no donor
select
  r.id,
  'entry',
  r.created_at::date,
  r.amount_paid_cents,
  null,
  null,
  null, null, null,
  e.campaign_id,
  e.chapter_id,
  'entry'
from public.registrations r
join public.events e on e.id = r.event_id
where r.status = 'confirmed' and r.amount_paid_cents > 0 and e.fee_fund = 'impact'
  and (not r.is_test or public.test_mode()) and (not e.is_test or public.test_mode());

create or replace view public.v_public_ops_total
  with (security_invoker = off, security_barrier = on) as
select
  coalesce((select sum(s.amount_cents) from public.sponsors s
            where s.status in ('signed', 'active') and not s.is_in_kind and s.fund = 'operations'
              and (not s.is_test or public.test_mode())), 0)
  + coalesce((select sum(r.amount_paid_cents) from public.registrations r
              join public.events e on e.id = r.event_id
              where r.status = 'confirmed' and e.fee_fund = 'operations'
                and (not r.is_test or public.test_mode())), 0) as operations_cents;
