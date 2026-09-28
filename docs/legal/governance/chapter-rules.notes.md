# Chapter Rules — notes

## What the document is and where it hangs

The rules that Article 43 of the statute additions (`docs/legal/registration/statute-additions.md`) has the Board adopt, one set for every chapter: how a chapter works, how events are planned and approved, how money is handled and recorded, how the name and mark are used, what is reported, and how the chapter works with the Executive Director. Montenegrin (`chapter-rules.me.md`) is the operative text; `chapter-rules.en.md` is the translation for founders who do not read it. Drafted 2026-09-21 from the team guide (chapter roles, the Chapter in a Box, the one-event-a-year charter, the published split), the brief (cash logging, waivers, safeguarding lead per event) and the statute drafts. The lawyer and the accountant review before adoption. Every placeholder in the document is a parameter for the Board; suggested values are below.

## Decisions embedded in the draft

All from the team guide:

- chapters are internal teams, not legal persons, with no account of their own;
- three officers per chapter (lead, treasurer, volunteer coordinator);
- one public event a year as the charter test;
- a published split of money raised in a town.

## Parameters for the Board and checks

Suggested starting values, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Annual plan deadline | 31 October | Art. 10 |
| Event notice | 60 days | Art. 11 |
| Complete file | 30 days | Art. 11 |
| Participant threshold for national sign-off | 200 participants | Art. 11 |
| Expense needing Director approval | 300 EUR per item | Art. 14 |
| Petty cash | 200 EUR | Art. 14 |
| Split local / national / solidarity | 70 / 20 / 10 (team guide) | Art. 16 |
| Annual report deadline | 31 January | Art. 19 |

**Check with the accountant:** cash receipt books and deposit references against Montenegrin bookkeeping rules; whether in-kind gifts must be valued and booked; how the per-chapter split is recorded in the books.

**Check with the lawyer:** the Article 16 reconciliation between the published split and the 100 percent-of-donations rule (see below); insurance wording so chapter events are covered; the Director's power to suspend an officer (Art. 22) against the Statute's dismissal rules.

**Check with the insurer:** conditions (lifeguards, medical cover, capacity) under which the policy covers water events.

**Platform notes.** The chapters table already stores the split in basis points per chapter (`split_local_bp`, `split_national_bp`, `split_solidarity_bp`); the cash log with hand-in status and the volunteer register exist in the brief. Missing for these rules: a per-chapter event approval record with the Article 11 checklist, and a place to file event and quarterly reports. Both are later code changes.

## Points for the lawyer

The draft had no separate "Points for the lawyer" section, but Article 16 carried an inline check that has been moved out of the document text:

- **Article 16, the split versus the two-fund promise.** The lawyer and the Board must state how the operations share in the published split relates to the promise in Article 16 paragraph 2 (Statute, Article 34 paragraph 2) that donations collected for beneficiaries are not reduced by operating costs. The team guide applies the split to every euro raised in a town, while the two-fund rule sends donations to beneficiaries in full. The platform stores the split per chapter in basis points, so it can be applied to sponsorship and entry fees only, or to everything; the Board decides and the formula is published in whichever form is adopted.

## Montenegrin corrections made

- Art. 3 point 5, Art. 4 point 7, Art. 21: "politiku/politika zaštite djece" → "Politiku/Politika zaštite djece" (name of the policy, as in the statute terminology).
- Art. 4 point 7: "uslove učešća na događajima" → "Uslove učešća na događajima" (name of the Event Terms).
- Art. 12 point 4: "sa prihvatanjem uslova učešća i izjave o odricanju od odgovornosti" → "sa prihvatanjem Uslova učešća i Izjave o učešću" (the statute's names for the Event Terms and the Participation Waiver; same document, consistent term).
- Art. 12 point 7: "pratilački čamac" → "prateći čamac" (standard term for a safety boat).
- Art. 16 paragraph 2: the inline "**CHECK:** …" note was removed from the operative text and moved to these notes; the paragraph now ends at "(Statut, član 34 stav 2)."

## Doubts

- Art. 12 point 4: the original wording "izjave o odricanju od odgovornosti" (waiver of liability) is descriptive; replacing it with the document name "Izjava o učešću" assumes that the Participation Waiver is the same document. If the lawyer wants the descriptive wording kept, revert in both languages.
- "Fond solidarnosti" / "Solidarity Fund" (Art. 16) is not in the statute term list; it is kept as the draft wrote it. The Board should confirm whether it is the Impact Fund (Fond za pomoć) under another name or a separate earmark.
- The draft's English summary of Article 5 says a vacancy "is filled on the lead's proposal within 30 days"; the Montenegrin says the lead proposes a replacement within 30 days. The translation follows the Montenegrin.
- Art. 13: "predat na čekanju" is rendered "handed in, pending"; the platform's actual status label should be used once fixed.
