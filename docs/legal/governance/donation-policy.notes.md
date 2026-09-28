# Donation Policy — notes

## 1. What the document is and where it hangs

Full draft of the policy behind the public page at `/pravila-donacija` (`content/legal/donations.ts`): how the association accepts gifts, what it promises about them, how refunds and cancellations work, and what it publishes. After legal review the site page is regenerated from Part A so the two never diverge; Part B holds the internal acceptance rules the Board adopts, which the public page summarises. Montenegrin is the operative text; English and Russian are translations. Drafted 2026-09-21 from the site draft, the brief (§ donate flow, § SEPA, § ledger), `docs/MONEY-MODEL.md` and the statute drafts. The lawyer and the accountant review before use, especially Articles 4, 12, 18 and 19. Bracketed values are parameters; suggested values are in section 3 below.

Per-language files: `donation-policy.me.md` (operative), `donation-policy.en.md`, `donation-policy.ru.md` (Russian required: public page). 72 blocks each.

## 2. Decisions embedded in the draft

From the brief and the site draft: two strictly separate funds; donations are voluntary and generally non-refundable; duplicate, erroneous and unauthorised charges refunded within a window; fee cover is optional and stored separately; anonymity hides the name but never the amount; every approved gift is immutable and corrections are new ledger rows; entry fees follow the event terms.

## 3. Checks, parameters and platform notes (former Part C)

**CHECK with the lawyer:** the association's obligations under the Law on the Prevention of Money Laundering and Terrorist Financing (whether NGOs are obliged entities, identification and source-of-funds thresholds, record-keeping) so Article 19 states real thresholds; consumer-protection and payment-services rules on refunds and chargebacks (Article 12); whether a donation contract for larger gifts is advisable; the data-retention period for payment records under accounting law (Article 11); the wording of Article 3 on non-refundability.

**CHECK with the accountant:** the tax treatment of donations for corporate donors and any confirmation format they need (Article 15); how fee cover, refunds and in-kind gifts are booked.

**CHECK with Monri:** the statement descriptor, refund mechanics and windows, tokenisation for monthly giving, chargeback process.

**CHECK with the bank:** IBAN, BIC, whether structured references survive incoming SEPA transfers unchanged, statement export format for reconciliation.

Suggested parameters, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Refund request window / Rok za zahtjev | 14 days from the charge | Art. 12 |
| Refund execution / Izvršenje povraćaja | 15 days from the decision | Art. 12 |
| Unreferenced transfer grace period / Uplata bez poziva na broj | 30 days | Art. 5 |
| Surplus above which donors are offered a choice / Višak uz ponudu donatorima | 2,000 EUR | Art. 6 |
| Monthly retry / Ponovni pokušaj | 2 retries within 7 days | Art. 8 |
| Board decision on declining a gift / Odbijanje donacije | above 5,000 EUR | Art. 18 |
| Identification threshold / Identifikacija | 1,000 EUR per giver per year (lawyer to confirm) | Art. 19 |
| Source-of-funds statement / Porijeklo sredstava | 10,000 EUR (lawyer to confirm) | Art. 19 |
| Unidentified cash / Gotovina bez identifikacije | 100 EUR | Art. 19 |
| Two-person refund approval / Dva odobrenja | above 500 EUR | Art. 22 |
| Publication of payments out / Objava isplata | 30 days | Art. 14 |

**Platform notes.** Already built or specified: donation statuses pending, approved, declined and refunded; fee cover in `fee_covered_cents`; anonymity with amount shown; the SM-MMYY-NNNN reference and EPC QR; pending SEPA rows not counted until reconciled; immutability with corrections in `ledger_adjustments`; cash hand-in status; receipts by email with a ledger link. Not yet specified and needed by this policy: a declined-gift record with reason (Art. 18); a per-donor yearly total for the identification threshold (Art. 19); a surplus-reallocation entry type with published reasons (Art. 6); a 30-day donor-choice flow on cancelled events (Art. 13); the descriptor, IBAN and BIC placeholders in `docs/PLACEHOLDERS.md`. The public page `content/legal/donations.ts` is regenerated from Part A after legal review.

## 4. Points for the lawyer

The draft has no separate "Points for the lawyer" section; the lawyer checks are the ones listed under section 3 (AML thresholds for Art. 19, consumer-protection and payment-services rules for Art. 12, donation contract for larger gifts, data-retention period for Art. 11, wording of Art. 3 on non-refundability).

## 5. Montenegrin corrections made

- Art. 1: `[[PLACEHOLDER: adresa, Tivat]]` → `Teuta 113, Porto Montenegro, 85320 Tivat` (known registered address; the placeholder asked for exactly that). Placeholder count drops from 21 to 20 in every language file.
- Art. 8: "preko veze u e-mail potvrdi" → "preko veze u potvrdi koju ste dobili e-poštom" (terminology: the document otherwise says "e-pošta/e-poštom"; "e-mail" kept only inside the placeholder descriptions, where the site uses it).
- Art. 18: "od lica koje udruženje ili njegovi članovi organa ne mogu identifikovati" → "od lica koje udruženje ili članovi njegovih organa ne mogu identifikovati" (word order / agreement).
- Art. 21: "Svaka obavještenja procesora provjeravaju se" → "Sva obavještenja procesora provjeravaju se" (agreement: neuter plural).

Left as they stand: "bez natezanja" (Art. 3, colloquial but intended tone), page names "Transparentnost" and "Podrži" (site page titles), "Uslovi učešća na događajima" (long form of the statute term "Uslovi učešća"), "SM-MMGG-NNNN" in Montenegrin (English and Russian files write the same pattern as SM-MMYY-NNNN, matching the platform notes and `docs/MONEY-MODEL.md`).

## 6. Open doubts for the owner

- **Fund split (Art. 2, Art. 13, Art. 7).** The draft states the older rule: the Operations Fund "consists of entry fees for events, sponsorships, grants, membership fees and income from the sale of merchandise" (Art. 2, third paragraph) and "An entry fee is a registration for a specific event and goes to the Operations Fund" (Art. 13, first sentence). Since 2026-09-24 the association's policy (see `docs/MONEY-MODEL.md`) is that donations, entry fees and grants go to the Impact Fund and sponsorship alone funds operations. The Montenegrin wording was kept as drafted and translated faithfully; the owner should decide whether Art. 2 and Art. 13 (and the list of what pays for organising in Art. 2) are rewritten to the 2026-09-24 rule before legal review. Art. 7 (fee cover not added is borne by the Operations Fund) and Art. 10 (sponsorship → Operations Fund) are consistent with both rules. Where membership fees and merchandise income go under the new rule is not stated in the money model and needs a decision too.
- Art. 2 says "Sto posto neto iznosa donacije isplaćuje se korisnicima" (one hundred percent of the net donation) while Art. 7 says "sto posto vaše donacije stiže do korisnika" (one hundred percent of your donation). Both are in the draft; the lawyer may want one formulation.
- Art. 4 (2): the Montenegrin pattern "SM-MMGG-NNNN" and the English/Russian "SM-MMYY-NNNN" describe the same reference; if the site shows the literal pattern to donors, one spelling should be chosen for all three languages.
- Art. 11 refers to the "Politika privatnosti" and Art. 1/13 to the "Uslovi učešća na događajima"; both exist as separate drafts, cross-references not verified against their article numbers. Cross-references to "Pravila o ograncima, član 13/16" (Art. 6, Art. 20) were not verified against the chapter-rules draft either.
- Russian: "Nevladino udruženje „Santamore“" is rendered as «Неправительственное объединение «Santamore»» with the name in Latin script (registered name is SANTAMORE NVU); the address is left in Latin script in all three files.

## Fund split corrected on 2026-09-28

Article 2 (the two funds) and Article 13 (entry fees) were rewritten in all three languages to the rule decided on 2026-09-24 (docs/MONEY-MODEL.md): donations, entry fees and grants go to the Impact Fund, sponsorship alone funds operations, and an event may state on its page that its entry fee funds operations instead. Membership fees and merchandise income stay in the Operations Fund, as the statute's Article 47 lists them among the association's own income; the Board should confirm that placement.
