# Money model — one ledger, every figure derived from it

_Audit of 2026-09-20 and the rule that came out of it._

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

Migration `20260920000054_one_ledger.sql` implements it:

```
v_money_in_all      every euro in, every cause     (internal, no grants)
v_money_out_all     every euro out, every cause    (internal, no grants)
      │
      ├── v_public_ledger_in / v_public_ledger_out   the same rows, public causes only,
      │                                              with `source` = ledger | recorded | sponsorship
      ├── v_public_ledger_summary                    sums of those rows (home, admin overview, OG image)
      ├── v_public_year_stats                        the same rows by year (money page)
      ├── v_public_campaigns                         the same rows by cause (cause page, causes list, donate)
      ├── v_public_ops_total                         operations-fund cash + entry fees only
      └── v_campaign_totals                          the same rows by cause, all causes, staff only
```

Each row carries a `source`, so the public ledger can say where a row comes from (the `RECORDED` and `SPONSOR` pills), and a `donor_key` (a hashed email, a name, or a supporter id) so donor counts are distinct across sources without exposing anything.

## What each surface reads now

| Surface | Reads | Notes |
|---|---|---|
| Home hero and "every euro" figures | `v_public_ledger_summary` | |
| Admin overview, Money summary | `v_public_ledger_summary`, `v_public_ops_total` | |
| Money page, all years | `v_public_ledger_summary`, `v_public_ledger_in/out` | |
| Money page, one year | `v_public_year_stats` for the figures, `v_public_ledger_in/out` windowed by `entry_date` for the lists | the donor wall and the hand-over list are grouped from the rows; the report contributes only events before the site and volunteers by name |
| Cause page, causes list, hero slides, donate sheet | `v_public_campaigns` | raised, donor count, handed over |
| Cause ledger dialog, CSV exports | `v_public_ledger_in/out` | filtered by `cause_slug` |
| Admin causes list, admin years page | `v_campaign_totals` | published and draft causes alike |
| Leaderboards, pages, teams | `v_fundraiser_totals`, `v_team_totals` | ledger donations by page; pages are ledger-era by nature |
| Chapter totals | `v_chapter_totals` | ledger only; recorded rows have no chapter |

## Cause state

`lib/cause-status.ts` derives a cause's state from the same figures: ended when its end date has passed, goal reached when raised meets the goal, completed when ended or when everything raised was handed over. A completed cause takes no more money: its Donate and Raise buttons give way to "See where the money went", and the donate sheet's flagship picks the most recent open cause.

## Recording a year that predates the ledger

Enter the recorded gifts and hand-overs on the year report (Money → Years) and name the cause on the report. They become rows of the ledger with `source = 'recorded'`, and every figure follows. Migration 0053 shows the pattern for 2025: the hand-over amounts are computed from the recorded total, not typed.

## When adding a figure

Ask which rows it sums. If the answer is not "rows of `v_money_in_all` or `v_money_out_all`", the figure will drift from the others. Add a column to a view rather than a computation to a page.
