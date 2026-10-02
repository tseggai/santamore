# Organisation details — notes

## 1. What the document is and where it hangs

The page behind `/impressum` (`content/legal/impressum.ts`): the organisation details page the card acquirer inspects before enabling live payments (brief, legal pages). Unlike the other governance documents it is almost entirely facts, and every fact is a placeholder until the registration steps produce it. Its value is that it names every field the page must carry, where each value comes from (Part C below) and what else an acquirer looks for across the site (Part B below). Drafted 2026-09-21 from the site draft, the brief and the registration pack. No value may be invented; the fill-in table in Part C says which document or step supplies each one. The language files `impressum.me.md`, `impressum.en.md` and `impressum.ru.md` carry only Part A, the page text, under the titles "Informacije o organizaciji" / "Organisation details" / "Сведения об организации". Because Part A is the whole page, the "DIO A / PART A" wrapper heading was dropped and the page sections (Introduction, 1 to 8) are the "##" headings.

## 2. Decisions embedded in the draft

- The impressum is one page, updated within 15 days of any change in the register.
- Legal form stated as a non-governmental association under Montenegro's Law on NGOs; registering body given as the Ministry of Regional Investment Development and Cooperation with Non-Governmental Organisations, Podgorica.
- The Executive Director is the authorised representative and is responsible for the site's content; the President of the Assembly is named; the bodies are the Assembly, the Board, the Grants Committee and the Executive Director (to be aligned with the final Article 9 of the Statute).
- Three contact emails (general, payments and refunds, data protection), a phone with hours, the postal address equal to the registered office.
- One EUR bank account; donations by transfer carry the SM-MMYY-NNNN reference; transfers without a reference go to the general Impact Fund.
- Card payments through Monri (legal name and acquiring bank to be confirmed from the contract), 3-D Secure on every payment, card data only in the processor's form, PCI DSS on the processor's side; charging currency EUR, the cardholder's bank converts.
- Two funds: donations, entry fees and grants go to the Impact Fund and one hundred percent of the net amount is paid out to beneficiaries; sponsorship alone funds the Operations Fund (see the correction under section 5 below). The independent Grants Committee decides who receives funds under published criteria; every payment in and out is in the public ledger; an annual financial report page.
- Content complaints answered within 15 days; no liability for linked sites; no use of the name, mark or content without consent.
- Supervision by the registering ministry and, for data, the Agency for Personal Data Protection and Free Access to Information; disputes settled by agreement where possible; Montenegrin law applies.

## 3. Part B: what the acquirer checks across the site

Card schemes and acquirers require a merchant site to show a fixed set of things before live card acceptance. The list below is the usual set; **CHECK it against Monri's own onboarding checklist and the acquirer's requirements** when the merchant application is filed, and add anything they require that is missing here. Each item names the page that carries it.

| Requirement | Where | Status |
|---|---|---|
| Legal name, legal form, registered address, registration number, tax number | Impressum § 1; footer | name and address known (SANTAMORE NVU, Teuta 113, Porto Montenegro, 85320 Tivat); registration number and PIB placeholders until registration |
| Customer service contact: email and phone | Impressum § 3; footer; contact page | placeholders |
| Country of the merchant's establishment | Impressum § 1 (Montenegro) | done |
| Transaction currency | Impressum § 4 and § 5; donate flow (EUR everywhere) | done |
| Complete description of what is offered | Donate page, event pages, About page (donations, event registrations, merchandise if any) | done in site copy |
| Refund, cancellation and return policy | Donation Policy; Event Terms | drafted, lawyer review pending |
| Terms and conditions | Terms page (`/uslovi`), Event Terms, Donation Policy | drafted |
| Privacy policy and cookie notice | Privacy Policy; Cookie Policy; consent banner | drafted |
| Security statement: 3-D Secure, PCI DSS, no card data stored | Impressum § 5; donate flow security line | drafted, processor and acquirer names pending |
| Accepted card brand logos, official artwork | Impressum § 5; footer; donate flow payment step | brands known (Visa, Mastercard, Maestro, American Express, Diners Club); logo assets in `public/brand/cards/`, confirm the list against the Monri contract |
| Statement descriptor shown to the customer | Impressum § 5; Donation Policy; receipt email | pending from Monri |
| Delivery policy | Not applicable for donations and registrations; if merchandise is sold, add a shipping and delivery page | decide when merchandise starts |
| Export or legal restrictions | Not applicable; state "no restrictions" if the checklist asks | decide |
| Order confirmation to the customer | Receipt email with amount, campaign, reference and ledger link; registration confirmation email | specified |
| Pricing shown with taxes | Event pages show entry fees with taxes included (Event Terms Art. 2) | done in terms |
| Data-protection contact | Privacy Policy Art. 1; Impressum § 3 | placeholder |
| Site served over HTTPS, valid certificate, no mixed content | Vercel hosting | done |

## 4. Part C: where each value comes from

Every placeholder in the page is supplied by a registration step or a contract. Fill the page only from these sources, then update `docs/PLACEHOLDERS.md` and the footer keys in `messages/*.json`.

| Value | Source | Step |
|---|---|---|
| Registered name, short name | Decision on founding Art. 2; Statute Art. 2; registration decision | Founding assembly; Ministry decision (registered name already known: SANTAMORE NVU) |
| Registered address | Decision on founding Art. 3; registration decision | Founding assembly (already known: Teuta 113, Porto Montenegro, 85320 Tivat) |
| Registration number and date, registering body | Decision on registration (rješenje o registraciji) | Ministry, within 10 days of a complete application |
| Authorised representative | Decision on founding Art. 7; Minutes; registration decision | Founding assembly |
| Bodies | Statute Art. 9 as finally adopted | Founding assembly |
| MONSTAT activity code | Notice of classification (obavještenje o razvrstavanju) | MONSTAT, after the registration decision |
| PIB | Certificate from the Tax Administration | Tax Administration, after MONSTAT |
| VAT status | Accountant's confirmation; tax registration | With the PIB |
| CRPS entry | CRPS excerpt | Only if an economic activity is registered |
| Bank, account name, IBAN, BIC | Account-opening contract; bank's written confirmation of IBAN and BIC | Bank, after the PIB and the OP form |
| Processor legal name, acquiring bank, accepted brands, descriptor, 3-D Secure programme names, logo artwork | Monri merchant contract and onboarding pack | Monri, after the bank account (accepted brands already known: Visa, Mastercard, Maestro, American Express, Diners Club; confirm against the contract) |
| Emails, phone, hours, domain | Board decision; domain registration; email provider setup | Before go-live |
| Annual report page | Site route once built | Before the first annual report |

**Platform notes.** The footer reads `footer.orgName`, `footer.orgAddress`, `footer.orgId`, `footer.iban`, `footer.email` and `footer.cards` from `messages/*.json`, and the SEPA panel reads `NEXT_PUBLIC_ORG_NAME`, `NEXT_PUBLIC_ORG_IBAN` and `NEXT_PUBLIC_ORG_BIC`; once real values exist, set them in one place and derive the rest (`docs/PLACEHOLDERS.md` already asks for this consolidation). The JSON-LD `Organization` block on the site should carry the same legal name, address, email and phone as this page. Add the card brand logos to `public/brand/` only from the schemes' official artwork with their required clear space and minimum size; the page's "We accept" line in § 5 is where the official logos are shown, in the prescribed size (this display instruction was part of the accepted-brands placeholder in the draft and has moved here). The page `content/legal/impressum.ts` is regenerated from Part A once the values exist; the acquirer checklist in Part B is a go-live gate, not page content.

## 5. Corrections made to the Montenegrin text, and open doubts

Corrections and fills (old → new):

- Section 6, fund rule: "donacije idu u Fond za pomoć i sto posto neto iznosa isplaćuje se korisnicima; kotizacije, sponzorstva, grantovi i članarine idu u Operativni fond" → "donacije, kotizacije i grantovi idu u Fond za pomoć, iz kojeg se sto posto neto iznosa isplaćuje korisnicima; sponzorstva idu u Operativni fond". The draft sent entry fees and grants to operations; the rule (decision of 2026-09-24, `docs/MONEY-MODEL.md`) is that donations, entry fees and grants go to the Impact Fund and sponsorship alone funds operations. Changed in all three languages.
- Section 1, "Registrovani naziv": placeholder → "SANTAMORE NVU (Nevladino udruženje „Santamore“)" (known registered name; the long form kept in brackets).
- Section 1, "Sjedište i adresa": two placeholders (street and number, postal code) → "Teuta 113, Porto Montenegro, 85320 Tivat, Crna Gora" (known registered address).
- Section 5, "Prihvatamo": placeholder → "Visa, Mastercard, Maestro, American Express i Diners Club." (known accepted brands; the logo-display instruction moved to the platform notes above).
- Section 4, "BIC/SWIFT": bare "[[PLACEHOLDER]]" → "[[PLACEHOLDER: BIC/SWIFT banke]]" so that every mark has a description.
- Section 1, "Skraćeni naziv" placeholder: "ako ga statut određuje" → "ako ga Statut određuje" (capitalised as elsewhere).
- Section 8: "nadzor nad zaštitom podataka Agencija …" → "nadzor nad zaštitom podataka vrši Agencija …" (missing verb).
- The "## DIO A: TEKST STRANICE" wrapper heading was dropped and the page sections promoted from "###" to "##", since Part A is the entire page.

Open doubts:

- Membership fees ("članarine") were in the draft's Operations Fund list. The rule given ("sponsorship alone funds operations") and `docs/MONEY-MODEL.md` do not mention membership fees, so they were removed from the sentence rather than assigned to either fund. Confirm with the Board whether the association charges membership fees and, if so, which fund they feed; then add them back in all three languages.
- The name of the registering ministry ("Ministarstvo regionalno-investicionog razvoja i saradnje sa nevladinim organizacijama") is copied from the draft; verify it against the registration decision when it arrives, as ministry names change with each government.
- Section 5 still names "Verified by Visa / Mastercard Identity Check" before the programme-names placeholder; Visa now calls its programme "Visa Secure", and American Express (SafeKey) and Diners Club (ProtectBuy) programmes are not named. Left as drafted with the placeholder; fill from the Monri onboarding pack.
- Section 1, "Skraćeni naziv": left as a placeholder because the short name depends on the Statute; if the registered name "SANTAMORE NVU" is itself the short form, the line can be filled or dropped.
- Russian, section 4: the reference format is explained as "SM-MMGG-NNNN, где MM — месяц, GG — год", a short gloss the Montenegrin and English lines do not carry, because the Montenegrin month-year abbreviation is not self-explanatory in Russian.
- The Russian rendering of the registering ministry and of the Agency for Personal Data Protection are translations, not official Russian names.
