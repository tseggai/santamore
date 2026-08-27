# Santamore — Build Brief for Claude Code

---

## How to start

Claude Code on the web (claude.ai/code) works from a GitHub repo, so create the repo first.

**Step 1 — set up the repo locally or on GitHub:**

```
santamore/
├── CLAUDE.md
├── docs/
│   ├── BUILD-BRIEF.md
│   ├── reference/
│   │   ├── app-prototype.html
│   │   └── team-guide.html
│   └── vendor/
└── public/
    └── brand/
```

Everything above lives inside the `santamore/` repo. `CLAUDE.md` is the only file at the
root — the two HTML references sit three levels down, in `docs/reference/`.

Where each file comes from:

| Path in the repo | What to put there |
|---|---|
| `CLAUDE.md` | Paste the contents of §2 below |
| `docs/BUILD-BRIEF.md` | This file |
| `docs/reference/app-prototype.html` | Rename `santamore-app-prototype.html` |
| `docs/reference/team-guide.html` | Rename `Santamore-Team-Guide.html` |
| `docs/vendor/` | Create it empty — fill per §3, before Task 4 |
| `public/brand/` | The four Santamore logo PNGs |

**Step 2 — open claude.ai/code, connect the repo, and send this as your first message:**

> Read `CLAUDE.md` and `docs/BUILD-BRIEF.md` in full. Also open `docs/reference/app-prototype.html` — it is the visual and interaction spec for the donate flow, the runner page, the leaderboard and the ledger, and I want the real build to match its decisions.
>
> Then use `/plan` and give me a plan for **Task 1 only**. In the plan, tell me: the exact files you'll create, any dependency choices you're making and why, and anything in the brief that is ambiguous or that you think is wrong. Don't write code until I approve the plan.

**Step 3 — the loop for every task after that:**

1. `/plan` → review the plan → approve
2. Claude implements
3. `/code-review` — fix what it finds
4. `/security-review` — **mandatory before merging Task 3, 4 and 7**
5. Commit, merge, then `/clear` before the next task

`/clear` between tasks matters. It starts fresh context while keeping `CLAUDE.md`, so Claude doesn't drift or carry stale assumptions across eight tasks.

Other things worth using:
- **`/plan` for anything touching money.** Plan mode proposes before it changes.
- **Subagents for doc reading.** "Use the explore agent to read `docs/vendor/monri-components.md` and summarise the auth flow" keeps the Monri docs out of your main context window.
- **`#` to add a rule mid-session.** Typing `# always use integer cents, never floats` writes it to memory without editing `CLAUDE.md` by hand.
- **`/context`** when things slow down, then `/compact`.
- **`/rewind`** if a task goes wrong — it rolls back code *and* conversation to a checkpoint.

---

## 1. What we're building

Santamore is a Montenegrin non-profit in Tivat. We run charitable events — a December Santa Run, a pub crawl, winter sea swims, regattas — and give the money to local families, children, small businesses and organisations.

We need a **peer-to-peer fundraising web app with a full public site**. Three jobs, in priority order:

1. **Take donations.** Card via Monri and SEPA bank transfer, one-off and monthly, on a phone, in under 20 seconds.
2. **Let participants fundraise for us.** Every runner gets a personal page they share with their own network. This is our largest revenue stream, not a side feature.
3. **Prove where the money went.** A public, append-only ledger of money in and money out, generated from the database, no login.

Plus: landing page, event pages, photo gallery, about/team, FAQ, news, contact, and the legal pages a card acquirer requires before enabling live payments.

**Deadline:** first event is in December. Tasks 1–6 ship by mid-October. Phase 2 waits.

---

## 2. CLAUDE.md

Create this file at the repo root. Keep it short — it loads into every session, so long files crowd out the actual work. Detail belongs in `docs/`, not here.

```markdown
# Santamore

Peer-to-peer fundraising platform for a Montenegrin charitable non-profit in Tivat.
Full spec: `docs/BUILD-BRIEF.md`. Read it before non-trivial work.

## Stack
Next.js (App Router) + TypeScript strict · Tailwind · Supabase (Postgres/RLS/Auth/Storage)
· Vercel · Monri for cards · next-intl (me/en/ru) · react-hook-form + zod · Vitest + Playwright

## Non-negotiable rules
- Money is ALWAYS integer cents. Never floats. Use the `Money` helpers in `lib/money.ts`.
- Never handle raw card data. Monri Components only. PCI scope stays SAQ-A.
- Secrets are server-only. Never in a client component, never committed. New vars go in `.env.example`.
- Every mutation re-validates on the server. Never trust client input.
- Approved donations are immutable. Corrections go in `ledger_adjustments` as new rows.
- Public data is exposed only through the `v_public_*` views, enforced by RLS.
- Webhook handlers must be idempotent and verify signatures before doing anything.
- Mobile-first. Keyboard navigable, visible focus, real labels, `prefers-reduced-motion` respected.

## Never fabricate
Registration numbers, IBANs, beneficiary names, event dates, prices, sponsor names, photos,
legal text. Use `[[PLACEHOLDER: description]]` and log it in `docs/PLACEHOLDERS.md`.

## Brand
red #F35353 · red-dark #D93B3B · ink #0B0B0C · paper #FFFFFF
sea #0E3A46 · sea-2 #15505F · mist #EAF1F2 · sand #F6F3EE
Fraunces (display, SOFT+WONK axes) · Figtree (body) · DM Mono (money, references, ledger)
Visual reference: `docs/reference/app-prototype.html`

## Commit style
Conventional commits, one concern per commit.

## Ask, don't assume
If the brief is ambiguous, ask one clear question with your recommended default.
If Monri's docs contradict the brief, the docs win — say so and follow them.
```

---

## 3. Reference artifacts

### `docs/reference/app-prototype.html` — the UI spec

This is a working, interactive prototype of the four screens that carry the money. **It is a specification, not a mood board.** Open it in a browser, then read the source.

Extract and reuse:

| From the prototype | Where it goes |
|---|---|
| **The waterline component** — the SVG wave paths, the two-layer drift animation, the `bottom: calc(N% - 13px)` wave positioning, and the frosted plate that keeps the amount readable at any fill level | `components/Waterline.tsx`. Port the CSS to Tailwind or a CSS module. Keep the frosted-plate approach — I tried switching the text colour instead and it fails on the upper half of the number |
| **Donate flow field order** — amount chips with impact lines → custom amount → monthly toggle → fee toggle (pre-checked, live arithmetic) → anonymity → payment rail → identity last | `app/[locale]/podrzi/page.tsx`. The order is deliberate; don't reorder it into a wizard |
| **The fee calculation and its copy** — "Add €0.75 so your full €25 reaches the cause" | `lib/fees.ts` + i18n strings |
| **SEPA panel layout** — IBAN, reference, QR placeholder, and the "this reference credits your gift automatically" line | The bank-transfer rail in the donate flow. The prototype's QR is a labelled placeholder; generate a real EPC QR (§8) |
| **Ledger layout** — dark reconciliation summary, the two-fund card, money-in/money-out toggle, mono type for amounts, documentation pills | `app/[locale]/transparentnost/page.tsx` |
| **Leaderboard** — individuals/teams segmented control, rank colouring for top three, bar widths | The event leaderboard |
| **Montenegrin and English UI strings** — the `DICT` object near the bottom of the file has both locales for every visible string on those four screens | Seed `messages/me.json` and `messages/en.json` from it. Do not re-translate what's already there |

The prototype is vanilla HTML/CSS/JS in one file with placeholder data. Don't copy its architecture — copy its decisions.

### `docs/reference/team-guide.html` — the brand, voice and context spec

Our internal operating guide. Use it for: the brand palette and type in real use, the "Santa of the water" positioning, how we describe the two funds and the 70/20/10 chapter split, and the tone of voice for public copy. Public-facing copy should sound like this guide: first person plural, concrete, no charity-sector jargon.

### `docs/vendor/` — vendor docs, saved locally

Cloud sessions may not reach external sites reliably. **Before Task 4**, save these as markdown in `docs/vendor/` so the agent never has to guess an API shape:

- `monri-components.md` ← https://ipg.monri.com/en/documentation/components
- `monri-transaction-api.md` ← https://ipg.monri.com/en/documentation/transaction-api
- `monri-cof.md` ← https://ipg.monri.com/en/documentation/payment-with-cof
- `monri-response-codes.md` ← https://ipg.monri.com/en/documentation/list-of-response-codes
- `epc-qr.md` ← the EPC069-12 SEPA Credit Transfer QR specification

Then tell Claude: *"Use the explore agent to read docs/vendor/monri-components.md and report back the exact auth digest formula and the confirmPayment signature."*

---

## 4. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript, strict mode |
| Hosting | Vercel |
| DB / auth / storage | Supabase (Postgres, RLS, Auth, Storage) |
| Styling | Tailwind. No component library — build the components |
| Cards | **Monri**, hosted Components only |
| Forms | react-hook-form + zod, schemas shared client and server |
| Email | Resend or equivalent, verified sending domain, SPF/DKIM/DMARC |
| i18n | `next-intl`. `me` (Montenegrin, Latin) default, `en`, `ru` |
| Images | `next/image` + Supabase Storage, resized on upload |
| Analytics | Plausible or Umami. No Google Analytics, no ad pixels |
| Tests | Vitest for money/digest/reference logic; Playwright for donate and signup |

Fonts self-hosted via `next/font/google`. All three must render Montenegrin diacritics (č ć š ž đ) — verify, don't assume.

Ask me for SVG logos rather than tracing the PNGs in `public/brand/`.

---

## 5. Routes

### Public site

```
/                        Landing page
/o-nama                  About: mission, story, team, board, governance
/kako-radimo             How it works: the two funds, the 70/20/10 split, who decides
/dogadjaji               Events index
/dogadjaji/[slug]        Event: details, FAQ, register, leaderboard, gallery
/galerija                Gallery, filterable by event and year
/transparentnost         The public ledger  ← flagship
/podrzi                  Donate
/prikupljaci             Directory of active fundraisers and teams
/f/[slug]                Fundraiser page
/t/[slug]                Team page
/partneri                Partners + "become a partner" enquiry
/prijava-za-pomoc        Beneficiary application
/vijesti, /vijesti/[slug]  News
/volontiraj              Volunteer sign-up
/cesta-pitanja           FAQ
/kontakt                 Contact: form, address, map, bank details
```

Localised as `/me/...`, `/en/...`, `/ru/...` with `me` default. Slugs identical across locales.

### Legal pages — required before go-live

The acquirer inspects the site before enabling live payments. All of these must exist, be footer-linked, and need no login:

```
/pravila-privatnosti          Privacy policy
/kolacici                     Cookie policy + working consent banner
/uslovi-koriscenja            Terms of use
/pravila-donacija             Donation, refund and cancellation policy
/uslovi-ucesca                Event terms + liability waiver
/zastita-djece                Child safeguarding policy
/kodeks                       Code of conduct
/informacije-o-organizaciji   Organisation details / impressum
```

Write full drafts, each headed `DRAFT — must be reviewed by a Montenegrin lawyer before launch`, with unknowns as `[[PLACEHOLDER: ...]]`.

- **Privacy policy** — written for Montenegro's Law on Personal Data Protection *and* GDPR (we'll have EU donors). Cover what we collect (name, email, phone, address for card verification, event data, photos), why, legal basis, processors (Monri, Supabase, Vercel, email provider, and where each hosts data), retention, and data-subject rights with a working request address. Name a data protection contact.
- **Cookie banner** — analytics defaults to **off**; nothing non-essential loads before consent; reject is as easy as accept.
- **Donation and refund policy** — donations are voluntary and generally non-refundable; how to request a refund for a duplicate or erroneous charge and the window; treatment of entry fees if an event is cancelled or postponed; the card statement descriptor as `[[PLACEHOLDER: descriptor agreed with Monri]]`; currency EUR.
- **Impressum** — registered name, legal form (non-governmental association), registered address, registration number, PIB, ministry register entry, bank name and IBAN, email, phone, authorised representative, accepted card brands with logos, link to the 3-D Secure/security explanation. **Acquirers check for exactly this.**
- **Event terms + waiver** — assumption of risk, medical fitness declaration, minimum ages per distance, guardian consent for minors, photo/video consent with opt-out, withdrawal and transfer rules, weather cancellation.
- **Child safeguarding** — no unsupervised adult–child contact, briefed volunteers, parental photo consent, a named safeguarding lead per event, how to report a concern.

Also: `robots.txt`, `sitemap.xml`, per-page OpenGraph images (dynamic for fundraiser pages, showing the runner's name, photo and total), JSON-LD `Organization` and `Event`.

### Authenticated

```
/dashboard              My total, my donors, days left, next action
/dashboard/stranica     Edit my page: photo, story, target
/dashboard/pitaj        Ask list (Phase 2)
/dashboard/gotovina     Log cash I collected
/dashboard/alati        Share toolkit

/admin                  Revenue by stream, chapter, event
/admin/donacije         Search, refund, resend receipt, SEPA reconciliation queue
/admin/prijave          Registrations, waivers, sizes, bibs, CSV export
/admin/prikupljaci      Approve, moderate, message, feature
/admin/isplate          Record disbursement, upload proof, publish
/admin/dogadjaji        Create and edit events
/admin/sadrzaj          News, gallery uploads
/admin/partneri         Sponsor pipeline, contracts, deliverables
```

Admin gated on `profiles.role in ('admin','chapter_lead')`, enforced in **RLS and middleware**. Hiding UI is not access control.

---

## 6. Data model

One Supabase migration. English, snake_case.

```sql
-- one table per block. Full column notes in §6 prose below.

profiles            id (=auth.users.id), full_name, phone, locale, role, created_at

chapters            id, name, slug, municipality, is_active,
                    split_local_bp, split_national_bp, split_solidarity_bp
                    -- basis points, must sum to 10000

campaigns           id, chapter_id, title, slug, description, goal_cents,
                    starts_at, ends_at, beneficiary_summary, is_public,
                    suggested_amounts jsonb

events              id, campaign_id, chapter_id, name, slug,
                    starts_at, venue, capacity, registration_opens_at, registration_closes_at,
                    price_tiers jsonb, distances jsonb, is_published

teams               id, event_id, name, slug, captain_id, goal_cents, created_at

fundraisers         id, user_id, event_id, team_id, slug, title, story,
                    goal_cents, photo_path, payment_reference (unique),
                    status ('draft'|'active'|'hidden'), created_at

registrations       id, event_id, user_id, distance, shirt_size,
                    waiver_signed_at, waiver_version, bib_number,
                    amount_paid_cents, status

donations           id, amount_cents, fee_covered_cents, net_cents,
                    fundraiser_id, campaign_id, chapter_id, event_id,
                    donor_name, donor_email, display_name, is_anonymous,
                    message, is_recurring, subscription_id,
                    rail ('card'|'sepa'|'cash'|'other'),
                    provider ('monri'|null),
                    provider_order_number (unique),
                    provider_transaction_id, pan_token,
                    status ('pending'|'approved'|'declined'|'refunded'),
                    created_at, approved_at

subscriptions       id, user_id, donor_email, amount_cents, pan_token,
                    interval ('monthly'), next_charge_on, status, created_at

disbursements       id, chapter_id, campaign_id, beneficiary_label,
                    beneficiary_private_note, category, amount_cents,
                    decided_at, paid_at, published_at,
                    documentation_paths text[], committee_decision_ref

ledger_adjustments  id, references_donation_id, references_disbursement_id,
                    amount_cents, reason, created_by, created_at

sponsors            id, name, tier, chapter_id, amount_cents, is_in_kind,
                    logo_path, website, contract_path,
                    deliverables jsonb, status

beneficiary_applications
                    id, applicant_name, contact, category,
                    amount_requested_cents, description,
                    attachments text[], status, chapter_id, created_at

gallery_items       id, event_id, storage_path, caption, credit,
                    sort_order, is_published

posts               id, slug, title, excerpt, body_md, cover_path,
                    published_at, locale

ask_list_items      id, fundraiser_id, contact_label, status,
                    asked_at, gave_at            -- Phase 2

webhook_events      id, provider, provider_event_id (unique), payload jsonb,
                    signature_valid, processed_at
```

### Non-negotiable data rules

1. **Approved donations are immutable.** Corrections are new `ledger_adjustments` rows. Enforce with a Postgres trigger, not application code — the ledger's credibility rests on this.
2. **`payment_reference` globally unique** across fundraisers and campaigns. Format `SM-<MMYY>-<4 digits>` (e.g. `SM-1226-0473`). This is the SEPA matching key.
3. **`net_cents` computed at write time**, so the ledger never recomputes fees.
4. **Public views only.** Create `v_public_ledger_in`, `v_public_ledger_out`, `v_fundraiser_totals`, `v_chapter_totals`, `v_leaderboard`. Anonymous users see *only* these. `donor_email`, `beneficiary_private_note` and every `provider_*` field must be unreachable without auth. **Write an RLS test proving it.**
5. **Chapter splits sum to 10000 bp.** Check constraint.

---

## 7. Monri integration

Read `docs/vendor/monri-*.md` before writing any payment code. Don't work from memory.

Environments: test `https://ipgtest.monri.com`, production `https://ipg.monri.com`. **Parametrise the base URL** — the production subdomain differs, and hardcoding it is the most common cause of a broken go-live.

```
MONRI_BASE_URL=https://ipgtest.monri.com
MONRI_MERCHANT_KEY=                      # server only, never exposed
MONRI_AUTHENTICITY_TOKEN=
NEXT_PUBLIC_MONRI_BASE_URL=
NEXT_PUBLIC_MONRI_AUTHENTICITY_TOKEN=    # needed client-side for Monri(), safe to expose
PAYMENTS_LIVE=false
```

### Step 1 (server) — create the payment

`POST {MONRI_BASE_URL}/v2/payment/new`

```json
{
  "amount": 2575,
  "order_number": "SM-1226-0473-a1b2c3",
  "currency": "EUR",
  "transaction_type": "purchase",
  "order_info": "Donation to Santamore - Santa Run 2026",
  "scenario": "charge"
}
```

- `amount` in **minor units** (2575 = €25.75)
- `order_number` unique, 2–40 chars. Generate it and store it on the donation row *before* calling Monri; use it as the idempotency key
- `transaction_type: "purchase"` — captures immediately. `authorize` needs a separate capture within 28 days or auto-voids; we don't want that operational burden
- `order_info` 3–100 chars

Auth header:

```
Authorization: WP3-v2 {authenticity_token} {timestamp} {digest}

timestamp = unix seconds
digest    = sha512(merchant_key + timestamp + authenticity_token + body_as_string)
```

**The most common integration bug:** `body_as_string` must be byte-identical to what you actually send. Serialise once to a string, digest *that exact string*, send *that exact string* as the body. Never let a framework re-serialise the object between digest and request.

Response: `{ status, id, client_secret }`. Store `id`; return only `client_secret` to the browser.

### Step 2 (client) — mount Components

The script must load from Monri's domain. It cannot be bundled or self-hosted, for PCI reasons.

```js
// Load with next/script, strategy="afterInteractive".
// Only on pages that need it.
// src = `${NEXT_PUBLIC_MONRI_BASE_URL}/dist/components.js`

const monri = Monri(AUTHENTICITY_TOKEN, { locale: 'me' });  // 'me' = sr_latn_ME. Also 'en'. No 'ru' — fall back to 'en'.
const components = monri.components({ clientSecret });
const card = components.create('card', {
  style: { /* map brand tokens */ },
  tokenizePanOffered: true   // powers "save card" → monthly giving
});
card.mount('card-element');
card.onChange(e => showError(e.error?.message));
```

Handle script-load failure with a visible fallback to bank transfer.

### Step 3 (client) — confirm

```js
const { result, error } = await monri.confirmPayment(card, {
  fullName, address, city, zip, phone, country, email, orderInfo
});
```

3-D Secure is handled inside Components — don't build your own. Send the result to our backend, but **treat the webhook as the source of truth**.

Validate these with zod client-side; Monri rejects out-of-range values with unhelpful errors:

| Field | Limit |
|---|---|
| `fullName` | **3–30** — surprisingly short, pre-validate with a clear message |
| `address` | 3–100 |
| `city` | 3–30 |
| `zip` | 3–9 |
| `country` | ISO alpha-2 (`ME`) |
| `phone` | 3–30 |
| `email` | 3–100 |
| `orderInfo` | 3–100 |

### Step 4 (server) — webhook

`POST /api/webhooks/monri`. Monri posts to a callback URL set in the merchant dashboard.

- Read the **raw body** before any JSON parsing — `await request.text()` in App Router.
- Verify: header `authorization: WP3-callback {digest}` where `digest = sha512(merchant_key + raw_body)`. Constant-time compare. 401 and log on failure.
- Insert into `webhook_events` keyed on a provider event id. If it exists, return 200 and do nothing — **the handler must be idempotent**, because Monri retries.
- Only mark the donation approved, recompute fundraiser totals and send the receipt when `status === "approved"`.
- Return 200 fast for a valid signature; do slow work after.
- Never derive approval from anything except the `status` field.

### Monthly giving (Card on File)

1. First charge via Components with `tokenizePanOffered: true`. Record the consent — `tokenizePan: true` requires prior consent in our terms, so use the checkbox.
2. The approved result returns a `pan_token`. Store it on `subscriptions`. **Never store card data — only the token.**
3. Later charges are server-to-server against the Transaction API with `pan_token` and `moto: true`. **Confirm the exact digest formula for that endpoint from `docs/vendor/monri-transaction-api.md` — it differs from the `payment/new` digest.**
4. Run from a scheduled job (Vercel Cron → route handler). Handle declines with a retry schedule and an email asking the donor to update their card. Log every attempt.
5. Self-service page to change the amount or cancel. One click, no email required.

### Blocker to flag, not work around

Monri requires a merchant account, which requires our registered entity, PIB and a Montenegrin bank account. Build the whole flow against the test environment behind `PAYMENTS_LIVE=false`, and make sure the SEPA rail works standalone so we can take money if the merchant account is delayed.

---

## 8. The SEPA rail

Montenegro joined SEPA in October 2025, so euro transfers from the EU are now fast and near-free. This is our lowest-cost rail and it must work independently of Monri.

When the donor picks "Bankovni prenos":

1. Show our IBAN, beneficiary name, amount, and the **payment reference** for the fundraiser or campaign (`SM-1226-0473`).
2. Render a scannable **EPC QR code** (EPC069-12) so EU banking apps pre-fill the transfer. Newline-delimited payload, in this order:

```
BCD
002
1
SCT
{BIC or empty}
{Beneficiary name, max 70}
{IBAN}
EUR{amount, e.g. 25.00}
{Purpose, optional}
{Structured reference, max 35}      ← our payment reference
{Unstructured remittance, max 140}  ← empty if structured is used
{Beneficiary-to-originator info, max 70}
```

Verify against `docs/vendor/epc-qr.md` before shipping, and test the output against at least two real EU banking apps. Note in the UI that not every Montenegrin bank app scans these yet — always show the IBAN and reference as copyable text so a manual transfer works.

3. Copy buttons for the IBAN and the reference, plus a short "what happens next": we match the transfer and credit the page usually within one working day.
4. Create a `pending` donation row immediately with `rail = 'sepa'` and the reference, so the admin queue has something to match. Don't add it to public totals until reconciled.

**Reconciliation.** Task 3: admin uploads a bank CSV, system proposes matches on the reference, admin confirms with one click. Phase 2: scheduled camt.053 XML parsing with automatic matching and an exception queue.

---

## 9. The donate flow

See the prototype (§3) for the exact layout. Order matters — one screen, no wizard:

1. **Amount first.** Three large tap targets with impact lines ("€25 — a week of school meals"), middle pre-selected, plus free entry. Amounts and copy come from `campaigns.suggested_amounts`, not hardcoded.
2. **Monthly toggle**, prominent, own suggestion set (€5/€10/€20), framed as "€10 a month is €120 a year".
3. **Fee-cover toggle, pre-checked**, live arithmetic. Store in `fee_covered_cents` separately — this is how we honestly claim 100% of donations reach beneficiaries.
4. **Anonymity toggle.** Amount still appears in the ledger; name doesn't.
5. **Identity last.** Name and email required; nothing else unless the rail needs it.
6. **Rail choice:** card or bank transfer. Apple Pay / Google Pay above the card fields if Monri has them enabled for our account — check and tell me.
7. **Optional message to the fundraiser.** Public, moderatable. Drives the social loop.
8. **Confirmation that asks one more thing:** share this page, or start your own. Never a dead-end thank-you.

Receipt email in the donor's language with amount, campaign, reference, and a link to the ledger entry.

---

## 10. The fundraiser experience

A page that exists is worth little; a fundraiser who *asks* is worth a lot.

- **Onboarding refuses to publish an empty page.** Photo, target and three sentences of story required before `status` becomes `active`. Live preview while writing.
- **Self-donation prompt at signup:** "Start your page with your own €20." Pages that open at €0 stay at €0.
- **The waterline** (§3) plus a donor wall with public messages.
- **Share toolkit** generating an image with photo, name, current total and beneficiary. One tap to Instagram Stories, WhatsApp, **Viber** (`viber://forward?text=` deep links — heavily used here and always forgotten) and Facebook.
- **Milestones** at 25/50/75/100% generating a fresh share image and a congratulations email.
- **Cash logging.** A fundraiser who collects €120 by hand records it with a hand-in status; it hits the leaderboard once an admin confirms receipt. Without this the leaderboard lies and stops motivating anyone.
- **Nudge emails**, scheduled: day 1 personalise your page, day 3 ask five people, day 7 post an update, day 14 thank your donors publicly, day 21 final push. Copy lives in `next-intl` message files so we can edit without deploying.
- **Team pages** with combined totals and internal member ranking. Company, school and club teams turn one sponsorship into forty fundraisers.

---

## 11. The transparency ledger

`/transparentnost`. One page, no login, always current, generated from the database. Layout in the prototype.

- **Money in:** date, amount, display name or "Anonymous", fundraiser or campaign, chapter, rail.
- **Money out:** date, amount, beneficiary label, category, chapter, links to documentation in Supabase Storage.
- **Reconciliation summary on top:** total raised, total disbursed, approved-and-pending, unallocated.
- **The two funds side by side** — Impact Fund (donations → 100% to beneficiaries) and Operations Fund (sponsorship, entry fees, grants → salaries and overhead). Our core promise. Make it the most legible thing on the page.
- **Append-only in the UI too:** a `ledger_adjustments` row renders as its own dated row referencing the original. Never silently alter a published figure.
- **Privacy:** "Family in Tivat — medical costs — €1,200" is the public form. Private notes stay behind RLS.
- CSV export both directions; shareable OG image with the running total.

---

## 12. Landing page

1. **Hero.** One line on what we do, a live total counter animating up, primary CTA "Podrži", secondary "Prijavi se za trku". A real photograph.
2. **Last year.** Amount raised, who it went to, that 100% of donations were given away. Three big numbers.
3. **How it works** — three steps with arrows: you give or you run → an independent committee decides → we publish the proof.
4. **Next event** with countdown and registration CTA.
5. **The two funds** in four lines, linking to the ledger.
6. **Live leaderboard preview** — top five, "start your own page" CTA.
7. **Gallery strip**, horizontally scrollable.
8. **Chapters / where we work.**
9. **Partner wall**, grouped by tier.
10. **Beneficiary story** (with consent), one at a time.
11. **Newsletter + monthly donor club** sign-up.
12. **Footer** — every legal page, organisation details, card logos, IBAN, social, language switcher.

Gallery needs a real lightbox: keyboard navigable, swipeable, lazy-loaded, captions and credits. Admin uploads resize to several widths on upload — never serve 4MB phone photos.

---

## 13. Tasks

One task per `/plan` cycle. Stop after each, show me what you built and how you tested it, then `/clear`.

**Task 1 — Foundation.** Repo, Next.js + TS + Tailwind with brand tokens, fonts, `next-intl` with three locales and a working switcher, Supabase wiring, base layout, header, footer with all legal links, `/` placeholder, Vercel deploy with preview branches, `.env.example` with no real values. Also create `lib/money.ts` with the cents helpers and unit tests — everything else depends on it.

**Task 2 — Schema and RLS.** All migrations from §6, public views, immutability trigger, split-sum constraint, seed data for one chapter and one December event. Write and run RLS tests proving an anonymous client cannot read `donor_email`, `beneficiary_private_note` or any `provider_*` field. → `/security-review`

**Task 3 — Donate flow, SEPA only.** Full donate UI per §9 and the prototype, bank-transfer rail live: reference generation, EPC QR, copy buttons, pending rows, receipt email, admin CSV reconciliation. **This means we can legally take money before the Monri account clears.** → `/security-review`

**Task 4 — Monri.** `payment/new` server action with the digest helper (unit-tested against values from Monri's own digest calculator), Components mount and confirm, webhook with signature verification and idempotency, `PAYMENTS_LIVE` flag, full test-environment run-through including a declined card and a 3DS challenge. Write `docs/PAYMENTS.md` covering what you did and what must be configured in the Monri dashboard. → `/security-review`

**Task 5 — Fundraiser pages.** Signup, page editor with required fields, the `Waterline` component ported from the prototype, donor wall, team pages, event leaderboard with individuals/teams toggle, share toolkit with Viber and WhatsApp deep links, dynamic OG images, cash logging.

**Task 6 — Public site and legal.** Landing page, event page with registration and waiver, gallery with lightbox, about, FAQ, contact, partners, beneficiary application, news, and every legal page from §5 as a review-flagged draft. Cookie consent that actually gates analytics.

**Task 7 — Ledger and admin.** `/transparentnost` both directions with the two-fund summary, plus admin: donations, registrations export, fundraiser moderation, disbursement recording with document upload and publish. → `/security-review`

**Task 8 — Launch hardening.** Nudge email sequence, monthly giving via Card on File, rate limiting on all public forms, Turnstile or honeypot on donate and contact, error monitoring, Playwright coverage of donate and signup, Lighthouse ≥ 90 mobile on `/` and `/podrzi`, and `docs/RUNBOOK.md` for event day (what to do if payments fail mid-event, how to add a donation manually, who to call).

**Phase 2, after December:** ask list with pre-written messages, automated camt.053 matching, chapter pages with split accounting, Grants Committee workflow, sponsor deliverables tracker, Russian copy reviewed by a native speaker, silent auction, virtual participation.

---

## 14. How I want you to work

- **Plan before you build.** `/plan` for every task, and for any change touching money, auth or the ledger.
- **Read before you write.** `docs/vendor/` for API shapes; the prototype for UI decisions. If a doc is missing, tell me — don't guess an API.
- **Ask, don't assume.** One clear question with your recommended default.
- **Never fabricate content.** Every unknown fact is `[[PLACEHOLDER: ...]]`, all of them listed in `docs/PLACEHOLDERS.md` so I can fill them in one pass.
- **Test the money.** The digest helper, reference generator, fee calculation, cents formatter and webhook verifier all get unit tests. I'd rather have those five tested than broad coverage everywhere else.
- **Small commits.** One concern each, conventional messages.
- **Secrets never touch the repo.** New env var → add to `.env.example` and tell me.
- **Tell me when this brief is wrong.** I wrote it from research, not from having built it. Monri's docs beat my §7 — say so and follow them.
- **Flag anything needing a human**: legal review, the Monri merchant application, the bank account, DNS, sending domain, photo consent.

---

## 15. Open items for me, not you

Build around these and remind me:

1. Monri merchant account — needs the registered entity, PIB and bank account.
2. Webhook callback URL must be set in the Monri dashboard; may need Monri support to enable.
3. Whether Apple Pay and Google Pay are available on our Monri account.
4. Our IBAN and BIC, for the SEPA rail and the impressum.
5. December event: date, venue, distances, prices, capacity, beneficiary name and story.
6. Real photographs from last year, with publication consent.
7. Legal review of every drafted policy.
8. Russian locale at launch, or Phase 2?
