# Prospects: who we ask for support

Console › Supporters › **Prospects** (`/admin/podrska/prospekti`, staff only).
The outreach list behind the sponsors: organisations we want to support us, the
contact for each, the stage of the ask, when to follow up, and a log of what was
sent. Tables: `prospects`, `prospect_activities` (migration 0088).

## Kinds

| Kind | Who | What we ask |
| --- | --- | --- |
| `sponsor` | Companies | A cash sponsorship at a tier (`/partneri`) |
| `in_kind` | Companies | Goods or services, booked like cash |
| `partner` | Municipality, tourism boards, clubs | To work with us |
| `media` | Newsrooms | To carry the story |
| `funder` | Grant makers | Their open calls |

## Where the list comes from

`content/prospects/catalogue.json` is the research: one entry per organisation,
read on the server only (`lib/server/prospect-catalogue.ts`). **Develop a list**
picks entries by kind, sector, area and tier and adds the ones not on the list
yet; **Add by hand** covers everyone else. An entry edited in the console is not
overwritten by a later develop.

The team guide's rule holds: the list of whom we approach is internal and is
never published on the site.

### Rules for the catalogue

- Nothing invented. Every fact is on a published page listed in `sources`.
- A person is named only with the page that names them and their role
  (`contact_source`). No LinkedIn, no guessed email patterns.
- Published business contacts go out of date. The sources travel with the
  prospect so the sender can check before a formal ask, and a warmer contact
  someone on the team knows should replace the published one (Edit).
- `tier_fit` is our estimate from size, not anything the organisation said.

### Adding research

Write a JSON array in the catalogue's shape (see an existing entry; `key` is
derived) and merge it:

```
python3 scripts/prospects/merge-catalogue.py path/to/new.json
npx vitest run lib/prospect-catalogue.test.ts
```

The merge refuses an unknown kind, sector, area, an entry with no source, and
drops a named person who has no `contact_source`.

## Found and checked live

Two live sources sit beside the research file in **Develop a list**
(migration 0089). Neither saves anything by itself: each returns finds to pick
from, and a find already on the list is shown and cannot be added twice.

| Source | Finds | Needs |
| --- | --- | --- |
| Live research | Organisations with a record: who sponsored, gave to or partnered with events like ours, with the page that says so | `ANTHROPIC_API_KEY` (the Translate key) |
| Google search | Businesses of a type in a town: name, address, phone, website, rating | `GOOGLE_PLACES_API_KEY` |

**Live research** (`lib/server/prospect-research.ts`) is Claude with the web
search tool. It is held to its sources in code, not on trust
(`lib/prospect-live.ts`): a source is kept only when it is a page the search
tool returned in that same request, a named person stays only with such a page
naming them, and a find or a check with no source left is dropped.

**Check now**, on a prospect, asks the same research what is true today: is it
operating, what has it sponsored, who to ask. The finding is logged with its
date at once, so the log shows how a prospect changes over time. The details on
file change only when someone presses Apply.

**Google search** (`lib/server/google-places.ts`, shapes in
`docs/vendor/google-places.md`) runs one search per kind of business and town,
twelve at most in one go. Google gives no email, so on adding, each website's
home and contact page are read for the email and Instagram account they publish
(`lib/server/site-contacts.ts`: public hosts only, redirects checked, 400 kB per
page).

The research file stays the reviewed baseline. Live finds worth keeping for
everyone can be merged into it with the script above.

## Sending

A message opens in the sender's own WhatsApp, mail app or Instagram, where they
press send, so replies come to a person. The console logs the words, moves a new
prospect to Contacted and sets the follow-up: five days after a first message, a
week after a follow-up. Templates are in `lib/prospects.ts` (`composeMessage`),
in Montenegrin and English, one ask per kind. Every message is signed by
`PROSPECT_SIGNER`, whoever is signed in, and greets the contact by first name.
The opening names Santamore Week and its dates: change it once the week has passed.

"Attach the sponsorship sheet" adds a link to the PDF served from
`public/sponzorstvo/`; WhatsApp and `mailto:` cannot carry a file from a web
page. Replace the PDF there when the sheet changes (same file name keeps old
links working).

A prospect that says yes: **Said yes: add to supporters** creates the supporter
with the contact held here and marks the prospect Won. The sponsorship itself
(tier, amount, event) is recorded on the supporter.
