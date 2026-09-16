-- 0029 · Causes proposed by the community.
-- Anyone signed in may propose a cause. A short screening — yes/no
-- questions staff maintain — turns down what we cannot take on (a public
-- institution's duty, a business, a party) politely and on the spot; the
-- refused proposal is kept for staff to see, never shown publicly. What
-- passes is listed, members vote it up (one vote each), the five with most
-- votes form the shortlist, and staff choose from it: a chosen proposal
-- becomes a cause. Re-runnable.

-- 1 ─ screening questions -------------------------------------------------------
create table if not exists public.cause_criteria (
  id             uuid primary key default gen_random_uuid(),
  sort_order     integer not null default 0,
  question_me    text not null,
  question_en    text not null,
  question_ru    text not null,
  -- The answer that turns a proposal down.
  disqualify_on  boolean not null default true,
  reason_me      text not null,
  reason_en      text not null,
  reason_ru      text not null,
  is_active      boolean not null default true
);
alter table public.cause_criteria enable row level security;
grant select, insert, update, delete on public.cause_criteria to authenticated;
drop policy if exists cause_criteria_staff_all on public.cause_criteria;
create policy cause_criteria_staff_all on public.cause_criteria
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace view public.v_public_cause_criteria
  with (security_invoker = off, security_barrier = on) as
select id, sort_order, question_me, question_en, question_ru, disqualify_on, reason_me, reason_en, reason_ru
from public.cause_criteria
where is_active
order by sort_order, question_en;
grant select on public.v_public_cause_criteria to anon, authenticated;

-- Starting questions, written as a screen not as policy; staff edit them.
insert into public.cause_criteria (sort_order, question_me, question_en, question_ru, disqualify_on, reason_me, reason_en, reason_ru)
select * from (values
  (10, 'Da li je ovo nešto što je javna institucija (država, opština, bolnica, škola) zakonski dužna da obezbijedi?',
       'Is this something a public institution (the state, a municipality, a hospital, a school) is legally required to provide?',
       'Это то, что государственное учреждение (государство, муниципалитет, больница, школа) обязано обеспечить по закону?',
       true,
       'Ne preuzimamo obaveze javnih institucija — tamo pomažemo pritiskom, ne novcem.',
       'We do not take over a public institution''s duty — there we help with pressure, not money.',
       'Мы не берём на себя обязанности государственных учреждений — там мы помогаем давлением, а не деньгами.'),
  (20, 'Da li bi novac išao preduzeću, političkoj partiji ili vjerskoj organizaciji?',
       'Would the money go to a business, a political party or a religious organisation?',
       'Пойдут ли деньги бизнесу, политической партии или религиозной организации?',
       true,
       'Donacije idu samo ljudima i neprofitnim potrebama.',
       'Donations go only to people and non-profit needs.',
       'Пожертвования идут только людям и некоммерческим нуждам.'),
  (30, 'Da li je potreba u Crnoj Gori?',
       'Is the need in Montenegro?',
       'Нужда находится в Черногории?',
       false,
       'Za sada radimo samo u Crnoj Gori.',
       'For now we work only in Montenegro.',
       'Пока мы работаем только в Черногории.'),
  (40, 'Da li novac ide određenoj osobi, porodici ili grupi čiju potrebu možemo provjeriti?',
       'Does the money go to a specific person, family or group whose need we can verify?',
       'Идут ли деньги конкретному человеку, семье или группе, чью нужду мы можем проверить?',
       false,
       'Objavljujemo svaki euro s dokazom — zato mora postojati provjerljiv korisnik.',
       'We publish every euro with proof — so there has to be a verifiable beneficiary.',
       'Мы публикуем каждый евро с подтверждением — поэтому получатель должен быть проверяемым.')
) as seed(sort_order, question_me, question_en, question_ru, disqualify_on, reason_me, reason_en, reason_ru)
where not exists (select 1 from public.cause_criteria);

-- 2 ─ proposals and votes ---------------------------------------------------------
create table if not exists public.cause_proposals (
  id            uuid primary key default gen_random_uuid(),
  proposer_id   uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (length(title) between 4 and 120),
  summary       text not null check (length(summary) between 40 and 2000),
  location      text,
  beneficiary   text,
  amount_cents  bigint check (amount_cents is null or amount_cents >= 0),
  status        text not null default 'open'
                check (status in ('open', 'rejected', 'shortlisted', 'chosen', 'declined')),
  -- Which screening answers turned it down (text, so edits to the
  -- questions later never rewrite history).
  rejection_reasons text[] not null default '{}',
  staff_note    text,
  campaign_id   uuid references public.campaigns (id),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create index if not exists cause_proposals_status_idx on public.cause_proposals (status, created_at desc);

create table if not exists public.cause_votes (
  proposal_id uuid not null references public.cause_proposals (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

alter table public.cause_proposals enable row level security;
alter table public.cause_votes enable row level security;
grant select, insert on public.cause_proposals to authenticated;
grant update on public.cause_proposals to authenticated;
grant select, insert, delete on public.cause_votes to authenticated;

drop policy if exists cause_proposals_insert_own on public.cause_proposals;
create policy cause_proposals_insert_own on public.cause_proposals
  for insert to authenticated with check (proposer_id = (select auth.uid()));
drop policy if exists cause_proposals_select_own on public.cause_proposals;
create policy cause_proposals_select_own on public.cause_proposals
  for select to authenticated using (proposer_id = (select auth.uid()) or public.is_staff());
drop policy if exists cause_proposals_staff_update on public.cause_proposals;
create policy cause_proposals_staff_update on public.cause_proposals
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists cause_votes_own on public.cause_votes;
create policy cause_votes_own on public.cause_votes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Votes land only on proposals still in the running.
create or replace function public.enforce_vote_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.cause_proposals p
                  where p.id = new.proposal_id and p.status in ('open', 'shortlisted')) then
    raise exception 'cause_votes: this proposal is not open for votes';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cause_votes_target on public.cause_votes;
create trigger trg_cause_votes_target
  before insert on public.cause_votes
  for each row execute function public.enforce_vote_target();

-- 3 ─ the public list: what passed, how many votes, who is in the top five
create or replace view public.v_public_cause_proposals
  with (security_invoker = off, security_barrier = on) as
with counted as (
  select p.id, p.title, p.summary, p.location, p.beneficiary, p.amount_cents, p.status, p.created_at,
         split_part(coalesce(pr.full_name, ''), ' ', 1) as proposer_first_name,
         c.slug as campaign_slug,
         (select count(*) from public.cause_votes v where v.proposal_id = p.id) as vote_count
    from public.cause_proposals p
    join public.profiles pr on pr.id = p.proposer_id
    left join public.campaigns c on c.id = p.campaign_id and c.is_public
   where p.status in ('open', 'shortlisted', 'chosen')
)
select *,
       rank() over (partition by (status in ('open', 'shortlisted')) order by vote_count desc, created_at asc) as vote_rank
from counted;
grant select on public.v_public_cause_proposals to anon, authenticated;

-- The signed-in member's own votes (for the toggled state on the page).
create or replace view public.v_my_cause_votes
  with (security_invoker = off, security_barrier = on) as
select proposal_id from public.cause_votes where user_id = (select auth.uid());
grant select on public.v_my_cause_votes to authenticated;
