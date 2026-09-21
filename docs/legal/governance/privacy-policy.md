# Politika privatnosti / Privacy Policy

Full draft of the policy behind the public page at `/privatnost` (`content/legal/privacy.ts`), written for Montenegro's Law on Personal Data Protection and, because the association has EU donors, the GDPR. After legal review the site page is regenerated from Part A so the two never diverge; Part B holds the internal records the law expects a controller to keep (processing register, processors, retention schedule, rights-request and breach procedures, security measures). Montenegrin is the operative text; the English under each article is a translation. Drafted 2026-09-21 from the site drafts (privacy, cookies), the brief (§ legal pages), the database schema, `.env.example` (which providers are wired) and `docs/STRAVA.md`. **The lawyer reviews before publication**, especially Articles 4, 8, 9 and the retention schedule. Bracketed values are parameters; suggested values are in Part C.

**Decisions embedded here, from the brief and the site drafts:** analytics off until consent; no advertising pixels ever; the public ledger shows a chosen display name or "Anonymous", never contact details; beneficiaries appear only in generalised form; card numbers never touch our servers; photos of identifiable people only with consent, stricter for children.

## DIO A: POLITIKA PRIVATNOSTI (JAVNA) / PART A: PRIVACY POLICY (PUBLIC)

### Član 1 — Ko je rukovalac

Rukovalac vašim podacima o ličnosti je Nevladino udruženje „Santamore“, [[PLACEHOLDER: adresa, Tivat]], registarski broj [[PLACEHOLDER]], PIB [[PLACEHOLDER]] (u daljem tekstu: mi, udruženje). Za sva pitanja o podacima pišite na [[PLACEHOLDER: e-pošta za zaštitu podataka, npr. privatnost@santamore.me]]. Lice zaduženo za zaštitu podataka je [[PLACEHOLDER: ime i funkcija]].

Ova politika važi za internet stranicu i platformu udruženja, za naše događaje, za rad sa korisnicima pomoći i za komunikaciju sa vama. Pišemo je u skladu sa Zakonom o zaštiti podataka o ličnosti Crne Gore i, pošto imamo donatore i učesnike iz Evropske unije, u skladu sa Opštom uredbom o zaštiti podataka (GDPR).

*Article 1. Controller.* The association (address, registration number and PIB as placeholders) is the controller; a data-protection email and a named contact are placeholders. The policy covers the website and platform, events, work with beneficiaries and our communication with you, under Montenegro's Law on Personal Data Protection and, for EU donors and participants, the GDPR.

### Član 2 — Koje podatke prikupljamo

Prikupljamo samo ono što nam treba za konkretan posao:

1. **Kada donirate:** ime i prezime, adresu e-pošte, iznos, način uplate, kampanju, poziv na broj, vaš izbor da li se ime prikazuje javno i ime za prikaz, jezik za potvrdu. Kod kartične uplate procesor može tražiti telefon i adresu radi provjere banke; ti podaci idu procesoru, ne nama. Kod bankovnog prenosa vidimo podatke sa izvoda (ime platioca, IBAN, iznos, poziv na broj). Kod mjesečne donacije procesor čuva karticu u tokenizovanom obliku, a mi vidimo posljednje četiri cifre i rok važenja.
2. **Kada se prijavite na događaj:** ime i prezime, datum rođenja, e-poštu, telefon, distancu ili aktivnost, veličinu majice, kontakt za hitne slučajeve, zdravstvene napomene koje sami date, potpisanu Izjavu o učešću sa datumom, vremenom i verzijom, izbor o fotografijama i o prikazu imena u rezultatima, plaćenu kotizaciju. Za maloljetne učesnike: podatke roditelja ili staratelja koji prijavljuje, lice koje prisustvuje i lice koje preuzima dijete.
3. **Kada otvorite nalog ili stranicu za prikupljanje:** e-poštu za prijavu, ime, telefon (nije obavezno), jezik, i ono što sami objavite: fotografiju, priču, cilj, tim. Prikupljeni iznosi na vašoj stranici su podaci o vama.
4. **Kada podnesete prijavu za pomoć:** ime i kontakt podnosioca, kategoriju potrebe, traženi iznos, opis i priloge (medicinska dokumentacija, računi, potvrde), izjavu o drugim izvorima, saglasnosti. Ovo su često posebno osjetljivi podaci (zdravlje, socijalni status); obrađuju se po članu 4.
5. **Kada volontirate ili ste dio tima:** ime, kontakt, uloge, prisustvo obukama, sati, za pojedine uloge izjave i uvjerenja po Politici zaštite djece, i fotografija ako pristanete da budete na stranici tima.
6. **Kada nam pišete:** ono što nam pošaljete i vašu adresu.
7. **Kada povežete Strava nalog** (po vašem izboru, za partnerske nagrade): identifikator naloga, ime, podatke o aktivnostima koje Strava pošalje (vrsta, datum, distanca, trajanje) i tokene za pristup. Ne prikupljamo GPS tragove ni lokaciju.
8. **Na događajima:** fotografije i snimke, po članu 7, i evidenciju incidenata kada se dogode.
9. **Tehnički podaci:** serverski logovi (IP adresa, vrijeme i putanja zahtjeva, tip pregledača) radi bezbjednosti i otklanjanja grešaka; kolačići po Politici kolačića.
10. **Ako ste sponzor, dobavljač ili partner:** poslovne kontakt podatke i ugovore.

Ne prikupljamo podatke o djeci od djece: sve podatke o maloljetnom učesniku daje roditelj ili staratelj.

*Article 2. What we collect.* When you donate (name, email, amount, rail, campaign, reference, display choice, language; card verification data goes to the processor; bank statement data for transfers; last four digits and expiry for tokenised monthly cards); when you register for an event (identity, contact, distance, shirt size, emergency contact, health notes you give, the signed waiver with date, time and version, photo and results choices, fee paid; for minors the registering parent, the accompanying and the collecting adult); when you open an account or fundraiser page (sign-in email, name, optional phone, language, and what you publish); when you apply for aid (applicant, category, amount, description, attachments that often contain health and social data, other-sources statement, consents); when you volunteer or join the team (contact, roles, training, hours, safeguarding declarations, team photo with consent); when you write to us; when you connect Strava (account id, name, activity summaries, tokens, no GPS); at events (photos and incident records); technical logs and cookies; business contacts of sponsors, suppliers and partners. We never collect children's data from children.

### Član 3 — Zašto i po kom osnovu

| Svrha / Purpose | Podaci / Data | Osnov / Basis |
|---|---|---|
| Obrada donacije, potvrda, javni registar / Processing a gift, receipt, public ledger | podaci iz čl. 2 t. 1 / Art. 2(1) | izvršenje ugovora; zakonska obaveza (računovodstvo); legitimni interes (javnost rada) / contract; legal obligation; legitimate interest |
| Prijava i učešće na događaju, bezbjednost, rezultati / Event registration, safety, results | čl. 2 t. 2 / Art. 2(2) | izvršenje ugovora; zaštita života i zdravlja; legitimni interes (bezbjednost) / contract; vital interests; legitimate interest |
| Nalog i stranica za prikupljanje / Account and fundraiser page | čl. 2 t. 3 / Art. 2(3) | izvršenje ugovora / contract |
| Odlučivanje o pomoći, isplata, objava u uopštenom obliku / Aid decisions, payment, generalised publication | čl. 2 t. 4 / Art. 2(4) | izričita saglasnost za osjetljive podatke; legitimni interes; zakonska obaveza (evidencija isplata) / explicit consent for sensitive data; legitimate interest; legal obligation |
| Volonteri i tim, zaštita djece / Volunteers and team, safeguarding | čl. 2 t. 5 / Art. 2(5) | ugovor o volontiranju; zakonska obaveza; legitimni interes; saglasnost za fotografiju / volunteering agreement; legal obligation; legitimate interest; consent for photo |
| Odgovaranje na poruke / Replying to you | čl. 2 t. 6 / Art. 2(6) | legitimni interes / legitimate interest |
| Partnerske nagrade preko Strave / Strava partner perks | čl. 2 t. 7 / Art. 2(7) | saglasnost (povezivanje naloga) / consent |
| Fotografije na kojima ste prepoznatljivi / Identifiable photos | čl. 2 t. 8 / Art. 2(8) | saglasnost / consent |
| Bezbjednost sajta, sprječavanje zloupotreba / Site security, abuse prevention | čl. 2 t. 9 / Art. 2(9) | legitimni interes / legitimate interest |
| Analitika posjeta / Visit analytics | kolačići / cookies | saglasnost / consent |
| Obavještenja e-poštom o radu udruženja / Email updates | e-pošta / email | saglasnost, opoziva u svakoj poruci / consent, withdrawable in every message |
| Sprječavanje pranja novca kod većih donacija / AML for larger gifts | identitet, porijeklo sredstava / identity, source of funds | zakonska obaveza / legal obligation |

Saglasnost možete povući u svakom trenutku; povlačenje ne utiče na obradu prije toga. Kada obradu zasnivamo na legitimnom interesu, možete prigovoriti po članu 9.

*Article 3. Why and on what basis.* The table maps each purpose to the data and the legal basis: contract, legal obligation, vital interests, legitimate interest or consent, with explicit consent for the sensitive data in aid applications. Consent is withdrawable at any time without affecting earlier processing; legitimate-interest processing may be objected to under Article 9.

### Član 4 — Posebno osjetljivi podaci

Podatke o zdravlju, socijalnom položaju, invaliditetu i sličnom obrađujemo samo: kada nam ih sami date u prijavi za pomoć ili kao zdravstvenu napomenu za događaj, uz izričitu saglasnost; u obimu potreban za odluku ili bezbjednost; sa pristupom ograničenim na Komisiju za dodjelu sredstava i lica koja pripremaju spis, odnosno rukovodioca događaja i medicinsku službu; i sa rokom čuvanja iz Dijela B. Nikada ih ne objavljujemo ni ne dijelimo van tog kruga, osim kada je to zakonska obaveza ili kada zaštita života to nalaže.

*Article 4. Sensitive data.* Health, social-status, disability and similar data is processed only when you give it in an aid application or as an event health note, with explicit consent, to the extent needed for the decision or safety, with access limited to the Grants Committee and file preparers or to the event manager and medical team, under the Part B retention schedule, and never published or shared beyond that circle except by legal duty or to protect life.

### Član 5 — Kome povjeravamo podatke

Ne prodajemo podatke nikome i ne dijelimo ih sa oglašivačima. Koristimo mali broj obrađivača koji podatke obrađuju po našim uputstvima i po ugovoru o obradi:

| Obrađivač / Processor | Šta radi / What it does | Gdje / Where |
|---|---|---|
| Supabase | baza podataka, prijava, skladište fajlova / database, sign-in, file storage | [[PLACEHOLDER: region projekta, EU očekivano]] |
| Vercel | hosting sajta i platforme, serverski logovi / hosting and server logs | [[PLACEHOLDER: region; SAD sa standardnim ugovornim klauzulama za prenos]] |
| Resend | slanje e-pošte (potvrde, uputstva, obavještenja) / email delivery | [[PLACEHOLDER: region]] |
| Monri | obrada kartičnih plaćanja i čuvanje tokenizovanih kartica / card processing and tokenised cards | Hrvatska (EU) |
| [[PLACEHOLDER: banka]] | prijem uplata, izvodi / receiving transfers, statements | Crna Gora |
| Plausible | analitika bez profila, samo uz saglasnost / privacy-preserving analytics, consent only | EU |
| Strava | izvor podataka o aktivnostima, samo ako povežete nalog / activity data source if you connect | SAD, po Strava uslovima |
| Anthropic | prevod tekstova vijesti koje piše tim; ne obrađuje podatke o vama / translation of staff-written news, no personal data of yours | SAD |
| [[PLACEHOLDER: računovođa]] | knjigovodstvo uplata i isplata / bookkeeping | Crna Gora |

Podatke dijelimo i: sa nadležnim organima kada zakon to nalaže (poreski organi, organi za sprječavanje pranja novca, policija, centar za socijalni rad u slučajevima iz Politike zaštite djece); sa osiguravačem i medicinskom službom u slučaju incidenta na događaju; sa partnerskim klubovima samo spisak učesnika potreban za bezbjednost događaja koji zajedno organizujemo, uz obavezu čuvanja.

Prenos van Crne Gore i Evropske unije vršimo samo obrađivačima sa odgovarajućim zaštitnim mjerama (standardne ugovorne klauzule ili odluka o adekvatnosti). Listu obrađivača ažuriramo na ovoj stranici prije uvođenja novog.

*Article 5. Who we share with.* Never sold, never shared with advertisers. Processors under processing agreements: Supabase, Vercel, Resend, Monri (Croatia), our bank, Plausible (consent only), Strava (only if you connect), Anthropic (news translation, no personal data), our accountant; regions as placeholders. Also authorities when the law requires it, the insurer and medical team after an incident, and partner clubs for the participant list a joint event needs. Transfers outside Montenegro and the EU only with safeguards; the list is updated here before any new processor is used.

### Član 6 — Javni registar i vaše ime

Svaku uplatu i isplatu objavljujemo u javnom registru; to je srž našeg rada. U registru se prikazuje datum, iznos, kampanja ili stranica učesnika, ogranak, način uplate, i ime za prikaz koje ste sami izabrali ili oznaka „Anonimno“. Vaša e-pošta, telefon i adresa se nikada ne objavljuju. Anonimnost možete izabrati pri uplati i naknadno zatražiti za bilo koju raniju uplatu.

Korisnici pomoći objavljuju se samo u uopštenom obliku (na primjer „porodica iz Tivta, troškovi liječenja“), nikada imenom, adresom ni dijagnozom, osim priče objavljene uz posebnu, opozivu saglasnost.

Na stranicama učesnika i timova prikazuju se ime, fotografija i priča koje ste sami objavili i ukupan prikupljeni iznos; na listi rezultata ime, startni broj, kategorija i vrijeme, osim ako ste izabrali da ime bude sakriveno.

*Article 6. Public ledger and your name.* Every payment in and out is published: date, amount, campaign, chapter, rail and your chosen display name or "Anonymous"; never email, phone or address; anonymity can be chosen at payment or requested later for any past gift. Beneficiaries appear only generalised, never by name, address or diagnosis, except a story with separate revocable consent. Fundraiser and team pages show what you published plus totals; results show name, number, category and time unless you hid your name.

### Član 7 — Fotografije i snimci

Na događajima fotografišemo i snimamo za galeriju, izvještaje, objave i materijale sponzora događaja. Pri prijavi birate da li pristajete da budete prepoznatljivi na objavljenim materijalima; izbor možete promijeniti u nalogu ili porukom. Bez saglasnosti vas ne objavljujemo prepoznatljivo, osim na grupnim i panoramskim snimcima na kojima ste jedan od mnogih. Svaku objavljenu fotografiju na kojoj se prepoznate uklanjamo u roku od tri radna dana od zahtjeva.

Za djecu važe stroža pravila iz Politike zaštite djece: objava samo uz saglasnost roditelja, bez imena i podataka po kojima se dijete može naći, opoziv u svakom trenutku.

*Article 7. Photos and video.* Taken at events for the gallery, reports, posts and event-sponsor material. You choose at registration whether you may be identifiable and can change it; without consent you are not published identifiably except in crowd shots; removal within three working days of a request. Children: stricter rules under the safeguarding policy.

### Član 8 — Koliko dugo čuvamo podatke

Čuvamo podatke samo dok su potrebni za svrhu ili dok to nalaže zakon:

- podaci o uplatama, isplatama i kotizacijama, uključujući potvrde i Izjave o učešću: [[PLACEHOLDER: broj, koliko nalažu računovodstveni i poreski propisi Crne Gore, potvrđuje advokat]] godina od kraja poslovne godine;
- nalog i stranica za prikupljanje: dok ih ne obrišete ili ne zatražite brisanje; nalog neaktivan [[PLACEHOLDER: broj]] godine brišemo uz prethodno obavještenje;
- prijave za pomoć i prilozi: [[PLACEHOLDER: broj]] godina od posljednje isplate ili od odbijanja, zatim brisanje, osim podataka koji su dio evidencije isplata;
- podaci o događaju (kontakt za hitne slučajeve, zdravstvene napomene, spiskovi): [[PLACEHOLDER: broj]] mjeseci nakon događaja; evidencija incidenata duže, po Politici zaštite djece;
- fotografije: dok važi saglasnost;
- Strava podaci: dok je nalog povezan; po prekidu veze brišemo tokene i podatke o aktivnostima odmah;
- serverski logovi: [[PLACEHOLDER: broj]] dana;
- poruke i prepiska: [[PLACEHOLDER: broj]] godine od posljednje poruke;
- registar interesa, evidencija zaštite djece, evidencija prijava povreda: po odgovarajućim politikama.

Tačan raspored je u Dijelu B. Kada rok istekne, podatke brišemo ili anonimizujemo; anonimizovane iznose u javnom registru zadržavamo trajno.

*Article 8. Retention.* Payment, entry-fee and waiver records for the statutory accounting period (placeholder); accounts and fundraiser pages until deleted, or after a set inactivity with notice; aid applications a set number of years after the last payment or refusal; event data a set number of months, incidents longer; photos while consent stands; Strava data while connected, deleted at once on disconnect; logs a set number of days; correspondence a set number of years; registers under their own policies. Details in Part B; expired data is deleted or anonymised, anonymised ledger amounts kept permanently.

### Član 9 — Vaša prava

Imate pravo da od nas tražite: pristup svojim podacima i kopiju; ispravku netačnih podataka; brisanje kada podaci više nisu potrebni ili ste povukli saglasnost, osim podataka koje moramo čuvati po zakonu; ograničenje obrade; prenos podataka koje ste nam dali u mašinski čitljivom obliku; prigovor na obradu zasnovanu na legitimnom interesu; povlačenje saglasnosti; da ne budete predmet odluka donesenih isključivo automatski, kojih kod nas nema.

Zahtjev šaljete na [[PLACEHOLDER: e-pošta za zaštitu podataka]] ili poštom na adresu iz člana 1. Odgovaramo bez odlaganja, a najkasnije u roku od [[PLACEHOLDER: broj, npr. 30]] dana; kod složenih zahtjeva rok možemo produžiti uz obavještenje. Zahtjev je besplatan. Da bismo zaštitili vaše podatke, možemo tražiti da potvrdite identitet, na primjer odgovorom sa adrese e-pošte koju ste koristili.

Ako smatrate da smo vaša prava povrijedili, možete se žaliti Agenciji za zaštitu ličnih podataka i slobodan pristup informacijama Crne Gore [[PLACEHOLDER: adresa i e-pošta Agencije]], a ako ste u Evropskoj uniji, i nadzornom organu u svojoj državi.

*Article 9. Your rights.* Access and copy, rectification, erasure (except what we must keep), restriction, portability, objection to legitimate-interest processing, withdrawal of consent, and no solely automated decisions (we make none). Requests by email or post, answered within a set number of days, free of charge, with identity verification where needed. Complaints to Montenegro's Agency for Personal Data Protection and Free Access to Information (contact placeholder) and, for EU residents, their own supervisory authority.

### Član 10 — Kolačići i analitika

Koristimo samo strogo neophodne kolačiće (sesija prijave, izbor o kolačićima, bezbjednosni kolačići procesora pri kartičnom plaćanju). Analitika (Plausible, bez profila i bez praćenja po drugim sajtovima) je isključena dok je ne uključite u obavještenju o kolačićima; odbijanje je jednako jednostavno kao prihvatanje. Nemamo i nećemo imati reklamne piksele ni praćenje preko drugih sajtova. Detalji su u Politici kolačića.

*Article 10. Cookies and analytics.* Strictly necessary cookies only; Plausible analytics off until you switch it on, rejecting as easy as accepting; no advertising pixels or cross-site tracking, ever. Details in the Cookie policy.

### Član 11 — Bezbjednost

Podatke štitimo tehničkim i organizacionim mjerama: šifrovanje u prenosu i na serverima obrađivača; pristup podacima po ulozi, pri čemu javni posjetioci vide samo javne prikaze, a osjetljiva polja (e-pošta donatora, privatne napomene o korisnicima, podaci procesora) nisu dostupna bez prijave; broj kartice nikada ne dolazi na naše servere; dnevnik pristupa administratora; provjera potpisa svake poruke procesora; obuka tima; ugovori o obradi sa svakim obrađivačem. Ako dođe do povrede podataka koja može ugroziti vaša prava, obavijestićemo vas i nadležni organ u zakonskom roku.

*Article 11. Security.* Encryption in transit and at rest, role-based access with public visitors seeing only public views and sensitive fields unreachable without sign-in, no card numbers on our servers, admin access logs, signature verification of processor messages, team training, processing agreements. Breaches that may affect your rights are notified to you and the authority within the statutory period.

### Član 12 — Djeca

Naša platforma nije namijenjena djeci mlađoj od 18 godina za samostalno otvaranje naloga ili doniranje. Podatke o maloljetnim učesnicima daje isključivo roditelj ili staratelj, po Uslovima učešća i Politici zaštite djece. Ako saznamo da smo bez znanja roditelja prikupili podatke djeteta, brišemo ih.

*Article 12. Children.* Under-18s do not open accounts or donate on their own; a parent or guardian gives minors' data under the Event Terms and the safeguarding policy; data collected from a child without a parent's knowledge is deleted.

### Član 13 — Izmjene

Ako politiku izmijenimo, novu verziju objavljujemo na ovoj stranici sa datumom i oznakom verzije. O suštinskim izmjenama obavještavamo registrovane korisnike i mjesečne donatore e-poštom najmanje 15 dana prije primjene.

*Article 13. Changes.* New versions are published here with date and version number; substantial changes are emailed to registered users and monthly donors at least 15 days ahead.

## DIO B: INTERNA EVIDENCIJA I POSTUPCI / PART B: INTERNAL RECORDS AND PROCEDURES

### Član 14 — Evidencija obrade

Udruženje vodi evidenciju aktivnosti obrade sa: svrhom, kategorijama lica i podataka, osnovom, primaocima, prenosom van zemlje, rokom čuvanja i mjerama zaštite, za svaku svrhu iz člana 3. Evidenciju vodi lice za zaštitu podataka i ažurira je prije uvođenja nove obrade ili obrađivača. Za svaku obradu zasnovanu na legitimnom interesu čuva se kratka procjena interesa (svrha, nužnost, uticaj na lice, mjere).

*Article 14. Processing register.* A register per purpose in Article 3 (purpose, data subjects and categories, basis, recipients, transfers, retention, safeguards), kept by the data-protection contact, updated before any new processing or processor, with a short legitimate-interest assessment for each such purpose.

### Član 15 — Obrađivači i ugovori

Sa svakim obrađivačem iz člana 5 udruženje ima ugovor o obradi (uslove obrađivača ili poseban ugovor) koji uređuje uputstva, povjerljivost, bezbjednost, podobrađivače, pomoć kod prava lica, brisanje po prestanku i prenos van EU sa standardnim ugovornim klauzulama gdje je potrebno. Lice za zaštitu podataka čuva kopiju ili vezu do svakog ugovora i datum provjere. Novi obrađivač uvodi se tek po unosu u evidenciju i ažuriranju člana 5.

*Article 15. Processors and agreements.* A processing agreement (the processor's terms or a bespoke contract) with every processor, covering instructions, confidentiality, security, sub-processors, assistance with rights, deletion on termination and transfer clauses; copies or links and review dates kept; no new processor before the register and Article 5 are updated.

### Član 16 — Raspored čuvanja

| Podaci / Data | Rok / Period | Nakon roka / Then |
|---|---|---|
| Uplate, isplate, kotizacije, potvrde, Izjave o učešću / Payments, fees, receipts, waivers | [[PLACEHOLDER: zakonski rok]] godina od kraja godine | anonimizacija u registru, brisanje ličnih podataka / anonymise ledger, delete personal data |
| Nalozi i stranice / Accounts and pages | do brisanja; [[PLACEHOLDER]] godine neaktivnosti | brisanje uz obavještenje 30 dana ranije / delete with 30 days' notice |
| Prijave za pomoć / Aid applications | [[PLACEHOLDER]] godina od isplate ili odbijanja | brisanje priloga, zadržavanje oznake odluke / delete attachments, keep decision reference |
| Podaci o događaju: hitni kontakt, zdravstvene napomene, spiskovi / Event data | [[PLACEHOLDER]] mjeseci nakon događaja | brisanje / delete |
| Evidencija incidenata / Incident records | po Politici zaštite djece / per safeguarding policy | |
| Fotografije / Photos | dok važi saglasnost / while consent stands | uklanjanje u roku od 3 radna dana / remove within 3 working days |
| Strava tokeni i aktivnosti / Strava tokens and activities | dok je nalog povezan / while connected | odmah po prekidu / at once on disconnect |
| Serverski logovi / Server logs | [[PLACEHOLDER]] dana | automatsko brisanje / automatic |
| Prepiska / Correspondence | [[PLACEHOLDER]] godine od posljednje poruke | brisanje / delete |
| Registar interesa, evidencija prijava povreda / Registers of interests and breach reports | po tim politikama / per those policies | |
| Volonteri: izjave i uvjerenja / Volunteer declarations and certificates | dok traje angažman + [[PLACEHOLDER]] godina | brisanje / delete |
| Poslovni kontakti sponzora i dobavljača / Business contacts | trajanje saradnje + [[PLACEHOLDER]] godina | brisanje / delete |

*Article 16. Retention schedule.* One row per data category with the period and what happens after it; statutory periods are placeholders for the lawyer and accountant.

### Član 17 — Postupak po zahtjevu lica

1. Zahtjev stiže na adresu iz člana 9 ili bilo kom članu tima, koji ga istog dana prosljeđuje licu za zaštitu podataka. Datum prijema se bilježi.
2. Lice za zaštitu podataka potvrđuje prijem u roku od tri radna dana i, kada je potrebno, traži potvrdu identiteta na najmanje nametljiv način.
3. Podaci se pronalaze u svim sistemima (platforma, e-pošta, skladište fajlova, evidencije obrađivača) po e-pošti, imenu i pozivu na broj.
4. Odgovor se šalje u roku iz člana 9, u razumljivom obliku; kod pristupa i prenosa kao izvoz u čitljivom formatu; kod brisanja uz navođenje šta je zadržano po zakonu i zašto (na primjer, iznos u registru ostaje anonimizovan, potvrde o uplatama ostaju do isteka računovodstvenog roka).
5. Zahtjev za anonimnost ranije uplate izvršava se odmah izmjenom prikaza, bez izmjene knjiženja.
6. Svaki zahtjev i ishod bilježe se u evidenciju zahtjeva (datum, vrsta, rok, ishod), bez kopije podataka.

*Article 17. Rights-request procedure.* Same-day forwarding to the data-protection contact, acknowledgement within three working days, identity check where needed, search across all systems, reply within the Article 9 period in plain form with exports for access and portability, statement of what is retained by law and why, immediate anonymisation of past gifts on request, and a log of requests and outcomes.

### Član 18 — Postupak kod povrede podataka

1. Ko god primijeti ili posumnja na povredu (gubitak uređaja, pogrešno poslata poruka, neovlašćeni pristup, obavještenje obrađivača) odmah obavještava lice za zaštitu podataka i Izvršnog direktora.
2. U roku od 24 sata: zaustaviti povredu (opoziv pristupa, promjena lozinki, obustava servisa), utvrditi koji podaci i koliko lica su pogođeni, i zabilježiti činjenice.
3. U roku od 72 sata od saznanja: odluka lica za zaštitu podataka i Izvršnog direktora o obavještavanju Agencije za zaštitu ličnih podataka i, za lica iz EU, nadležnog organa; obavještavanje kada povreda može ugroziti prava lica. Obavještenje lica bez odlaganja kada je rizik visok, sa opisom, posljedicama, mjerama i kontaktom.
4. Sve povrede, i one koje nisu prijavljene, unose se u evidenciju povreda sa obrazloženjem. Upravni odbor se obavještava o svakoj prijavljenoj povredi na prvoj narednoj sjednici.

*Article 18. Breach procedure.* Immediate internal report; within 24 hours contain, scope and record; within 72 hours decide on notifying the Agency and any EU authority where rights may be at risk, and notify affected people without delay where the risk is high; log every breach including unreported ones with reasons; inform the Board at its next meeting.

### Član 19 — Pristup i mjere zaštite

Pristup podacima daje se po ulozi i najmanjem potrebnom obimu: javni posjetilac samo javni prikazi; član svoje podatke; osoblje po ulozi; administrator sve, uz dnevnik. Pristup se ukida istog dana kada prestane funkcija. Osjetljiva polja (e-pošta donatora, privatne napomene o korisnicima, podaci procesora) su nedostupna bez prijave i zaštićena pravilima na nivou baze, što se provjerava automatskim testovima.

Lozinke administratora su jedinstvene i sa dvostrukom provjerom gdje je dostupna; tajni ključevi se čuvaju samo na serveru; izvoz podataka (na primjer spiskovi učesnika) radi se u najmanjem obimu, čuva se kratko i briše po upotrebi; papirni spiskovi se uništavaju u roku od sedam dana. Tim prolazi kratko upoznavanje sa ovom politikom pri stupanju na funkciju i jednom godišnje.

*Article 19. Access and safeguards.* Role-based least-privilege access with admin logging, revoked the day a function ends; sensitive fields unreachable without sign-in and protected at database level, verified by automated tests; unique admin passwords with two-factor where available; secrets server-side only; minimal, short-lived exports; paper lists destroyed within seven days; induction and yearly refresher.

### Član 20 — Odgovornost i preispitivanje

Za primjenu ove politike odgovara Izvršni direktor; lice za zaštitu podataka vodi evidencije i postupke i podnosi Upravnom odboru godišnji izvještaj (zahtjevi lica, povrede, novi obrađivači, provjere). Politika se preispituje najmanje jednom godišnje i pri svakoj promjeni obrade ili propisa. Do izbora Upravnog odbora njegova ovlašćenja vrši Skupština.

*Article 20. Accountability and review.* The Director is responsible; the data-protection contact keeps the records and procedures and reports yearly to the Board (requests, breaches, new processors, checks); yearly review and on every change of processing or law; the Assembly holds the Board's powers until the Board exists.

## DIO C: PROVJERE, PARAMETRI I NAPOMENE ZA PLATFORMU / PART C: CHECKS, PARAMETERS AND PLATFORM NOTES

**CHECK with the lawyer:** the statutory retention period for accounting records (Articles 8 and 16); the response deadline for rights requests under Montenegrin law versus the GDPR's one month (Article 9); whether the association must appoint a formal data protection officer or register processing with the Agency, and the Agency's current contact details; the transfer mechanism for each non-EU processor (Vercel, Strava, Anthropic) and whether standard contractual clauses are in their terms; the legal basis wording for the public ledger (legitimate interest with the anonymity choice) and for volunteer criminal-record certificates under the safeguarding policy; the explicit-consent wording for aid applications (Article 4). **CHECK with each processor:** hosting region and data-processing terms (Supabase project region, Vercel, Resend), Monri's processing addendum, Plausible's terms. **CHECK with the accountant:** which payment records must be kept and for how long.

Suggested parameters, each a single line to change:

| Parameter | Suggested | Where |
|---|---|---|
| Rights-request response / Odgovor na zahtjev | 30 days, extendable once with notice | Art. 9, 17 |
| Account inactivity before deletion / Neaktivnost naloga | 3 years | Art. 8, 16 |
| Aid application retention / Prijave za pomoć | 5 years after last payment or refusal | Art. 8, 16 |
| Event data retention / Podaci o događaju | 6 months | Art. 8, 16 |
| Server log retention / Logovi | 30 days | Art. 8, 16 |
| Correspondence retention / Prepiska | 2 years | Art. 8, 16 |
| Volunteer records after engagement / Volonteri | 2 years | Art. 16 |
| Notice before substantial changes / Obavještenje o izmjenama | 15 days | Art. 13 |

**Platform notes.** Already in place or specified: RLS on every public view with tests proving anonymous clients cannot read donor email, private beneficiary notes or processor fields; anonymity choice at donation; waiver version and timestamp; Strava token deletion on disconnect; analytics gated on consent; no advertising pixels. Needed by this policy: a way to switch a past gift to anonymous without touching the ledger row (display flag on the public view); an account self-delete or delete-request path that anonymises ledger rows and removes profile data; automated retention jobs for event data, logs and inactive accounts; an export of a person's data across tables for access and portability requests; a rights-request log and a breach log (documents in storage are enough at first); update of `content/legal/privacy.ts` from Part A after review, with processor regions filled from `docs/PLACEHOLDERS.md`.
