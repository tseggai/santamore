# Access levels

One `role` per profile (`profiles.role`, migration 0061). Two levels exist in
the database: `is_staff()` opens the staff policies, `is_admin()` the admin-only
functions. Within staff, the console nav is the only thing that separates
accounting from staff: the database treats both as staff. That is a pre-alpha
choice, recorded here so nobody mistakes the nav for access control.

| Role | Label | Console sections | Can also |
| --- | --- | --- | --- |
| `member` | Member | none | run pages, join teams, register, vote, propose |
| `accounting` | Accounting | Overview, Money, Supporters | record gifts and hand-overs, year reports, sponsorships (staff at the database level) |
| `chapter_lead` | Staff | everything except what is admin-only | causes, events, beneficiaries, pages, staff records, inbox, content; may delete content records (supporters, beneficiaries, staff records, photos, news) |
| `admin` | Admin | everything | access levels; deleting causes, events, pages and teams; marking test or live; test mode, purge, demo data |

What is admin-only is enforced in SQL (`is_admin()` inside the function or
policy), and the console shows those buttons only to admins. Deleting a
content record is a staff policy (`for all … is_staff()`), so staff can.

Staff records (`team_members`: officer, staff, board, committee, volunteer) are
the public "who we are"; they say nothing about access. Link a record to an
account only to tie the two, then set the access level on the account.

`lib/roles.ts` holds the list, the staff test and the sections per role.
