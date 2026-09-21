# Code audit — 2026-09-21

Structure and flow of information across the database, the admin console,
the public site and the member dashboard, run in three read-only passes and
verified against the code before anything was changed. Fixes are in the
commits of the same day; what was left open is listed at the end so it is
a decision, not an oversight.

## What was wrong and is fixed

**Money (migration 0062, "corrections are ledger rows")**

- `ledger_adjustments` were append-only with no test-mode exception, so purge,
  mark-as-test and every delete_* aborted as soon as one correction existed.
  The trigger now mirrors the donations one: test rows may change or go, a
  live row may only gain the test flag.
- A published hand-over could no longer be marked paid: the "paid_at once"
  branch was lost when the disbursement trigger was rewritten in 0055/0057.
  Reinstated.
- The public cause figure added adjustments; the staff cause figure did not;
  the summary and the year figures added them in their own sub-queries, and
  page and team totals summed `donations` directly. Corrections are now rows
  of `v_money_in_all` / `v_money_out_all` (`source = 'adjustment'`), and
  every figure is one sum over the same rows (docs/MONEY-MODEL.md).
- Page, team and leaderboard totals, the donor wall, challenge standings, the
  staff members view and every public content view ignored `is_test`. All
  honour it now, so going live hides test rows everywhere at once.
- `purge_test_data` left foreign keys dangling and tried to delete live money
  under a test parent, which the triggers refused. It now marks such
  children test first and detaches what the single deletes detach.
  `delete_campaign` counts live gifts that came in through a page.
  `purge_demo_data` is admin-only and copes with corrections.
- Three figures were summed in page code (sponsor cash on the year page,
  the sponsorship tile on the money summary, what the pages raised on the
  fundraisers board) and the overview chart summed raw `donations`. Each
  reads a column or a view now (`sponsor_cash_cents`, `pages_raised_cents`,
  `v_money_in_daily`).
- The cause ledger dialog summed a capped list of 300 rows for its total and
  counted rows as donors. It reads the cause's own figure now.

**Access**

- A member could insert a proposal as `chosen` with a cause attached through
  PostgREST. The insert policy allows `open` or `rejected` with no staff
  fields set.
- Buttons the SQL refuses to everyone but an admin (delete a cause or event,
  mark test or live) were shown to all staff. They show to admins only.
  Deleting a content record (supporter, beneficiary, staff record, photo,
  news) stays a staff action; docs/ROLES.md says so, and says plainly that
  the nav is the only thing separating accounting from staff in this phase.

**Records that would have drifted**

- A pledge on a page and a runner's cash log recorded no cause; attribution
  came from the page at read time, so a page moving to another cause would
  have moved the money. Gifts record their cause at insert, and a page with
  a pending pledge stays with its cause.
- A registration whose guest rows failed was reported as success with the
  payer owing for the party. It is rolled back and reported.
- The no-JS registration page offered expired tiers and omitted the
  organiser, bib and guest rules the event page applies.
- A Strava event that failed to process was answered "duplicate" on
  re-delivery. The key is forgotten on failure.
- A vote could be withdrawn from a chosen proposal.

**Runtime errors from the logs**

- The events list crashed: the page called helpers from a `"use client"`
  module. They live in `lib/event-linked.ts`.
- Both share-card routes threw "Failed to parse URL" on their fonts: the
  Node runtime cannot fetch a `new URL(..., import.meta.url)`. The fonts are
  read from disk and traced into the functions.

**Console hygiene**

- Actions revalidated the People routes that moved; a photo deleted without
  asking; a sponsorship deal carried no test chip; a draft page opened a
  public URL that does not exist; two strings still said People.

## Verified sound

- Every `.from()` and `.rpc()` name in the app exists in the migrations;
  every migration has a row in `supabase/status.sql`.
- All `v_public_*` views are definer views with `security_barrier`; no
  donor email, phone, payment reference, PAN token or private note reaches
  the anon role; the internal ledger views have no grants at all.
- Every RPC callable by `authenticated` checks its own authorization; the
  immutability triggers allow exactly: approved → refunded, message
  moderation, `paid_at` once, and the test flag.
- Every server action validates with zod first and scopes writes by the
  session user or RLS; the service role appears only where the schema
  forbids client writes, each time after an ownership check; `"use server"`
  files export only async functions; no `"use client"` module reads
  `process.env`; every server-side variable is in `.env.example`.
- Message files have identical key sets; no hard-coded user-facing English
  outside the share cards.
- Money is integer cents everywhere; a money figure is never set in the
  display face.

## Left open, by decision

- Accounting is staff at the database level. Splitting the policies so
  accounting can only write money records is real work; do it before an
  accounting account that is not also trusted staff exists.
- The donate form has a honeypot but no rate limit. Add a per-IP throttle
  before go-live (brief §15 Task 8).
- The Strava webhook processes after responding; a failure is retried only
  if Strava re-delivers. A small job re-processing `webhook_events` with
  `processed_at is null` would close that.
- Money lists (incoming, outgoing, registrations, inbox, photos overview)
  are plain tables, not `DataTable`, and show no test chip. Convert when
  they next change.
- Share-card labels are hard-coded per locale in the two OG routes.
- A refund adjustment is the gross amount while the ledger counts net, so a
  refunded gift whose donor covered the fee leaves the fee as a negative
  line. That is the truth of the money; documented, not changed.
- Cosmetic: `MemberRow.team_only` is never produced; `KINDS_BY_MODE.all` is
  unused; six tab wrappers could be one; some action files live under
  redirect-only folders.
