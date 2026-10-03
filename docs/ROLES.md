# People: roles, access and participation

Three different things used to be called "role". They are kept apart now,
each with its own word, and each set in one place.

| | What it is | Values | Who sets it | Where |
| --- | --- | --- | --- | --- |
| **Role** | The person's place on the team, shown on About us | Officer, Board, Grants committee, Chapter lead, Staff, Volunteer | admin or editor | People → Staff, on the person's record (`team_members.kind`) |
| **Title** | Free text under the name, e.g. "Co-founder, Treasurer" | any | admin or editor | the same record (`team_members.title`) |
| **Access** | What the person's account may do in the admin | None, Accounting, Editor, Admin | admin only | the same record, once an account is linked (`profiles.role`) |
| **Participation** | What a member has done on the site | Fundraiser, Athlete, Participant, Captain, Donor | the member, by acting | derived; never edited (People → Members) |

## Staff

A staff record is a person: role, title, photo, their own words, contact,
years active, and optionally the account they sign in with. Linking the
account is what makes an access level possible. When an account is linked,
the role's usual access is offered and the admin confirms or changes it:

| Role | Usual access |
| --- | --- |
| Officer, Chapter lead, Staff | Editor |
| Board, Grants committee, Volunteer | None |

Admin and Accounting are always chosen on purpose. The level is written
through `set_member_access()` (0069), admin only, and an admin cannot
demote themselves. The person sees the result at once: a chip with their
level at the foot of their own console rail and the way into the admin,
since the role is read on every request.

## Access levels

One `role` per profile (`profiles.role`, migration 0061). Two levels exist
in the database: `is_staff()` opens the staff policies, `is_admin()` the
admin-only functions. Within staff, the console nav is the only thing that
separates Accounting from Editor: the database treats both as staff. That
is a pre-alpha choice, recorded here so nobody mistakes the nav for access
control.

| Value | Label | Console sections | Can also |
| --- | --- | --- | --- |
| `member` | None | none | run pages, join teams, register, vote, propose |
| `accounting` | Accounting | Overview, Money, Supporters, Rules | record gifts and hand-overs, year reports, sponsorships (staff at the database level) |
| `chapter_lead` | Editor | everything except what is admin-only | causes, events, beneficiaries, pages, staff records, inbox, content; may delete content records (supporters, beneficiaries, staff records, photos, news) |
| `admin` | Admin | everything | access levels; deleting causes, events, pages and teams; marking test or live; test mode, purge, demo data |

The value `chapter_lead` is historical; its label is Editor, because
"chapter lead" is a role on the team (0075), not a level of access.

What is admin-only is enforced in SQL (`is_admin()` inside the function or
policy), and the console shows those buttons only to admins. Deleting a
content record is a staff policy (`for all … is_staff()`), so editors can.

## Members

People → Members lists every account with its participation: Fundraiser
(holds a page), Athlete (Strava connected), Participant (registered or
going), Captain (leads a team), Donor (gave). These are facts about what
the person did, so nothing here is set by hand. The panel shows the
account's access level read-only and links to the Staff record where it
is set, or says how to grant one: add the person to Staff and link the
account. Anyone with access to the admin is, by definition, on the team.

`lib/roles.ts` holds the access levels, the staff test and the sections
per level.
