-- 0031 · A donor wall for a year recorded before the ledger.
-- 2025's gifts were taken on another platform; the names its donors chose
-- to show belong with the 2025 report, not in this ledger. Re-runnable.

alter table public.year_reports
  -- [{name, amount_cents}] — "Anonymous" stays "Anonymous".
  add column if not exists donors_list jsonb not null default '[]'::jsonb;

create or replace view public.v_public_year_reports
  with (security_invoker = off, security_barrier = on) as
select year, headline, summary_md, plan_md, volunteers, beneficiaries, venues,
       is_legacy, figures, events, supporters, beneficiaries_list, donors_list
from public.year_reports
where is_public;

grant select on public.v_public_year_reports to anon, authenticated;
