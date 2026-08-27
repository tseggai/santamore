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
