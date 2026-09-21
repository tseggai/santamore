# Money model — one ledger, every figure derived from it

_Audit of 2026-09-20 and the rule that came out of it; corrections folded in on 2026-09-21 (docs/AUDIT.md)._

## The problem the audit found

Money reaches Santamore through three kinds of record, and leaves through two:

| Direction | Record | Where it lives |
|---|---|---|
| in | a donation matched in the ledger | `donations` (approved or refunded) + `ledger_adjustments` |
| in | a gift recorded on a year report, from before the ledger | `year_reports.donors_list` |
| in | sponsorship cash that went to the beneficiaries | `sponsors` with `fund = 'impact'` |
| out | a published hand-over | `disbursements` |
| out | a hand-over recorded on a year report | `year_reports.beneficiaries_list` |

Until migration 0054, every surface summed its own mix of these:

- the home page and the admin overview used the ledger only, so they showed €2,274.80 while the 2025 cause showed €6,925;
- the cause page counted all three kinds of money in, but its "Ledger for this cause" dialog and the CSV exports listed ledger rows only, so a cause with €6,925 raised had a ledger of "€0 · 0 entries";
- the year page took the ledger view and added the report's lists on top, in page code, and at one point counted sponsorship cash twice;
- the admin causes list and the admin years page each recomputed "raised" with their own queries;
- the operations total counted every sponsor's cash, including the cash that had gone to beneficiaries.

## The rule

**There is one money-in ledger and one money-out ledger. Every figure on every page is a sum over their rows.** Nothing is typed in, and no page adds a list on top of a view.

Migrations `20260920000054_one_ledger.sql` and `20260920000062_ledger_integrity.sql` implement it:

```
v_money_in_all      every euro in, every cause     (internal, no grants)
v_money_out_all     every euro out, every cause    (internal, no grants)
      │             rows: ledger | adjustment | recorded | sponsorship
      ├── v_public_ledger_in / v_public_ledger_out   the same rows, public causes only
      ├── v_public_ledger_summary                    sums of those rows (home, admin overview, OG image)
      ├── v_public_year_stats                        the same rows by year, plus sponsor cash of the year
      ├── v_public_campaigns                         the same rows by cause, plus what its pages raised
      ├── v_campaign_totals                          the same rows by cause, all causes, staff only
      ├── v_fundraiser_totals / v_team_totals        the same rows by page and by team
      │     └── v_leaderboard / v_leaderboard_teams
      ├── v_staff_members                            raised and given per account, from the same rows
      ├── v_donors / v_donor_gifts                   the same rows by donor, staff only (Donors tab)
      ├── v_money_in_daily                           the same rows by day, staff only (overview chart)
      └── v_public_ops_total                         operations-fund cash + entry fees only
```

A correction (`ledger_adjustments`) is a row of the ledger like any other, with `source = 'adjustment'`, the donor or beneficiary of the row it corrects, and a signed amount. Nothing sums adjustments separately any more; the public ledger lists them under the entries with their reason (`v_public_ledger_adjustments`), and the CSV exports do the same.

Each row carries a `source`, so the public ledger can say where a row comes from (the `RECORDED` and `SPONSOR` pills), and a `donor_key` (a hashed email, a name, or a supporter id) so donor counts are distinct across sources without exposing anything.

## What each surface reads now

| Surface | Reads | Notes |
|---|---|---|
| Home hero and "every euro" figures | `v_public_ledger_summary` | |
| Admin overview, Money summary | `v_public_ledger_summary`, `v_public_ops_total` | |
| Money page, all years | `v_public_ledger_summary`, `v_public_ledger_in/out` | |
| Money page, one year | `v_public_year_stats` for the figures, `v_public_ledger_in/out` windowed by `entry_date` for the lists | the donor wall and the hand-over list are grouped from the rows; the report contributes only events before the site and volunteers by name |
| Cause page, causes list, hero slides, donate sheet | `v_public_campaigns` | raised, donor count, handed over |
| Cause ledger dialog | `v_public_campaigns` for the figure, `v_public_ledger_in` for the list | filtered by `cause_slug` |
| CSV exports | `v_public_ledger_in/out` | entries, then corrections with their reason |
| Admin causes list, admin years page | `v_campaign_totals` | published and draft causes alike |
| Admin overview chart | `v_money_in_daily` | last 30 days |
| Leaderboards, pages, teams, fundraisers board | `v_fundraiser_totals`, `v_team_totals`, `v_public_campaigns.pages_raised_cents` | the same rows by page |
| Supporters → Fundraisers, Participants (raised, given) | `v_staff_members` | the same rows by account |
| Supporters → Donors | `v_donors`, `v_donor_gifts` | the same rows by donor, account or not |
| Chapter totals | `v_chapter_totals` | ledger only; recorded rows have no chapter |

## Cause state

`lib/cause-status.ts` derives a cause's state from the same figures: ended when its end date has passed, goal reached when raised meets the goal, completed when ended or when everything raised was handed over. A completed cause takes no more money: its Donate and Raise buttons give way to "See where the money went", and the donate sheet's flagship picks the most recent open cause.

## Recording a year that predates the ledger

Enter the recorded gifts and hand-overs on the year report (Money → Years) and name the cause on the report. They become rows of the ledger with `source = 'recorded'`, and every figure follows. Migration 0053 shows the pattern for 2025: the hand-over amounts are computed from the recorded total, not typed.

## When adding a figure

Ask which rows it sums. If the answer is not "rows of `v_money_in_all` or `v_money_out_all`", the figure will drift from the others. Add a column to a view rather than a computation to a page.

## Test mode

Migration 0055 adds a site-wide switch (`site_settings.test_mode`, read through `test_mode()`). While it is on, every cause, event, page, team, registration, gift, adjustment, hand-over, sponsorship, supporter, proposal, beneficiary and year report is created with `is_test = true`. Consequences:

- test gifts, corrections and hand-overs are not immutable, and the delete functions treat test money as removable;
- every `v_public_*` view and every total includes test rows only while test mode is on, so going live hides them at once;
- `purge_test_data()` (admin) removes every test row and everything that hangs off a test cause or event, and nothing else;
- `set_record_test(kind, id, test)` (admin, migration 0059) flips one cause, event, page, team, supporter, beneficiary or proposal and everything attached to it either way, and `set_year_report_test(year, test)` does the same for a year report. Marking as test is the one edit the immutability triggers allow on live money (gifts, corrections and hand-overs alike); marking as live makes the money immutable again. A child of a parent that stays test still goes with the purge: the purge marks it test first, then removes it.

Immutability, precisely: an approved or refunded gift allows approved → refunded, message moderation and the test flag; a published hand-over allows `paid_at` once and the test flag; a correction allows the test flag. Everything else is refused, and a correction is the way to change a figure.

The switch and the purge live under Settings → Test & demo. Every admin list shows a red "Test" chip on test rows and offers "Mark as test data" / "Mark as live" on a selection (a year report has a checkbox in its form), so after a practice run the records worth keeping are qualified and the rest deleted one by one or purged together. The console badge reads "Test mode" and the public site shows a red bar while it is on.
