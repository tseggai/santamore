# Conflict of Interest Policy — notes

## What it is and where it hangs

The policy that Article 34 of the statute additions (`docs/legal/registration/statute-additions.md`) has the Board adopt. It is the document the Grants Committee's annual declaration (Statute Art. 39), the grant criteria (section 10) and the Chapter Rules (Art. 15) refer to, and it carries the team guide's pay rules, which exist because Article 30 of the Law on NGOs puts founders, members, officers and employees in the same clause on the use of assets. Montenegrin is the operative text. Drafted 2026-09-21. The lawyer reviews before adoption, in particular Part V against the Law on NGOs and labour law. Bracketed values are parameters for the Board; suggested values are below.

## Decisions embedded in the draft

All from the team guide: contracts, not transfers; the payer is never the payee; pay bands published; no relatives on payroll in the early years; a written accountant's opinion before the first payroll; the Grants Committee decides on beneficiaries with conflicts declared and recused.

## Parameters for the Board and checks

Suggested starting values, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Ownership stake that makes an entity a connected person | 10 percent | Art. 3 |
| Related-party procurement needing two outside quotes | 300 EUR | Art. 6 |
| No relatives on payroll | 3 years from registration | Art. 8 |
| Annual declaration deadline | 31 January | Art. 10 |
| Retention of register data | 5 years after the function ends | Art. 10 |
| Token gift ceiling | 30 EUR | Art. 16 |
| Hospitality to register | 50 EUR per occasion | Art. 17 |

**CHECK with the lawyer:** Part V against Article 30 of the Law on NGOs and the Labour Law, in particular whether a suspended mandate during an election candidacy (Art. 9) and dismissal as a measure (Art. 19) are consistent with the Statute's dismissal articles; the register of interests against the Law on Personal Data Protection (lawful basis, access rights, retention).

**CHECK with the accountant:** the form of the written opinion in Article 15 point 5 and whether reimbursements to covered persons need any additional documentation for the books.

**Platform notes.** The declarations, the register of interests and the gifts register can live as documents in Supabase Storage behind staff access for now; the annual report figures in Article 20 are counts the Director compiles by hand until a workflow exists. No code change is needed to adopt the policy.

## Points for the lawyer

The draft has no separate "Points for the lawyer" section; the lawyer's checks are the two CHECK items above.

## Montenegrin corrections made

- Art. 5: "sused" → "susjed" (ijekavian form).
- Art. 10: "Izjave čini registar interesa" → "Izjave čine registar interesa" (subject–verb agreement).

## Open doubts

- Art. 10 refers to "gifts received above the threshold in Article 15" ("praga iz člana 15"). The gift threshold is in Article 16; Article 15 (Principle) has no threshold. The draft's English summary also says Article 15, so it was left as written rather than changed; the drafter or lawyer should confirm whether it should read Article 16.
- Placeholders in the old English summaries were written as "[10]", "[amount]", "[number]", "[date]"; the English file renders them as full [[PLACEHOLDER: …]] marks matching the Montenegrin ones (7 in each file).
- "kandidat za sponzora" is rendered "prospective sponsor"; "lice ogranka" / "lica ogranaka" as "chapter officer(s)", covering the chapter leads, treasurers and volunteer coordinators of Article 2.
