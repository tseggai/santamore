# Placeholders

Every fabricated-fact placeholder in the codebase, so they can be filled in one
pass. Rule: real registration numbers, IBANs, names, dates, prices and legal
text are never invented — see CLAUDE.md.

| Placeholder | Where | Needed for |
|---|---|---|
| Full registered organisation name | `messages/*.json` → `footer.orgName` | Footer, impressum |
| Registered address (Tivat) | `messages/*.json` → `footer.orgAddress` | Footer, impressum |
| Registration number + PIB | `messages/*.json` → `footer.orgId` | Footer, impressum, Monri onboarding |
| IBAN | `messages/*.json` → `footer.iban` | Footer, SEPA rail (Task 3), impressum |
| Contact email | `messages/*.json` → `footer.email` | Footer, privacy policy contact |
| Accepted card brand logos | `messages/*.json` → `footer.cards` | Acquirer requirement (Task 6 footer) |
| Russian copy — native review | all of `messages/ru.json` (see its `_review` key) | Launch decision per brief §15.8 |
| SVG logo + icon | `public/brand/` has PNG only; header/footer/favicon use PNG for now | Crisp rendering; brief says ask, don't trace |
| Santa Run 2026 facts: date (seeded 20.12. 11:00), venue, capacity (seeded 500), registration window, price tiers, campaign goal (seeded €30.000), beneficiary summary | `supabase/seed.sql` | Real event details per brief §15.5 |
| `[[SAMPLE]]` donation + disbursement rows (fixed UUIDs `4000…0001` / `5000…0001`) | `supabase/seed.sql` — exist only for RLS tests | **Delete before launch** with `supabase/cleanup_samples.sql` |
| Registered org name, IBAN and BIC as env vars | `NEXT_PUBLIC_ORG_NAME` / `NEXT_PUBLIC_ORG_IBAN` / `NEXT_PUBLIC_ORG_BIC` (`.env.example`; also consolidate `footer.iban` / `footer.orgName` once real) | SEPA panel, EPC QR, transfer-instructions email (Task 3) |
| BIC | env var above — brief §15.4 asks for IBAN **and** BIC | EPC QR payload — **required**: Montenegro is non-EEA, so EPC069-12 §2.2 mandates the BIC (no BIC → no QR, manual fallback only); impressum |
| Resend account + verified sending domain (SPF/DKIM/DMARC) + `EMAIL_FROM` | `.env.example` → `RESEND_API_KEY`, `EMAIL_FROM`; emails no-op until set | Pledge instructions + receipt emails (Task 3) |
| ~~`docs/vendor/epc-qr.md`~~ **saved** (EPC069-12 v3.1, from the team's copy) and `lib/epc-qr.ts` verified against it — reference kept in the **unstructured** remittance element (brief §8 deviation, flagged); BIC enforced for non-EEA IBANs | `docs/vendor/epc-qr.md` | Remaining: **test the QR in ≥2 real EU banking apps** before launch |
| Sample bank-statement CSV from our actual bank | admin reconciliation column mapping (`components/admin/ReconciliationTool.tsx`) guesses headers; a real export lets us preset it | Smoother reconciliation (Task 3) |
| Russian donate/admin/email/dashboard strings — native review | `messages/ru.json` (new `donate.*`, `email.*`, `admin.*`, `dashboard.*`, `leaderboard.*` keys, drafted) | Same `_review` flag as the rest of ru.json |
| Legal drafts — every `[[PLACEHOLDER]]` inside `content/legal/*.ts` + lawyer review of all 8 | `content/legal/` | Go-live (acquirer inspects these pages) |
| Plausible site domain, when analytics is wanted | `.env.example` → `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`; unset = no analytics and no consent banner | Optional analytics (Task 6) |
| Board, grants-committee and team names + photos with consent | `content/site/about.ts` → `peopleNote` | `/o-nama` team section |
| Photos with consent for the landing hero and `/galerija` | `v_public_gallery` is empty; landing + gallery render placeholder notes until staff publish items | Landing §12, gallery |
| Beneficiary story with consent | `app/[locale]/page.tsx` story section renders a placeholder note | Landing §12 |
