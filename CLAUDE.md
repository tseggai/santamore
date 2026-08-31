# Santamore

Peer-to-peer fundraising platform for a Montenegrin charitable non-profit based in Tivat.
Full spec: `docs/BUILD-BRIEF.md`. Read it before non-trivial work.

## Stack

Next.js (App Router) + TypeScript strict · Tailwind · Supabase (Postgres/RLS/Auth/Storage) ·
Vercel · Monri for cards · next-intl (`me` default, `en`, `ru`) · react-hook-form + zod ·
Vitest + Playwright

## Non-negotiable rules

- Money is ALWAYS integer cents. Never floats. Use the helpers in `lib/money.ts`.
- Never handle raw card data. Monri Components only. PCI scope stays SAQ-A.
- Secrets are server-only. Never in a client component, never committed. New vars go in `.env.example`.
- Every mutation re-validates on the server. Never trust client input.
- Approved donations are immutable. Corrections go in `ledger_adjustments` as new rows.
- Public data is exposed only through the `v_public_*` views, enforced by RLS.
- Webhook handlers must verify signatures before doing anything, and must be idempotent.
- Mobile-first. Keyboard navigable, visible focus, real labels, `prefers-reduced-motion` respected.

## Never fabricate

Registration numbers, IBANs, beneficiary names, event dates, prices, sponsor names, photos,
or legal text. Use `[[PLACEHOLDER: description]]` and log every one in `docs/PLACEHOLDERS.md`.

## Brand

```
red #F35353 · red-dark #D93B3B · ink #36434B · paper #FFFFFF
sea #0E3A46 · sea-2 #15505F · mist #EAF1F2 · sand #F6F3EE
```

Cormorant Garamond (display: big, light, elegant — never bolded) · DM Sans (body,
Helvetica Neue in the fallback stack) · DM Mono (money, references, ledger).
All faces must render Montenegrin diacritics: č ć š ž đ.
(Ink and type softened from the original prototype values by owner decision, 2026-09.)

## Reference files

- `docs/reference/app-prototype.html` — visual and interaction spec for the donate flow,
  runner page, leaderboard and ledger. Also contains ME/EN UI strings to seed `messages/`.
- `docs/reference/team-guide.html` — brand in use, positioning, and full org context
  (structure, revenue, calendar, chapter splits). Tone for public copy: first person
  plural, concrete, no charity-sector jargon.
- `docs/vendor/` — saved Monri and EPC QR documentation. Use these for API shapes rather
  than guessing or relying on training data.

## Commit style

Conventional commits, one concern per commit.

## Ask, don't assume

If the brief is ambiguous, ask one clear question with your recommended default.
If Monri's docs contradict the brief, the docs win — say so and follow them.
