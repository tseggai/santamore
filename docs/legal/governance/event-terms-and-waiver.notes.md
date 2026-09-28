# Event Terms and Participation Waiver — notes

## What the document is and where it hangs

The full terms every participant accepts at registration (Part A) and the waiver they sign (Part B), in one document. The site already carries a shorter public draft at `/uslovi-ucesca` (`content/legal/eventTerms.ts`); this document is the complete version the lawyer reviews, after which the site page is regenerated from it so the two never diverge. The platform shows the Part B text in full and stores it with the registration under `waiver_version` and `waiver_signed_at`. Montenegrin is the operative text; the English and Russian files are translations.

Drafted 2026-09-21 from the site draft, the brief (§ event terms and waiver), the Child Safeguarding Policy and the Chapter Rules. **The lawyer reviews before use**, especially Articles 6, 7 and 19 on liability and insurance. Bracketed values in the text are parameters; suggested values are below.

## Decisions embedded in the draft

From the brief and the site draft:

- Entry fees go to the Operations Fund, not to donations (Art. 2).
- No refund on withdrawal, but free transfer of the registration to another person until registration closes (Art. 12).
- Postponement carries the registration over to the new date (Art. 13).
- Cancellation by the association gives a refund or a donation, at the participant's choice (Art. 13).
- Minors register through a parent or guardian, who signs the waiver B.2 (Art. 4).
- Photo consent is a choice made at registration (Art. 10, waiver points B.1.6 and B.2.7).
- Safety comes before the programme (Art. 13).

## Checks

**CHECK with the lawyer:** whether the exclusion and assumption-of-risk wording in Articles 6 and 7 and waiver point 3 is enforceable under the Montenegrin Law on Obligations, and what a parent may validly waive on a child's behalf (B.2 point 3); whether the Law on Sport or municipal rules require organiser accident insurance for participants at public sporting events, which would change Article 5; whether an electronic checkbox with timestamp is sufficient proof of signature for the waiver, or whether a stronger electronic signature is needed for minors; the competent court for Article 19; consumer-protection rules on refunds and transfers (Articles 12 and 13) for entry fees; the results-publication basis under the Law on Personal Data Protection (Article 11).

**CHECK with the insurer and the national safety lead:** conditions of the organiser's liability policy (Article 5) and whether the swim rules in Article 9 match the policy's requirements.

**CHECK with the Board:** the minimum-age table in Article 4, which must also match the Child Safeguarding Policy's parameters.

## Parameters

Suggested parameters, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Parent present at the event (Prisustvo roditelja) | under 12 | Art. 4 |
| Photo removal on request (Uklanjanje fotografije) | 3 working days | Art. 10 |
| Refund after cancellation (Povraćaj) | within 30 days, same method | Art. 13 |
| Protest window (Rok za prigovor na rezultat) | 30 minutes on site, 48 hours online | Art. 14 |
| Complaint window and reply (Prigovor i odgovor) | 14 days, reply in 15 | Art. 17 |
| Unclaimed belongings (Nepreuzete stvari) | 30 days | Art. 16 |
| Waiver version (Verzija izjave) | 1.0, dated at adoption | Part B |

## Platform notes

- The registration flow already stores `waiver_signed_at` and `waiver_version`; the version string must change whenever Part B changes, and the full Part B text of that version must remain retrievable for every stored registration.
- B.2 needs fields the schema does not yet have: registering parent's name and date of birth, reachable phone, presence choice with the designated adult's name and phone, the collecting adult, and health notes for the medical team (kept per Child Safeguarding Policy Art. 16).
- B.1 needs the results-name choice and the emergency contact if not already collected.
- The event page needs slots for minimum age, cut-off times, cap colour and the swim rules referenced in Articles 4, 7 and 9.
- The public page `content/legal/eventTerms.ts` is regenerated from Part A once the lawyer signs off.
- The Part B intro sentence in the draft named the fields `waiver_version` and `waiver_signed_at` in code; the language files keep the sentence in plain words (the platform stores the version number and the date and time of confirmation) and the field names live here.

## Points for the lawyer

The draft has no separate "Points for the lawyer" section; the lawyer checks are listed under Checks above.

## Placeholders

The language files carry 10 placeholder marks each: registration number, PIB and contact email (Art. 1); the minimum-age table and the age below which a parent must be present (Art. 4); contact email (Art. 10 and Art. 17); the competent court (Art. 19); the waiver version number and date (Part B). The registered address placeholder in Art. 1 was filled with the known address "Teuta 113, Porto Montenegro, 85320 Tivat". The two bare "[[PLACEHOLDER]]" marks in Art. 1 were given descriptions ("registarski broj", "PIB") without changing their meaning.

## Montenegrin corrections made

- Art. 2: "ili u rok naveden na stranici, šta prije nastupi" → "ili istekom roka navedenog na stranici, šta prije nastupi" (case agreement).
- Art. 3: "da nam nije poznata nijedna vaša zdravstvena okolnost" → "da vam nije poznata nijedna vaša zdravstvena okolnost" (the participant, not the association, makes the declaration; matches the English summary and waiver point B.1.2).
- Art. 3: "Dužni ste da nas na obrascu za prijavu obavijestite o alergijama … ako želite da medicinska služba to zna" → "Možete nas na obrascu za prijavu obavijestiti …" (the sentence contradicted itself; the summary says "you may" and waiver point B.1.8 marks the notes as optional).
- Art. 5: "sopstveno zdravstveno i osiguranje od nezgode" → "sopstveno zdravstveno osiguranje i osiguranje od nezgode" (ellipsis made the phrase unclear).
- Art. 6: "ne isključuje ni ne ograničava" → "ne isključuje niti ograničava".
- Art. 7: "Kontrolna vremena i tačke prekida … objavljene su" → "objavljeni su" (mixed-gender subject).
- Art. 8: "uključujući Djeda Mraz odijela" → "uključujući odijela Djeda Mraza".
- Art. 15: "ne prima ni ne prosljeđuje" → "ne prima niti prosljeđuje".
- Part B intro: the code field names in parentheses were dropped from the sentence (see Platform notes).
- Title: the draft's "Uslovi učešća na događajima i Izjava o učešću" became "Uslovi učešća i izjava o učešću", as instructed.

## Open doubts

- Art. 3, fourth paragraph: the change from "Dužni ste" to "Možete" resolves an internal contradiction but softens an obligation; if the Board intends that participants must disclose conditions, the sentence should instead read "Dužni ste da nas … obavijestite …" and drop "ako želite da medicinska služba to zna", with waiver point B.1.8 made mandatory.
- Art. 8: "u oba uva" was left as written; "u oba uha" is the other accepted form.
- B.2: "kao roditelj / staratelj [zaokružiti]" and "rođenog [datum rođenja]" were kept as in the draft; the platform will render them as a choice and a field rather than as text to circle.
- Russian: "maršal/redar" is rendered "маршал", as on the existing site page; "Fond za pomoć" would be "Фонд помощи" but does not occur in this document.
