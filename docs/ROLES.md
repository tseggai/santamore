# Access levels

One `role` per profile (`profiles.role`, migration 0061). The database is the
barrier: `is_staff()` opens the staff policies, `is_admin()` the admin-only
functions (access levels, deletes, test mode, purge). The console shows each
role the sections it can use; nothing in the app relies on the nav alone.

| Role | Label | Console sections | Can also |
| --- | --- | --- | --- |
| `member` | Member | none | run pages, join teams, register, vote, propose |
| `accounting` | Accounting | Overview, Money, Supporters | record gifts and hand-overs, year reports, sponsorships |
| `chapter_lead` | Staff | everything except what is admin-only | causes, events, beneficiaries, pages, staff records, inbox, content |
| `admin` | Admin | everything | access levels, deletes, test mode, purge, demo data |

Staff records (`team_members`: officer, staff, board, committee, volunteer) are
the public "who we are"; they say nothing about access. Link a record to an
account only to tie the two, then set the access level on the account.

`lib/roles.ts` holds the list, the staff test and the sections per role.
