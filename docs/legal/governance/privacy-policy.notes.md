# Privacy Policy — notes

## 1. What the document is and where it hangs

The full policy behind the public page at `/privatnost` (`content/legal/privacy.ts`), written for Montenegro's Law on Personal Data Protection and, because the association has EU donors, the GDPR. After legal review the site page is regenerated from Part A so the two never diverge. Part B holds the internal records the law expects a controller to keep: processing register, processors and agreements, retention schedule, rights-request and breach procedures, access and security measures, accountability. Montenegrin is the operative text; the English and Russian files are translations.

Drafted 2026-09-21 from the site drafts (privacy, cookies), the brief (§ legal pages), the database schema, `.env.example` (which providers are wired) and `docs/STRAVA.md`. **The lawyer reviews before publication**, especially Articles 4, 8, 9 and the retention schedule (Article 16). Bracketed values are parameters; suggested values are in section 3 below.

## 2. Decisions embedded in the draft

From the brief and the site drafts:

- analytics off until consent;
- no advertising pixels ever;
- the public ledger shows a chosen display name or "Anonymous", never contact details;
- beneficiaries appear only in generalised form;
- card numbers never touch our servers;
- photos of identifiable people only with consent, stricter for children.

## 3. Checks, parameters and platform notes (former Part C)

### Checks

**CHECK with the lawyer:**

- the statutory retention period for accounting records (Articles 8 and 16);
- the response deadline for rights requests under Montenegrin law versus the GDPR's one month (Article 9);
- whether the association must appoint a formal data protection officer or register processing with the Agency, and the Agency's current contact details;
- the transfer mechanism for each non-EU processor (Vercel, Strava, Anthropic) and whether standard contractual clauses are in their terms;
- the legal basis wording for the public ledger (legitimate interest with the anonymity choice) and for volunteer criminal-record certificates under the safeguarding policy;
- the explicit-consent wording for aid applications (Article 4).

**CHECK with each processor:** hosting region and data-processing terms (Supabase project region, Vercel, Resend), Monri's processing addendum, Plausible's terms.

**CHECK with the accountant:** which payment records must be kept and for how long.

### Suggested parameters

Each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Rights-request response (Odgovor na zahtjev) | 30 days, extendable once with notice | Art. 9, 17 |
| Account inactivity before deletion (Neaktivnost naloga) | 3 years | Art. 8, 16 |
| Aid application retention (Prijave za pomoć) | 5 years after last payment or refusal | Art. 8, 16 |
| Event data retention (Podaci o događaju) | 6 months | Art. 8, 16 |
| Server log retention (Logovi) | 30 days | Art. 8, 16 |
| Correspondence retention (Prepiska) | 2 years | Art. 8, 16 |
| Volunteer records after engagement (Volonteri) | 2 years | Art. 16 |
| Notice before substantial changes (Obavještenje o izmjenama) | 15 days | Art. 13 |

Note: the 15-day notice period in Article 13 and the 30-day deletion notice in Article 16 are written as fixed numbers in the draft, not as placeholders; the statutory accounting period, inactivity period, aid-application, event-data, log, correspondence and volunteer/business-contact periods remain placeholders.

### Platform notes

Already in place or specified:

- RLS on every public view with tests proving anonymous clients cannot read donor email, private beneficiary notes or processor fields;
- anonymity choice at donation;
- waiver version and timestamp;
- Strava token deletion on disconnect;
- analytics gated on consent;
- no advertising pixels.

Needed by this policy:

- a way to switch a past gift to anonymous without touching the ledger row (display flag on the public view);
- an account self-delete or delete-request path that anonymises ledger rows and removes profile data;
- automated retention jobs for event data, logs and inactive accounts;
- an export of a person's data across tables for access and portability requests;
- a rights-request log and a breach log (documents in storage are enough at first);
- update of `content/legal/privacy.ts` from Part A after review, with processor regions filled from `docs/PLACEHOLDERS.md`.

## 4. Points for the lawyer

The draft has no separate "Points for the lawyer" section; the lawyer checks are the "CHECK with the lawyer" list in section 3 above.

## 5. Montenegrin corrections made and open doubts

Corrections (old → new):

- Art. 1: `[[PLACEHOLDER: adresa, Tivat]]` → `Teuta 113, Porto Montenegro, 85320 Tivat` (known registered address, filled in all three language files; placeholder count drops from 27 to 26).
- Art. 2 item 5: "sati" → "sate" and "fotografija" → "fotografiju" (accusative, to agree with the rest of the list governed by "prikupljamo").
- Art. 4: "u obimu potreban za odluku" → "u obimu potrebnom za odluku" (case agreement).
- Bilingual headings and table headers/cells ("Svrha / Purpose", "Obrađivač / Processor", "podaci iz čl. 2 t. 1 / Art. 2(1)" etc.) split into their languages; italic English summary paragraphs dropped in favour of the full translation.

Structural notes:

- The two empty "Then" cells in the Article 16 table (incident records; registers of interests and breach reports) are kept empty in all three files, as in the draft.
- Fixed figures in the draft were left as they are: 18 years (Art. 12), 15 days (Art. 13), three working days (Art. 7, 16, 17), 30 days' notice (Art. 16), 24 and 72 hours (Art. 18), seven days (Art. 19).

Doubts:

- Art. 9 and 18 name the authority "Agencija za zaštitu ličnih podataka i slobodan pristup informacijama"; the draft mixes "podaci o ličnosti" (the law's term) and "lični podaci" (the Agency's name). Left as drafted since both are in use; the lawyer may want to harmonise.
- Art. 2 item 2 lists "lice koje prisustvuje" (the accompanying person) among minor participants' data; translated as "the accompanying person" (EN) / "сопровождающего лица" (RU) on the assumption it means the adult accompanying the child at the event, matching the Event Terms.
- Art. 19 "član svoje podatke": translated as "a member their own data" (EN) and "член объединения — свои данные" (RU), reading "član" as a member of the association / registered user, not a Board member.
- Russian "Заявление участника" is used for "Izjava o učešću" (Participation Waiver) per the term list; "Условия участия" for "Uslovi učešća" (Event Terms).
