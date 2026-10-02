# Beneficiary Application — notes

## 1. What the document is and where it hangs

The application form behind `/prijava-za-pomoc`, the plain-language guidance shown with it, and the staff intake templates. The form is the entry point to the Grants criteria (`grants-criteria.md`): it asks exactly what section 5 of the criteria requires and nothing the Committee does not use. The live form today collects a name, a contact, a four-way "who is the help for" choice, an optional amount and a description; the document keeps that as an easy first step so nobody is put off, and adds a second step with the details the criteria need. Part A is the form; Part B is the guidance for applicants in the team guide's voice; Part C is the intake procedure and the letters staff send. Part D of the draft (checks, parameters and platform notes) is reproduced below and is not part of the document. Montenegrin is the operative text; the English file is a translation. Drafted 2026-09-21 from the criteria, the safeguarding and privacy policies, the live form and the beneficiary applications table.

## 2. Decisions embedded in the draft

From the criteria and the site copy:

- anyone can apply and no connections are needed;
- the Committee decides under published criteria;
- an incomplete application is never refused, the applicant is told what is missing;
- payment goes to the supplier where possible;
- the beneficiary appears in the ledger only in generalised form;
- sensitive data is given under explicit consent;
- children's data comes only from a parent, guardian or institution.

## 3. Part D: checks, parameters and platform notes

**CHECK with the lawyer:** the explicit-consent wording in point 23 for health and social-status data under the Law on Personal Data Protection, including whether a parent's consent suffices for a child's medical documents and how withdrawal before a decision is handled; whether asking for a criminal or connection disclosure (point 26) needs any particular wording; the statement in point 25 that applying creates no entitlement.

**CHECK with the Grants Committee:** that the form's fields and attachment list match sections 5 and 6 of the criteria before either is adopted, so nothing is asked that is not assessed and nothing assessed is left unasked.

**CHECK with the Centre for Social Work in Tivat:** what confirmation they can issue to applicants and in what form, so point 18 asks for something obtainable.

Suggested parameters, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| First contact after step 1 (Prvi kontakt) | 3 working days | Part A, C.1 |
| Completion deadline (Rok za dopunu) | 30 days | C.1 |
| Decision after a complete file (Odluka) | 21 days; 48 hours urgent (criteria) | Part B |
| Reconsideration window (Ponovno razmatranje) | 15 days (criteria) | C.2 |
| Receipt confirmation after payment (Potvrda prijema) | 30 days (criteria) | C.2 |

**Platform notes.** The live form and the `beneficiary_applications` table cover step 1 (applicant name, contact, category, optional amount, description, attachments, status, chapter). Step 2 needs:

- an applicant-role choice with relationship and consent fields;
- separate beneficiary fields (name or entity, municipality, address, household or staff, prior aid flag);
- a "what for" category with the five criteria values alongside the existing four "who for" values, and a mapping so the disbursement `category` uses the five;
- an itemised cost list with supplier and amount;
- urgent portion and urgency text;
- payee choice;
- other-sources checklist with answers and own contribution;
- typed attachment slots;
- the six declarations with version and timestamp;
- the connection flag surfaced to staff before assignment;
- the story and photo consents stored separately and revocably;
- preferred contact channel.

Statuses should grow from `received`, `in_review`, `approved`, `declined` to add `withdrawn` and `closed_incomplete`. Access to step 2 data must be limited to Committee members and file preparers, matching the privacy policy. The C.2 letters can be email templates keyed to status changes.

## 4. Points for the lawyer

The draft has no separate "Points for the lawyer" section; the lawyer checks are the three items under "CHECK with the lawyer" in section 3 above (consent wording in point 23, disclosure wording in point 26, the no-entitlement statement in point 25).

## 5. Montenegrin corrections and open doubts

Corrections made: none. The Montenegrin text was copied as drafted; only the bilingual headings were split, the draft intro, the "Decisions embedded" paragraph, the italic English summaries and Part D were removed.

Open doubts:

- Part B, "Ko može da traži pomoć": "Pomoć tražimo za porodice u nevolji…" reads as "we raise help for", i.e. the association seeks help on behalf of these groups. It is left as drafted (translated "We raise help for…"); if the intended meaning is "we help families…", the sentence should read "Pomažemo porodicama u nevolji…".
- Point 27 refers to "nacionalno lice za zaštitu djece", matching Article 7 of the Child Safeguarding Policy; translated as "the national safeguarding lead" as in that policy.
- Point 6 of step 1 and the declarations in points 22 to 26 use "Pročitao/la", "Saglasan/na", "prepoznatljiv/a" gender-slash forms; kept as drafted, as they are usual in forms.
- The "*" required-field marks inside list items (e.g. "Prijavu podnosim *  [ ] …") are kept literally; some Markdown renderers may try to read a pair of them as italics within one item (points 2 and 19 in step 2 each contain two). The project's own parser does not, and the alignment check passes.
- The step 1 heading in the draft's Montenegrin reads "Korak 1 — Javite nam se" and the "[Pošalji prijavu]" line is the button label followed by the confirmation text; both are kept as paragraphs.
