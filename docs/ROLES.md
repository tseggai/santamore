# People: role, title, listing and participation

Four different things used to blur into the word "role". Each has its own
word now, and each is set in one place.

| | What it is | Values | Who sets it | Where |
| --- | --- | --- | --- | --- |
| **Role** | What the person may do in the admin | None, Accounting, Editor, Director, Admin | admin only | People → Staff, on the person's record (`team_members.access`, applied to `profiles.role`) |
| **Title** | Free text under the name, e.g. "Co-founder, Treasurer" or "Chapter lead, Boka" | any | admin or editor | the same record (`team_members.title`) |
| **Listed under** | Where the person appears on About us | Team, Board, Grants committee, Volunteers | admin or editor | the same record (`team_members.kind`) |
| **Participation** | What a member has done on the site | Fundraiser, Athlete, Participant, Captain, Donor | the member, by acting | derived; never edited (People → Members) |

The role is the access: this is the usual meaning of "role" in access
control, and it is the one question an admin asks when adding someone.
Officer, chapter lead, treasurer and the like are titles; they say what a
person does, and the Role says what the console lets them do. The listing
is presentation: the About us page has a team, a board, a grants committee
and a volunteers list, and a person belongs to one of them.

## Staff

A staff record is a person: role, title, listing, photo, their own words,
contact, years active, and optionally the account they sign in with. The
role is granted to the person, not the login (`team_members.access`,
0076): it reaches the account the moment one is linked, or when the person
signs up with the record's email, so a record can carry Editor before its
holder has ever signed in. The Staff table shows such a role with "no
account yet"; the form offers to link an existing account with the
record's email.

Database triggers (0076) enforce who may do what: only an admin may set a
role above None or move the email or account of a record that has one
(otherwise an editor could route an admin record to themselves), an admin
cannot demote themselves, and a linked account takes the record's role
whenever the record gains an account or changes role. The person sees the
result at once: a chip with their role at the foot of their own console
rail and the way into the admin, since it is read on every request.

## Roles

One `role` per profile (`profiles.role`, migration 0061). Two levels exist
in the database: `is_staff()` opens the staff policies, `is_admin()` the
admin-only functions. Within staff, the console nav is the only thing that
separates Accounting from Editor: the database treats both as staff. That
is a pre-alpha choice, recorded here so nobody mistakes the nav for access
control.

| Value | Label | Console sections | Can also |
| --- | --- | --- | --- |
| `member` | None | none | run pages, join teams, register, vote, propose |
| `accounting` | Accounting | Overview, Money, Supporters, Documents (read only) | record gifts and hand-overs, year reports, sponsorships (staff at the database level) |
| `chapter_lead` | Editor | everything except what is admin-only | causes, events, beneficiaries, pages, staff records, inbox, content; may delete content records (supporters, beneficiaries, staff records, photos, news) |
| `director` | Director | everything except what is admin-only | what an editor can, plus the leadership documents under Documents (pay and staffing); the Executive Director's level (0082) |
| `admin` | Admin | everything | roles; deleting causes, events, pages and teams; marking test or live; test mode, purge, demo data; the leadership documents |

The value `chapter_lead` is historical; its label is Editor. What a role
opens is summarised in the console from the same table the nav uses
(`lib/roles.ts`), so the two cannot disagree.

`is_leadership()` (0082) is true for `director` and `admin`: the two levels
that read documents carrying pay figures. The documents ship with the code
(`content/legal/docs.json`), so the gate is in the app: every governance
document has an audience in `docs/legal/governance/manifest.json` (public on
the site, members in the member area at `/dashboard/dokumenti`, staff under
Documents, leadership under Documents for those two roles) and
`canReadLegalDoc()` in `lib/legal-docs.ts` decides; a document the role may
not read is not found. The pack editor (`/admin/dokumenti/paket`, roles
with that section) is handed only the drafts the role may read, and the
`legal_pack` policy (0083) keeps a leadership draft's rows to those roles.

What is admin-only is enforced in SQL (`is_admin()` inside the function or
policy), and the console shows those buttons only to admins. Deleting a
content record is a staff policy (`for all … is_staff()`), so editors can.

## Members

People → Members lists every account with its participation: Fundraiser
(holds a page), Athlete (Strava connected), Participant (registered or
going), Captain (leads a team), Donor (gave). These are facts about what
the person did, so nothing here is set by hand. The panel shows the
account's role read-only, with "View access level" for what it opens, and
links to the Staff record where it is set, or says how to grant one: add
the person to Staff and link the account. Anyone with a role above None
is, by definition, on the team.
