-- ============================================================================
-- Santamore — meetings: the agenda and the minutes, kept together
-- Apply AFTER 20261021000083_legal_pack_leadership.sql. Re-runnable.
--
-- One row per meeting: when, what it was called, who signed in, the agenda
-- and the minutes as Markdown. Staff write them in the console (Documents ›
-- Organisation and rules › Meetings); every signed-in member reads them in
-- the member area, which is the members' right to be informed. Nothing
-- here is public. The first row is the founders' meeting of 20 October
-- 2026, as minuted.
-- ============================================================================

create table if not exists public.meetings (
  id          uuid primary key default gen_random_uuid(),
  held_at     date not null,
  title       text not null check (length(title) between 1 and 200),
  attendees   text[] not null default '{}',
  agenda_md   text,
  minutes_md  text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.meetings is 'A meeting of the association: agenda and minutes together, Markdown. Staff write, members read.';

create index if not exists meetings_held_at_idx on public.meetings (held_at desc);

alter table public.meetings enable row level security;
revoke all on public.meetings from public, anon;
grant select on public.meetings to authenticated;
grant insert, update, delete on public.meetings to authenticated;

drop policy if exists meetings_members_read on public.meetings;
create policy meetings_members_read on public.meetings
  for select to authenticated using (true);

drop policy if exists meetings_staff_write on public.meetings;
create policy meetings_staff_write on public.meetings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- The founders' meeting of 20 October 2026.
insert into public.meetings (id, held_at, title, attendees, agenda_md, minutes_md)
values (
  'a6651445-d53a-4395-a414-fbab46028b5d',
  '2026-10-20',
  'Founding members and new members: causes, events, membership',
  array['Tseggai Debrezion', 'Sanya Milo', 'Dragana Durica', 'Harry Maxwell', 'Elena Medvedeva', 'Staša Ceranić'],
  $md$## 1. Causes: finalise the selection by Friday

- We have a couple of proposals and need more big-ticket ones.
- Porto Montenegro emails all residents today and tomorrow with the cause proposal; our Instagram Reels run in parallel. We expect new proposals from both.
- Tonight: brainstorm further causes, then narrow down to a shortlist of strong ones. Each shortlisted cause needs a target amount in euros, since the events are sized to it.

## 2. Events: they follow the cause

- If the selected cause needs X euros, the event or events exist to raise X. We do not pick events first.
- Brainstorm event ideas and their potential against that number: revenue per volunteer hour, repeatability, sponsorship inventory, and whether a first-timer could run it from a playbook.

## 3. Membership and roles

- Founding members: what the title means after registration.
- Becoming a member: how you join, what you can do, what you owe.
- The organisation chart: people per body, commitment, paid or unpaid.
- Decide today: everyone in the room who wants to join is recommended; the membership fee for 2026; two Board members and three Grants Committee members, named people not roles.$md$,
  $md$Founding members and new members, Tivat. Causes close on 30 October and the Assembly picks on that day; events follow the cause; membership types are set and the 2026 fee is waived.

## 1. Causes

The cause submission deadline moves from Friday 23 October to Friday 30 October 2026, on Sanya Milo's recommendation, so that organic media outreach has time to bring in proposals from the public. The current proposals are few and the group wants more big-ticket ones; Porto Montenegro's email to residents and the Instagram Reels run in parallel.

- Sanya Milo collects everything the media need (the ask, the link, the deadline, pictures, contact) and submits it for broadcast and publication by Friday 23 October.
- The Assembly decides on the cause, or causes, on 30 October 2026. Each shortlisted cause carries a target amount in euros, since the events are sized to it.

## 2. Events

Events follow the cause: once a cause and its target amount are chosen, one or more events are built to raise that amount.

- There may be one event or several per cause; the number follows the amount, not the other way round.
- Events must be inclusive of all members and stay true to Santamore's founding mission. An event aimed at high-profile donors and sponsors is welcome, but it is not to be an exclusive, lifestyle-based event by default.
- Harry Maxwell met Porto Palace to warm up a partnership for an event once a cause is chosen. The meeting went well; the conversation continues after 30 October.

## 3. Membership

The group went through the organisation chart and settled the types of membership and role. Every type is a member of the Assembly with one vote unless the table says otherwise; the roles are jobs on top of membership, not separate classes of member.

| Type | Who | Vote at the Assembly | Paid |
| --- | --- | --- | --- |
| Founding member | The five who signed the founding decision and the statute | Yes, one vote like every member; cannot sit on the Grants Committee; expelled only by two-thirds of all members | No |
| Member | Anyone admitted by the Assembly on a member's recommendation | Yes | No |
| Board member | 5 to 7 people elected by the Assembly for four years, independent majority | Yes, as a member | No |
| Grants Committee member | 3 to 5 people elected by the Assembly on the Board's proposal; no founders, Director or staff | Yes, as a member | No |
| Executive Director | The founder, elected by the founding assembly for six years, renewable | Yes, as a member | Yes, once the Operations Fund exists |
| Team lead, chapter lead, treasurer, volunteer coordinator | Members appointed to run a function or a town | Yes, as members | No; a chapter lead part-paid later |
| Staff | Employed by the Board | Only if also admitted as a member | Yes, from sponsorship |
| Volunteer, fundraiser, club connector | Anyone who helps; membership not required | Only if also a member | No |

The membership fee is waived for 2026, as decided at this meeting. The Board proposes to the Assembly whether a fee is charged for 2027 and in what amount, with the list of member benefits, and the Assembly decides each year; it may set the fee at zero.

## 4. Who attends which meeting, who receives updates

The outline below is the proposal to adopt; it is also Article 14 of the Organisation and roles document.

| Meeting or update | Attends and decides | Attends without a vote | Receives the update only |
| --- | --- | --- | --- |
| Assembly, at least once a year | Every member, founders included, in person or by proxy | Volunteers who are not members, invited guests | Donors, sponsors and partners: the annual report and the Impact Day invitation |
| Board, four meetings a year | Board members | The Executive Director; a team or chapter lead for their item, on invitation | Every member: a short note of the decisions after each meeting |
| Grants Committee, four sittings a year | Committee members | The Executive Director for the record; an applicant when heard | Every member: the published summary of each allocation |
| Operations meeting, weekly before an event, monthly otherwise | Executive Director, team leads, chapter leads, staff | Any member holding a task for that event | Volunteers: the event briefing from their lead the week before |
| Chapter meeting, before each chapter event and ten days before an Assembly | The chapter's officers and members | The Executive Director, on invitation | The Board: the chapter lead's quarterly report |

A member with no role attends the Assembly and receives the note after each Board meeting, the plan for the year, the results of every event and the Assembly invitation. A volunteer who is not a member receives the briefings for the events they work and the invitation to join.

## Decisions and actions

Decided at this meeting:

- The cause submission deadline is Friday 30 October 2026.
- The Assembly decides on the cause or causes on 30 October 2026.
- Events follow the cause; one or several per cause; inclusive of all members.
- The membership types are as set out in section 3; no membership fee for 2026; the Board proposes the 2027 fee and benefits to the Assembly.
- The statute is re-printed with the amendments adopted today and signed again by all founders before filing.

| Action | Owner | Due |
| --- | --- | --- |
| Collect and submit the media outreach material for broadcast and publication | Sanya Milo | 23 October 2026 |
| Keep the Porto Palace conversation warm until a cause is chosen | Harry Maxwell | after 30 October 2026 |
| Re-print the statute from the console, sign, add to the filing pack | Tseggai Debrezion and all founders | before filing |
| Adopt the meetings-and-updates outline (section 4) or amend it | Founding members | 30 October 2026 |
| Record the 2026 fee waiver in the first Assembly's decisions | President of the Assembly | first Assembly |$md$
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
