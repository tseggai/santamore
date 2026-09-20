-- ============================================================================
-- Santamore — test mode: practise freely, then go live
-- Apply AFTER 20260920000054_one_ledger.sql. Re-runnable.
--
-- While test mode is on, every cause, event, page, team, registration,
-- gift, hand-over, sponsorship, supporter, proposal, beneficiary and year
-- report created is marked is_test. Test money is not immutable, test rows
-- vanish from the public money and public listings the moment test mode
-- is switched off, and "purge test data" removes them all. Live rows are
-- untouched by any of it. Admin only, like every switch that matters.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1 ─ the switch
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from public, anon, authenticated;
insert into public.site_settings (key, value) values ('test_mode', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.test_mode()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::boolean from public.site_settings where key = 'test_mode'), false);
$$;
revoke all on function public.test_mode() from public;
grant execute on function public.test_mode() to anon, authenticated;

create or replace function public.set_test_mode(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.site_settings (key, value, updated_at) values ('test_mode', to_jsonb(p_on), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return p_on;
end;
$$;
revoke all on function public.set_test_mode(boolean) from public;
grant execute on function public.set_test_mode(boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2 ─ every record says whether it was made in test mode
-- ─────────────────────────────────────────────────────────────────────────
alter table public.campaigns          add column if not exists is_test boolean not null default public.test_mode();
alter table public.events             add column if not exists is_test boolean not null default public.test_mode();
alter table public.donations          add column if not exists is_test boolean not null default public.test_mode();
alter table public.ledger_adjustments add column if not exists is_test boolean not null default public.test_mode();
alter table public.disbursements      add column if not exists is_test boolean not null default public.test_mode();
alter table public.fundraisers        add column if not exists is_test boolean not null default public.test_mode();
alter table public.teams              add column if not exists is_test boolean not null default public.test_mode();
alter table public.registrations      add column if not exists is_test boolean not null default public.test_mode();
alter table public.event_rsvps        add column if not exists is_test boolean not null default public.test_mode();
alter table public.sponsors           add column if not exists is_test boolean not null default public.test_mode();
alter table public.supporters         add column if not exists is_test boolean not null default public.test_mode();
alter table public.cause_proposals    add column if not exists is_test boolean not null default public.test_mode();
alter table public.beneficiaries      add column if not exists is_test boolean not null default public.test_mode();
alter table public.year_reports       add column if not exists is_test boolean not null default public.test_mode();

-- ─────────────────────────────────────────────────────────────────────────
-- 3 ─ test money is not immutable
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_donation_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A gift made in test mode is practice: it may change or go.
  if old.is_test then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('approved', 'refunded') then
      raise exception 'donations: % rows are immutable and cannot be deleted', old.status;
    end if;
    return old;
  end if;

  if old.status in ('approved', 'refunded') then
    if to_jsonb(new) - 'is_message_hidden' - 'net_cents'
       = to_jsonb(old) - 'is_message_hidden' - 'net_cents' then
      return new;
    end if;
    if old.status = 'approved'
       and new.status = 'refunded'
       and to_jsonb(new) - 'status' - 'net_cents'
         = to_jsonb(old) - 'status' - 'net_cents' then
      return new;
    end if;
    raise exception 'donations: % rows are immutable (only approved -> refunded or message moderation, changing nothing else, is allowed; corrections go in ledger_adjustments)', old.status;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_disbursement_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_test then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if old.published_at is not null then
    raise exception 'disbursements: published rows are immutable (corrections go in ledger_adjustments)';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4 ─ test rows count only while test mode is on
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_money_in_all cascade;
create view public.v_money_in_all as
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
  and coalesce(s.amount_cents, 0) > 0 and (not s.is_test or public.test_mode());

drop view if exists public.v_money_out_all cascade;
create view public.v_money_out_all as
select
  db.id,
  'ledger'::text as source,
  (coalesce(db.paid_at, db.published_at))::date as entry_date,
  db.amount_cents,
  db.beneficiary_label,
  db.category,
  db.chapter_id,
  db.campaign_id,
  db.documentation_paths,
  db.committee_decision_ref,
  (db.paid_at is not null) as is_paid
from public.disbursements db
where db.published_at is not null and (not db.is_test or public.test_mode())
union all
select
  md5('handover:' || yr.year::text || ':' || h.ordinality::text)::uuid,
  'recorded',
  coalesce(c.starts_at::date, make_date(yr.year, 12, 31)),
  (h.value->>'amount_cents')::bigint,
  trim(h.value->>'label'),
  null,
  null,
  yr.campaign_id,
  '{}'::text[],
  null,
  true
from public.year_reports yr
cross join lateral jsonb_array_elements(yr.beneficiaries_list) with ordinality as h(value, ordinality)
left join public.campaigns c on c.id = yr.campaign_id
where yr.is_public and h.value->>'amount_cents' ~ '^[0-9]+$'
  and (h.value->>'amount_cents')::bigint > 0 and (not yr.is_test or public.test_mode());

revoke all on public.v_money_in_all, public.v_money_out_all from public, anon, authenticated;

-- the views built on them, unchanged in shape (dropped by the cascade above)
create view public.v_public_ledger_in
  with (security_invoker = off, security_barrier = on) as
select
  m.id, m.entry_date, m.amount_cents, m.display_name, m.fundraiser_slug, m.fundraiser_title,
  case when c.is_public then c.slug  end as campaign_slug,
  case when c.is_public then c.title end as campaign_title,
  ch.slug as chapter_slug,
  m.rail,
  case when c.is_public then c.slug end as cause_slug,
  m.source
from public.v_money_in_all m
left join public.campaigns c on c.id = m.campaign_id
left join public.chapters ch on ch.id = m.chapter_id
where m.source = 'ledger' or m.campaign_id is null or c.is_public;

create view public.v_public_ledger_out
  with (security_invoker = off, security_barrier = on) as
select
  m.id, m.entry_date, m.amount_cents, m.beneficiary_label, m.category,
  ch.slug as chapter_slug, m.documentation_paths, m.committee_decision_ref, m.source, m.is_paid,
  case when c.is_public then c.slug end as cause_slug
from public.v_money_out_all m
left join public.campaigns c on c.id = m.campaign_id
left join public.chapters ch on ch.id = m.chapter_id
where m.source = 'ledger' or m.campaign_id is null or c.is_public;

grant select on public.v_public_ledger_in, public.v_public_ledger_out to anon, authenticated;

create view public.v_public_ledger_summary
  with (security_invoker = off, security_barrier = on) as
with received as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_in), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.donations dd on dd.id = la.references_donation_id
                   where dd.status in ('approved', 'refunded') and (not la.is_test or public.test_mode())), 0) as cents
), disbursed as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_out where is_paid), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.disbursements dbb on dbb.id = la.references_disbursement_id
                   where dbb.published_at is not null and dbb.paid_at is not null and (not la.is_test or public.test_mode())), 0) as cents
), approved_pending as (
  select coalesce((select sum(amount_cents) from public.v_public_ledger_out where not is_paid), 0)
       + coalesce((select sum(la.amount_cents)
                   from public.ledger_adjustments la
                   join public.disbursements dbb on dbb.id = la.references_disbursement_id
                   where dbb.published_at is not null and dbb.paid_at is null and (not la.is_test or public.test_mode())), 0) as cents
)
select
  r.cents as received_cents,
  d.cents as disbursed_cents,
  ap.cents as approved_pending_cents,
  r.cents - d.cents - ap.cents as unallocated_cents
from received r, disbursed d, approved_pending ap;
grant select on public.v_public_ledger_summary to anon, authenticated;

create view public.v_public_year_stats
  with (security_invoker = off, security_barrier = on) as
with years as (
  select generate_series(2025, greatest(extract(year from now())::int + 1,
                                        coalesce((select max(year) from public.year_reports where is_public), 2025))) as year
),
money_in as (
  select extract(year from m.entry_date)::int as year, sum(m.amount_cents) as cents, count(distinct m.donor_key) as donors
    from public.v_money_in_all m
    left join public.campaigns c on c.id = m.campaign_id
   where m.source = 'ledger' or m.campaign_id is null or c.is_public
   group by 1
),
adj_in as (
  select extract(year from la.created_at)::int as year, sum(la.amount_cents) as cents
    from public.ledger_adjustments la
    join public.donations d on d.id = la.references_donation_id
   where d.status in ('approved', 'refunded') and (not la.is_test or public.test_mode())
   group by 1
),
money_out as (
  select extract(year from m.entry_date)::int as year, sum(m.amount_cents) as cents, count(distinct m.beneficiary_label) as beneficiaries
    from public.v_money_out_all m
    left join public.campaigns c on c.id = m.campaign_id
   where m.is_paid and (m.source = 'ledger' or m.campaign_id is null or c.is_public)
   group by 1
),
adj_out as (
  select extract(year from la.created_at)::int as year, sum(la.amount_cents) as cents
    from public.ledger_adjustments la
    join public.disbursements db on db.id = la.references_disbursement_id
   where db.published_at is not null and db.paid_at is not null and (not la.is_test or public.test_mode())
   group by 1
),
events as (
  select extract(year from e.starts_at)::int as year, count(*) as events
    from public.events e
   where e.is_published and e.starts_at is not null and (not e.is_test or public.test_mode())
   group by 1
),
runners as (
  select extract(year from e.starts_at)::int as year, count(*) as runners, sum(r.amount_paid_cents) as fees
    from public.registrations r
    join public.events e on e.id = r.event_id
   where r.status = 'confirmed' and e.starts_at is not null and (not r.is_test or public.test_mode())
   group by 1
),
pages as (
  select extract(year from coalesce(c.starts_at, f.created_at))::int as year, count(*) as pages
    from public.fundraisers f
    left join public.campaigns c on c.id = f.campaign_id
   where f.status = 'active' and (not f.is_test or public.test_mode())
   group by 1
),
teams as (
  select extract(year from coalesce(c.starts_at, t.created_at))::int as year, count(*) as teams
    from public.teams t
    left join public.campaigns c on c.id = t.campaign_id
   where not t.is_test or public.test_mode()
   group by 1
),
sponsor_rows as (
  select s.supporter_id, s.name, s.amount_cents, s.is_in_kind, s.fund,
         coalesce(s.year, extract(year from coalesce(e.starts_at, c.starts_at))::int) as year
    from public.sponsors s
    left join public.events e on e.id = s.event_id
    left join public.campaigns c on c.id = s.campaign_id
   where s.status in ('signed', 'active') and (not s.is_test or public.test_mode())
),
offer_rows as (
  select p.supporter_id, p.partner_name as name, extract(year from coalesce(p.starts_at, p.ends_at))::int as year
    from public.perk_challenges p
   where p.is_active
),
supporters as (
  select u.year, count(distinct coalesce(u.supporter_id::text, u.name)) as supporters
    from (select supporter_id, name, year from sponsor_rows
          union all
          select supporter_id, name, year from offer_rows) u
    left join public.supporters su on su.id = u.supporter_id
   where u.year is not null and coalesce(su.kind, 'sponsor') = 'sponsor'
   group by 1
),
ops_cash as (
  select year, sum(amount_cents) as cents
    from sponsor_rows
   where not is_in_kind and fund = 'operations' and year is not null
   group by 1
)
select
  y.year,
  coalesce(mi.cents, 0) + coalesce(ai.cents, 0) as received_cents,
  coalesce(mo.cents, 0) + coalesce(ao.cents, 0) as disbursed_cents,
  coalesce(oc.cents, 0) + coalesce(ru.fees, 0)  as operations_cents,
  coalesce(mi.donors, 0)                         as donor_count,
  coalesce(ru.runners, 0)                        as runner_count,
  coalesce(pg.pages, 0)                          as page_count,
  coalesce(tm.teams, 0)                          as team_count,
  coalesce(ev.events, 0)                         as event_count,
  coalesce(su.supporters, 0)                     as supporter_count,
  coalesce(mo.beneficiaries, 0)                  as beneficiary_count
from years y
left join money_in   mi on mi.year = y.year
left join adj_in     ai on ai.year = y.year
left join money_out  mo on mo.year = y.year
left join adj_out    ao on ao.year = y.year
left join events     ev on ev.year = y.year
left join runners    ru on ru.year = y.year
left join pages      pg on pg.year = y.year
left join teams      tm on tm.year = y.year
left join supporters su on su.year = y.year
left join ops_cash   oc on oc.year = y.year
order by y.year;
grant select on public.v_public_year_stats to anon, authenticated;

create view public.v_public_campaigns
  with (security_invoker = off, security_barrier = on) as
select
  c.slug, c.title, c.description, c.goal_cents, c.payment_reference, c.suggested_amounts,
  c.starts_at, c.ends_at, c.beneficiary_summary,
  ch.slug as chapter_slug, ch.name as chapter_name,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0)
  + coalesce((select sum(la.amount_cents)
              from public.ledger_adjustments la
              join public.donations dd on dd.id = la.references_donation_id
              left join public.fundraisers f2 on f2.id = dd.fundraiser_id
              where dd.status in ('approved', 'refunded')
                and coalesce(dd.campaign_id, f2.campaign_id) = c.id
                and (not la.is_test or public.test_mode())), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  c.cover_path,
  c.id,
  coalesce((select sum(m.amount_cents) from public.v_money_out_all m where m.campaign_id = c.id and m.is_paid), 0) as disbursed_cents
from public.campaigns c
join public.chapters ch on ch.id = c.chapter_id
where c.is_public and (not c.is_test or public.test_mode());
grant select on public.v_public_campaigns to anon, authenticated;

create view public.v_campaign_totals
  with (security_invoker = off, security_barrier = on) as
select
  c.id,
  coalesce((select sum(m.amount_cents) from public.v_money_in_all m where m.campaign_id = c.id), 0) as raised_cents,
  coalesce((select count(distinct m.donor_key) from public.v_money_in_all m where m.campaign_id = c.id), 0) as donor_count,
  coalesce((select sum(m.amount_cents) from public.v_money_out_all m where m.campaign_id = c.id and m.is_paid), 0) as disbursed_cents,
  coalesce((select count(*) from public.v_money_out_all m where m.campaign_id = c.id), 0) as hand_overs
from public.campaigns c
where public.is_staff();
grant select on public.v_campaign_totals to authenticated;

-- public events: test events only while test mode is on
create or replace view public.v_public_events
  with (security_invoker = off, security_barrier = on) as
select
  e.id, e.slug, e.name, e.starts_at, e.venue, e.registration_opens_at, e.registration_closes_at, e.distances,
  c.slug as campaign_slug, e.kind, e.challenge_metric, e.ends_at, e.price_tiers, e.capacity,
  (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'going') as going_count,
  e.description, e.offers_shirts, e.cover_path, c.title as campaign_title,
  e.hosting, e.external_url, e.bib_policy, e.bib_capacity, e.max_guests,
  (select count(*) from public.registrations r where r.event_id = e.id and r.needs_bib and r.status <> 'cancelled') as bibs_claimed,
  e.registration_mode, e.organizer_name
from public.events e
left join public.campaigns c on c.id = e.campaign_id and c.is_public
where e.is_published and (not e.is_test or public.test_mode());
grant select on public.v_public_events to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5 ─ deleting: test money never keeps a record
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.delete_campaign(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select title into v_title from public.campaigns where id = p_id;
  if v_title is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select count(*) into v_count from public.donations where campaign_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.disbursements where campaign_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'handovers', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.fundraisers where campaign_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'pages', 'count', v_count, 'name', v_title);
  end if;
  select count(*) into v_count from public.teams where campaign_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'teams', 'count', v_count, 'name', v_title);
  end if;

  -- test money and test pages go with the cause
  delete from public.ledger_adjustments la using public.donations d
   where la.references_donation_id = d.id and d.campaign_id = p_id and d.is_test;
  delete from public.ledger_adjustments la using public.disbursements db
   where la.references_disbursement_id = db.id and db.campaign_id = p_id and db.is_test;
  delete from public.donations where campaign_id = p_id and is_test;
  delete from public.disbursements where campaign_id = p_id and is_test;
  delete from public.ask_list_items a using public.fundraisers f where a.fundraiser_id = f.id and f.campaign_id = p_id and f.is_test;
  delete from public.fundraisers where campaign_id = p_id and is_test;
  delete from public.teams where campaign_id = p_id and is_test;

  update public.events          set campaign_id = null where campaign_id = p_id;
  update public.sponsors        set campaign_id = null where campaign_id = p_id;
  update public.gallery_items   set campaign_id = null where campaign_id = p_id;
  update public.cause_proposals set campaign_id = null where campaign_id = p_id;
  update public.beneficiaries   set campaign_id = null where campaign_id = p_id;
  update public.year_reports    set campaign_id = null where campaign_id = p_id;
  delete from public.campaigns where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_title);
end;
$$;

create or replace function public.delete_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text;
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select name into v_name from public.events where id = p_id;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select count(*) into v_count from public.donations where event_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_name);
  end if;
  select count(*) into v_count from public.registrations
   where event_id = p_id and amount_paid_cents > 0 and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'paid', 'count', v_count, 'name', v_name);
  end if;

  delete from public.ledger_adjustments la using public.donations d
   where la.references_donation_id = d.id and d.event_id = p_id and d.is_test;
  delete from public.donations where event_id = p_id and is_test;
  update public.fundraisers     set event_id = null where event_id = p_id;
  update public.teams           set event_id = null where event_id = p_id;
  delete from public.registrations where event_id = p_id;
  delete from public.event_rsvps   where event_id = p_id;
  update public.perk_challenges set event_id = null where event_id = p_id;
  update public.sponsors        set event_id = null where event_id = p_id;
  update public.gallery_items   set event_id = null where event_id = p_id;
  delete from public.events where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

create or replace function public.delete_fundraiser(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_photo text;
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select title, photo_path into v_title, v_photo from public.fundraisers where id = p_id;
  if v_title is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  select count(*) into v_count from public.donations where fundraiser_id = p_id and not is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_title);
  end if;
  delete from public.ledger_adjustments la using public.donations d
   where la.references_donation_id = d.id and d.fundraiser_id = p_id and d.is_test;
  delete from public.donations where fundraiser_id = p_id and is_test;
  delete from public.ask_list_items where fundraiser_id = p_id;
  delete from public.activities where fundraiser_id = p_id;
  delete from public.fundraisers where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_title, 'photo_path', v_photo);
end;
$$;

create or replace function public.delete_team(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text;
  v_captain uuid;
  v_count   bigint;
begin
  select name, captain_id into v_name, v_captain from public.teams where id = p_id;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if not (public.is_admin() or v_captain = (select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select count(*) into v_count
    from public.donations d
    join public.fundraisers f on f.id = d.fundraiser_id
   where f.team_id = p_id and d.status in ('approved', 'refunded') and not d.is_test;
  if v_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'donations', 'count', v_count, 'name', v_name);
  end if;
  update public.fundraisers set team_id = null where team_id = p_id;
  delete from public.teams where id = p_id;
  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6 ─ purge: every test row, nothing else
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.purge_test_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
  total int := 0;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.ledger_adjustments la
   where la.is_test
      or exists (select 1 from public.donations d where d.id = la.references_donation_id and d.is_test)
      or exists (select 1 from public.disbursements db where db.id = la.references_disbursement_id and db.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.donations d
   where d.is_test
      or exists (select 1 from public.campaigns c where c.id = d.campaign_id and c.is_test)
      or exists (select 1 from public.fundraisers f where f.id = d.fundraiser_id and f.is_test)
      or exists (select 1 from public.events e where e.id = d.event_id and e.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.disbursements db
   where db.is_test or exists (select 1 from public.campaigns c where c.id = db.campaign_id and c.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.registrations r
   where r.is_test or exists (select 1 from public.events e where e.id = r.event_id and e.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.event_rsvps r
   where r.is_test or exists (select 1 from public.events e where e.id = r.event_id and e.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.ask_list_items a
   where exists (select 1 from public.fundraisers f where f.id = a.fundraiser_id
                    and (f.is_test or exists (select 1 from public.campaigns c where c.id = f.campaign_id and c.is_test)));
  delete from public.fundraisers f
   where f.is_test or exists (select 1 from public.campaigns c where c.id = f.campaign_id and c.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.teams t
   where t.is_test or exists (select 1 from public.campaigns c where c.id = t.campaign_id and c.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.cause_votes v
   where exists (select 1 from public.cause_proposals p where p.id = v.proposal_id and p.is_test);
  delete from public.cause_proposals where is_test;
  get diagnostics n = row_count; total := total + n;

  delete from public.sponsors s
   where s.is_test
      or exists (select 1 from public.supporters su where su.id = s.supporter_id and su.is_test)
      or exists (select 1 from public.campaigns c where c.id = s.campaign_id and c.is_test)
      or exists (select 1 from public.events e where e.id = s.event_id and e.is_test);
  get diagnostics n = row_count; total := total + n;

  delete from public.supporters where is_test;
  get diagnostics n = row_count; total := total + n;

  delete from public.beneficiaries b
   where b.is_test or exists (select 1 from public.campaigns c where c.id = b.campaign_id and c.is_test);
  get diagnostics n = row_count; total := total + n;

  update public.year_reports yr set campaign_id = null
   where exists (select 1 from public.campaigns c where c.id = yr.campaign_id and c.is_test);
  delete from public.year_reports where is_test;
  get diagnostics n = row_count; total := total + n;

  update public.perk_challenges p set event_id = null
   where exists (select 1 from public.events e where e.id = p.event_id and e.is_test);
  update public.gallery_items g set event_id = null
   where exists (select 1 from public.events e where e.id = g.event_id and e.is_test);
  update public.gallery_items g set campaign_id = null
   where exists (select 1 from public.campaigns c where c.id = g.campaign_id and c.is_test);
  update public.events e set campaign_id = null
   where exists (select 1 from public.campaigns c where c.id = e.campaign_id and c.is_test);

  delete from public.events where is_test;
  get diagnostics n = row_count; total := total + n;
  delete from public.campaigns where is_test;
  get diagnostics n = row_count; total := total + n;

  return jsonb_build_object('ok', true, 'deleted', total);
end;
$$;
revoke all on function public.purge_test_data() from public;
grant execute on function public.purge_test_data() to authenticated;

notify pgrst, 'reload schema';
