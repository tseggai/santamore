# Criteria for allocating funds to beneficiaries — notes

## 1. What the document is and where it hangs

The document the Grants Committee proposes and the Board adopts and publishes under Article 38 of the statute additions (`docs/legal/registration/statute-additions.md`). It must be on the website before the Committee applies it. Montenegrin (`grants-criteria.me.md`) is the operative text; `grants-criteria.en.md` is the full English translation for founders who do not read it. Drafted 2026-09-21 from the team guide, the brief (public ledger, beneficiary application) and the statute drafts. The lawyer and the accountant review before adoption; every bracketed amount is a parameter for the Board, not a fact.

## 2. Decisions embedded in the draft

Decisions this draft leaves to the Board, each a single number:

- the standard ceiling per decision (§ 7);
- the amount above which the Committee must be unanimous (§ 7);
- the urgent-aid ceiling (§ 8);
- the cooling-off period before a repeat application (§ 3, § 11).

Suggested starting values are in section 3 below (the draft's section 14).

Decisions the draft takes itself (not parameters): funds for beneficiaries are passed on in full, operating costs come from other income (§ 2); five funding categories and a closed list of exclusions (§ 4); a six-criterion 0–3 scoring grid with urgency and verifiability as knock-out criteria (§ 6); no allocations against expected future donations (§ 7); a 48-hour electronic fast procedure run by the chair, decided by a majority of all members (§ 8); a 21-day decision deadline and a single reconsideration with new evidence, after which the decision is final (§ 9); recusal for any personal relation and unanimity of the remaining members if recusals break the quorum (§ 10); payment to the supplier by default, cash only exceptionally against a receipt (§ 11); the public ledger shows only a non-identifying description plus the decision reference, and a child is never identifiable beyond first name and age with both parents' or the guardian's consent (§ 12); amendments published 15 days before they apply and not retroactive (§ 13).

## 3. Parameters for the Board and checks (the draft's section 14)

Suggested starting values, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Standard ceiling per decision (Standardna dodjela) | 1,500 EUR | § 7 |
| Unanimity threshold (Prag jednoglasnosti) | above 1,500 EUR | § 7 |
| Urgent-aid ceiling (Hitna pomoć) | 500 EUR | § 8 |
| Cash payment ceiling (Gotovina) | 100 EUR | § 11 |
| Score threshold (Prag bodova) | 9 of 18 | § 6 |
| Repeat-application gap (Razmak između prijava) | 12 months | § 3, § 11 |
| Retention of application data (Čuvanje podataka) | 5 years | § 12 |

Placeholder map (7 marks in each language file): § 3 repeat-application gap (months); § 6 score threshold; § 7 standard ceiling (EUR); § 8 urgent-aid ceiling (EUR); § 11 cash ceiling (EUR) and bar on new applications after misuse (months); § 12 retention period (years).

**CHECK with the accountant:** whether aid paid to an individual, or to a supplier on an individual's behalf, is taxable income for the recipient under Montenegrin personal income tax rules, and what documentation the association needs for its own books.

**CHECK with the lawyer:** the privacy section (§ 12) against the Law on Personal Data Protection and the site's privacy policy (`content/legal/privacy.ts`), and whether the exclusion of relatives of officers in § 3 needs to match the conflict-of-interest wording in the statute (Art. 39).

**Platform notes.** The application form at `/prijava-za-pomoc` already collects the fields in § 5 except the statement of other sources and the two consents (data processing; publication of a story or photo); those need adding. The disbursement record's `committee_decision_ref` is the register number from § 13, and its `category` should use the five categories in § 4 (health, home, children and education, accident and disaster, community).

## 4. Points for the lawyer

The draft has no separate "Points for the lawyer" section; the two CHECK items above are the open legal and accounting questions.

## 5. Montenegrin corrections made

- § 1: "Kriterijume predlaže Komisija za dodjelu sredstava, usvaja Upravni odbor i objavljuju se na internet stranici udruženja prije primjene" → "Kriterijume predlaže Komisija za dodjelu sredstava, a usvaja Upravni odbor; objavljuju se na internet stranici udruženja prije primjene" (the sentence changed subject mid-way; no change of meaning).
- § 2: "Fond podrške" → "Fond za pomoć" (the statute and the other governance documents use "Fond za pomoć" for the Impact Fund).
- § 11: "gubi pravo na nove prijave [[PLACEHOLDER: broj]] mjeseci" → "gubi pravo na nove prijave narednih [[PLACEHOLDER: broj]] mjeseci" (missing word; duration now reads grammatically).
- § 12 and § 13: "javna knjiga" ("u javnoj knjizi") → "javni registar" ("u javnom registru"), twice, to match the term used in the Donation Policy, the Impressum and the Sponsorship Agreement for the public ledger.
- Bilingual headings and the bilingual table header and cells in § 6 were split into their languages.

Things I was unsure about:

- § 12, "Dijete se ne može prepoznati ni uz saglasnost roditelja": kept as drafted; the intended meaning (a child may not be made identifiable even with a parent's consent) is what the English says. The lawyer may want a more explicit wording ("Dijete se ne smije učiniti prepoznatljivim").
- § 3 item 2, "do 26 godina": kept as drafted and not turned into a placeholder, since it is a substantive choice in the draft, but the spec treats ages as Board parameters; flag it if the Board wants it configurable.
- § 5 keeps the page name „Prijava za pomoć“ in Montenegrin in the English file, since it is the name of a page on the site.
- The Montenegrin uses "nijesu" (§ 6), the standard Montenegrin ijekavian form; left as is.
