# Terms of Use — notes

## What the document is and where it hangs

Full draft of the terms behind the public page at `/uslovi-koriscenja` (`content/legal/terms.ts`): the rules for using the site and an account on it. After legal review the site page is regenerated from Part A so the two never diverge; Part B holds the internal moderation procedure the terms refer to. The terms sit above the other public documents and say how they fit together: Donation Policy for money, Event Terms for events, Privacy Policy for data, Code of Conduct for behaviour, Child Safeguarding Policy for children. Montenegrin is the operative text; the English and Russian files are translations. Drafted 2026-09-21 from the site draft, the Code of Conduct, the brief (§ fundraiser pages, teams, share toolkit, donor messages) and the site's routes (fundraiser and team pages, challenges, proposals, volunteering, aid applications). **The lawyer reviews before use**, especially Articles 12, 13 and 16. Bracketed values are parameters; suggested values are below.

## Decisions embedded in the draft

From the brief and the site draft:

- sign-in by one-time email link, no passwords;
- only fundraisers, volunteers and staff need accounts;
- money raised through a page flows only through the association's accounts and the public ledger;
- content is moderated with a warning first where possible;
- Montenegrin law applies.

## Checks, parameters and platform notes (former Part C)

**CHECK with the lawyer:**

- the liability and warranty wording in Article 13 against the Law on Obligations and consumer-protection rules;
- whether the Montenegrin-prevails clause in Article 14 holds for EU consumers who used the English or Russian version;
- the scope and survival of the content licence in Article 12;
- the competent court for Article 16;
- whether member voting on the site (Article 8) needs a hook in the Statute or the Assembly's rules of procedure to have any binding effect;
- whether the terms should reference the Law on Electronic Commerce and any notice-and-takedown duties for user content.

Suggested parameters, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Automatic page closure after the event or cause (Zatvaranje stranice) | 60 days | Art. 4 |
| Time to fix content after a warning (Rok za ispravku) | 3 days | Art. 11 |
| Appeal window and decision (Prigovor i odluka) | 15 days each | Art. 11 |
| Notice before substantial changes (Obavještenje o izmjenama) | 15 days | Art. 16 |
| First moderation review (Prvi pregled) | 2 working days, same day for urgent | Art. 17 |
| Retention of removed content (Uklonjeni sadržaj) | 30 days | Art. 17 |

**Platform notes.** Already built or specified: magic-link sign-in; fundraiser and team pages with moderation from the admin console; donor messages that are public and moderatable; cash logging with hand-in status; share toolkit images; Strava connection with token deletion on disconnect; member role separate from staff roles.

Needed by these terms:

- an on-page "Report" button for pages, teams and messages that creates a moderation item;
- a moderation log with reason, decider and appeal outcome;
- an automatic page-closure job after the cause or event with the configured delay;
- a "connected person" disclosure field on the fundraiser page editor (Article 4 point 4);
- an account self-close path that anonymises ledger rows (also required by the Privacy Policy);
- versioning of the terms with the accepted version stored on the account at sign-up.

The public page `content/legal/terms.ts` is regenerated from Part A after legal review.

## Points for the lawyer

The draft has no separate "Points for the lawyer" section; the lawyer checks are the list above, plus the in-text placeholders in Article 14 (EU consumers' language choice) and Article 16 (competent court for Tivat).

## Montenegrin corrections made

- Article 1: `[[PLACEHOLDER: adresa, Tivat]]` → filled with the known registered address "Teuta 113, Porto Montenegro, 85320 Tivat" (as the spec allows). This removes one placeholder mark from all three files.
- Article 1: bare `registarski broj [[PLACEHOLDER]]` → `[[PLACEHOLDER: registarski broj]]`; bare `PIB [[PLACEHOLDER]]` → `[[PLACEHOLDER: PIB]]` (descriptions added so the marks are self-explanatory; no substance changed).
- Article 15: "Sumnju na povredu Kodeksa" → "Sumnju na povredu Kodeksa ponašanja" (consistent full name of the document).
- Everything else copied unchanged; no spelling, grammar or numbering errors found.

## Open doubts

- Article 1 keeps "Uslovi učešća na događajima (prijave i učešće)" as the descriptive long form; the statute short form "Uslovi učešća" is used in Article 3. Left as drafted since the long form reads as a description, not a different document.
- Article 1 refers to the page "Podaci o organizaciji"; the live site's `content/legal/terms.ts` calls it "Informacije o organizaciji". The draft's name was kept; the site page title should be aligned one way or the other when the page is regenerated.
- The organisation is named in the long form "Nevladino udruženje „Santamore“" in all three files (RU: «Неправительственное объединение «Santamore»»), as the spec permits; the registered name "SANTAMORE NVU" is not used here.
- English "cause" is used for *kampanja* per the term list; the fundraising target in Article 4 ("cilj") is rendered "target" to avoid reading as a second "cause".
- Russian "челлендж" is used for *izazov* (the site's likely UI term); "испытание" would be the more formal alternative if the RU site copy uses it.
