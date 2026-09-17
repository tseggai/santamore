-- 0030 · Years before this ledger existed.
-- 2025 happened on paper and in a bank statement, not in these tables.
-- Rather than back-filling donations we cannot document row by row, a
-- year report may carry its own figures and lists — marked as recorded
-- before the ledger, and shown as such. Where a legacy figure is set it
-- replaces the derived one for that year; lists are added to whatever the
-- database knows. Re-runnable.

alter table public.year_reports
  add column if not exists is_legacy       boolean not null default false,
  -- {received_cents, disbursed_cents, operations_cents, donors, runners,
  --  pages, teams, events, supporters} — any subset, integers.
  add column if not exists figures         jsonb not null default '{}'::jsonb,
  -- [{name, date (YYYY-MM-DD), venue}]
  add column if not exists events          jsonb not null default '[]'::jsonb,
  -- [name, ...]
  add column if not exists supporters      text[] not null default '{}',
  -- [{label, amount_cents}]
  add column if not exists beneficiaries_list jsonb not null default '[]'::jsonb;

create or replace view public.v_public_year_reports
  with (security_invoker = off, security_barrier = on) as
select year, headline, summary_md, plan_md, volunteers, beneficiaries, venues,
       is_legacy, figures, events, supporters, beneficiaries_list
from public.year_reports
where is_public;

grant select on public.v_public_year_reports to anon, authenticated;
