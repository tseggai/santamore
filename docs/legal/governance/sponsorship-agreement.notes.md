# Sponsorship Agreement and Sponsorship Rules — notes

## 1. What the document is and where it hangs

The agreement the association signs with every sponsor (Part A, with three annexes: package and deliverables, name and mark usage rules, sponsor report) and the internal rules behind it (Part B: packages and price list, who negotiates and signs, invoicing, ethics screening, delivery and records). Sponsorship funds the Operations Fund and, per the team guide, "pays our salaries so donations don't have to"; it is a contract with deliverables, never a donation, which is why the Donation Policy (Art. 10), the Conflict of Interest Policy (Art. 7), the Chapter Rules (Art. 15) and the Grants criteria all keep it apart from gifts. Montenegrin is the operative text; the English file is a translation. Drafted 2026-09-21 from the team guide (tier sheet, the four things every sponsor gets back, the tax and VAT points), the brief and the sponsors table.

**The lawyer and the accountant review before the first signature**, in particular VAT and invoicing (Articles 5 and 15) and the tax-deduction claim (Article 16). Bracketed values are parameters; the tier amounts are the team guide's own sheet, shown as its proposal and not as adopted prices.

Fund model, as verified against the draft: sponsorship is the only income that funds the Operations Fund; donations, entry fees and grants go to the Impact Fund. The draft is consistent with this throughout (Art. 1, Art. 9 conversion into a donation goes to the Impact Fund, Art. 15 booking to the Operations Fund, the Annex 1 Core Cost Partner footer line). No sentence had to be listed as contradicting it.

## 2. Decisions embedded in the draft

From the team guide and the policies:

- Sponsorship goes to the Operations Fund and is published in the ledger.
- A sponsor never influences who receives funds.
- Every package includes a report within 30 days, an employee team slot and an invitation to the handover.
- In-kind sponsorship is valued and recognised like cash.
- The Executive Director signs.
- The Board sets the packages and the excluded industries.

## 3. Checks, parameters and platform notes (former Part C)

**CHECK with the accountant:** whether sponsorship is a taxable supply for VAT, the association's VAT registration status and the threshold the team guide cites, how to invoice sponsorship and value in-kind sponsorship, whether sponsorship income is income from economic activity for profit tax and the threshold the team guide cites, whether that makes CRPS registration of an economic activity necessary (registration pack, completion guide row O), and the exact scope of the 3.5 percent deduction the team guide relies on.

**CHECK with the lawyer:** the liability cap in Article 10, the confidentiality carve-out for publication in Article 11, the withdrawal charge in Article 9, the termination grounds in Article 12, the competent court, and whether a sponsorship with an employee team and entries creates any consumer-contract element.

**CHECK with the Board:** the excluded-industries list, the package sheet and the approval threshold.

Suggested parameters, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Payment term | 15 days from invoice | Art. 4 |
| Artwork deadline before the event | 21 days | Art. 8 |
| Renewal conversation before expiry | 60 days | Art. 7 |
| Sponsor withdrawal charge cap | 30 percent of the sum | Art. 9 |
| Termination notice for a permanently cancelled event | 30 days | Art. 12 |
| Approval of sponsor material | 5 working days | Annex 2 |
| Board approval threshold | 5,000 EUR or any exclusivity | Art. 15 |
| Director's discount authority | 15 percent | Art. 14 |

Tier amounts carried as placeholder descriptions in Art. 14 (the team guide's sheet, a proposal and not adopted prices): Core Cost Partner 10,000 EUR and above per year; Title Partner 5,000 EUR per event; Gold 2,500 EUR; Silver 1,000 EUR; Local Business 250 to 500 EUR; Match Partner any amount, matched within a window; In kind valued, recorded and recognised like cash.

**Platform notes.** The sponsors table already stores name, tier, chapter, amount, in-kind flag, logo, website, contract path, deliverables as JSON and the lifecycle status this document uses; the deliverables JSON should hold the Annex 1 rows with owner, deadline and done flag so the phase-two deliverables tracker can render them and flag late reports. The partners page publishes sponsors by tier; the ledger publishes sponsorship as Operations Fund income with the sponsor named. Tier values in the price list belong in a Board-adopted document, not in code.

## 4. Points for the lawyer

The draft has no separate "Points for the lawyer" section; the lawyer's checks are the ones listed under section 3 above (Articles 9, 10, 11, 12, the competent court, and the possible consumer-contract element of employee teams and entries).

## 5. Montenegrin corrections made

- Art. 3: "uticaj na to ko dobija sredstva udruženja, što odlučuje isključivo Komisija" → "…, o čemu odlučuje isključivo Komisija" (relative pronoun agreement).
- Art. 12: "prekrše član 3, 8 ili Kodeks ponašanja" → "prekrše član 3, član 8 ili Kodeks ponašanja" (clarity of the enumeration).
- Art. 13: "a ako to ne uspije nadležan je" → "a ako to ne uspije, nadležan je" (comma after the conditional clause).
- Annex 3: "politika privatnosti" → "Politika privatnosti" (statute terminology, capitalised like Kodeks ponašanja and Politika zaštite djece elsewhere in the text).
- Heading of the parties: "[[PLACEHOLDER: adresa, Tivat]]" filled with the known registered address "Teuta 113, Porto Montenegro, 85320 Tivat" (allowed by the spec); registration number, PIB, VAT status and IBAN stay placeholders.
- Bare marks "[[PLACEHOLDER]]" (contract number, registration number, PIB) given a description ("broj ugovora", "registarski broj", "PIB") so every mark has the canonical "[[PLACEHOLDER: description]]" form; no substance changed.
- Art. 5 placeholder: dropped the trailing "v. Dio C" from its description, since Part C is no longer in the document (its content is in section 3 of these notes).
- Art. 14: the tier placeholders written as "[[PLACEHOLDER: iznos, vodič tima: …]]" for all five tiers (the draft had that form only for Core Cost Partner); the amounts in the descriptions are unchanged.
- Annex 1 table: bilingual cells split per language ("Naziv u asocijaciji / Naming" and the like); the untranslated cell "dan događaja" in the Branded station row rendered as "event day" in English. "Impact Day" kept as an event name in both files.

Bilingual headings were split into their languages; the draft intro, the "Decisions embedded" paragraph, the italic English summaries and the whole of Part C were left out of the language files, as the spec requires.

## 6. Open doubts

- Fund model: nothing in the draft contradicts the rule that sponsorship alone funds the Operations Fund. One point to cross-check rather than a contradiction: Art. 15 says the chapter's share of a sponsorship "under the published formula is recorded for that chapter" while the payment is booked to the Operations Fund; the Chapter Rules should confirm that the chapter split formula applies to sponsorship and that it is a record within the Operations Fund, not a transfer to the Impact Fund.
- Art. 16 cites "Pravila donacija čl. 18" and "Pravila o sukobu interesa" (translated as Donation Policy Art. 18 and the Conflict of Interest Rules); the article number and the exact title of the conflict-of-interest document were not verified against those documents.
- Art. 6 and Annex 2 use the example designation "Zvanični partner Santamore Santa Run 2026" and Annex 1 uses "Santa Run 2026" and "Impact Day"; these are illustrative event names from the team guide, not confirmed event names or dates.
- Annex 1 row "Naziv u asocijaciji" (rendered "Naming") is a slightly unusual Montenegrin phrase; a better wording may be wanted, but it was left as drafted.
- Art. 4 in-kind valuation ("that value is not invoiced in money, unless the accountant finds that the regulations require otherwise") and Art. 5 depend entirely on the accountant's VAT and profit-tax opinion listed in section 3.
