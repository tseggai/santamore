#!/usr/bin/env node
/**
 * Builds content/legal-pack/pack.json for the console page /admin/registracija: the five filing
 * documents as bilingual templates whose blanks are editable fields (pre-filled from
 * completion-guide.md, unknown facts as bracketed placeholders), and the drafts as HTML.
 *   node scripts/legal/build-pack.js
 * Sources: docs/legal/registration/originals (Montenegrin), docs/legal/registration/*.en.md (English),
 * docs/legal/registration/statute-additions.md and docs/legal/governance/*.md (drafts).
 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..'), R = path.join(ROOT, 'docs/legal/registration'), G = path.join(ROOT, 'docs/legal/governance');
const read = p => fs.readFileSync(p, 'utf8');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const orig = n => JSON.parse(execFileSync('python3', [path.join(__dirname, 'extract_docx_paragraphs.py'), path.join(R, 'originals', fs.readdirSync(path.join(R, 'originals')).find(f => f.startsWith(n + '-')))], { encoding: 'utf8' }));

// ---------- markdown helpers ----------
function parseBlocks(md) {
  const lines = md.split('\n'); const blocks = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^#{1,3} /.test(line)) { blocks.push({ type: 'h' + line.match(/^(#+) /)[1].length, text: line.replace(/^#+ /, '') }); i++; continue; }
    if (line.startsWith('|')) { const rows = []; while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; } blocks.push({ type: 'table', rows: rows.filter(r => !/^\|\s*-+/.test(r)).map(r => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())) }); continue; }
    if (/^- /.test(line)) { const items = []; while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; } blocks.push({ type: 'ul', items }); continue; }
    if (/^\d+\. /.test(line)) { const items = []; while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; } blocks.push({ type: 'ol', items }); continue; }
    const buf = []; while (i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. )/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    blocks.push({ type: 'p', text: buf.join(' ') });
  }
  return blocks;
}
const strip = t => t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
const inline = t => esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
function lang(text) { const en = (text.match(/\b(the|and|of|to|with|for|is|are|or|by|not|that|this|from)\b/gi) || []).length; const me = (text.match(/[čćšžđČĆŠŽĐ]|\b(je|se|su|na|za|od|ili|koji|koje|koja|kada|ako|može|udruženja|udruženje|sa|do|po|u|i)\b/g) || []).length; return me > en ? 'me' : 'en'; }
function blockHtml(b, cls) {
  const c = cls ? ` class="${cls}"` : '';
  if (b.type === 'p') return `<p${c}>${inline(b.text)}</p>`;
  if (b.type === 'ul') return `<ul${c}>${b.items.map(t => `<li>${inline(t)}</li>`).join('')}</ul>`;
  if (b.type === 'ol') return `<ol${c}>${b.items.map(t => `<li>${inline(t)}</li>`).join('')}</ol>`;
  if (b.type === 'table') return `<div class="tablewrap"><table>${b.rows.map((r, i) => `<tr>${r.map(x => i ? `<td>${inline(x)}</td>` : `<th>${inline(x)}</th>`).join('')}</tr>`).join('')}</table></div>`;
  return '';
}
function draftHtml(md) {
  const out = []; let sawH2 = false;
  for (const b of parseBlocks(md)) {
    if (b.type === 'h1') continue;
    if (b.type === 'h2') { sawH2 = true; out.push(`<h2>${inline(b.text)}</h2>`); continue; }
    if (b.type === 'h3') { out.push(`<h3>${inline(b.text)}</h3>`); continue; }
    if (b.type === 'table') { out.push(blockHtml(b)); continue; }
    const text = b.items ? b.items.join(' ') : b.text;
    out.push(blockHtml(b, (!sawH2 || lang(text) === 'en') ? 'en' : ''));
  }
  return out.join('\n');
}
// English source per anchored segment, as plain paragraph strings (translator's notes dropped)
function enSegments(md, isAnchor) {
  const segs = [[]];
  for (const b of parseBlocks(md)) { if (b.type === 'h1') continue; if (isAnchor(b) && segs[segs.length - 1].length) segs.push([]); segs[segs.length - 1].push(b); }
  return segs.map(s => s.filter(b => !/^h/.test(b.type)).flatMap(b => b.items ? b.items.map(strip) : [strip(b.text)]).filter(t => !/^\[Translator/.test(t) && !/^English translation of/.test(t)));
}

// ---------- fields: defaults in both languages ----------
// neutral: the same value in both languages (names, addresses, numbers, dates): typed once, copied to the other
// language, never translated. The placeholder alone differs per language. meOnly: exists in the Montenegrin text only.
const goalsME = `1. pružanje humanitarne, materijalne i druge podrške pojedincima, porodicama, djeci, malim preduzećima i organizacijama u stanju socijalne potrebe, prvenstveno u Tivtu i Boki Kotorskoj, a zatim i u ostalim opštinama Crne Gore;
2. prikupljanje dobrovoljnih priloga i donacija putem javnih sportskih, rekreativnih, humanitarnih i kulturnih događaja i putem internet platforme za prikupljanje sredstava, uz potpunu javnost prihoda i rashoda;
3. promocija sporta, rekreacije, zdravih stilova života i volonterizma;
4. podrška djeci i mladima, kulturi i zaštiti životne sredine, posebno mora i obale Boke Kotorske;
5. podsticanje solidarnosti, društvene odgovornosti i razvoja lokalne zajednice;
6. jačanje povjerenja u dobrotvorni rad kroz javno objavljivanje svakog prihoda i rashoda udruženja.`;
const goalsEN = `1. providing humanitarian, material and other support to individuals, families, children, small businesses and organisations in social need, first in Tivat and the Bay of Kotor and then in other municipalities of Montenegro;
2. raising voluntary contributions and donations through public sporting, recreational, humanitarian and cultural events and through an online fundraising platform, with full public disclosure of income and expenditure;
3. promoting sport, recreation, healthy lifestyles and volunteering;
4. supporting children and young people, culture and environmental protection, especially the sea and the coast of the Bay of Kotor;
5. encouraging solidarity, social responsibility and local community development;
6. strengthening trust in charitable work by publishing every item of the association's income and expenditure.`;
const activitiesME = `1. organizovanje humanitarnih trka, plivanja, regata i drugih sportskih, rekreativnih, kulturnih i javnih manifestacija;
2. prikupljanje, evidentiranje i raspodjela donacija i drugih dobrovoljnih priloga korisnicima po javno objavljenim kriterijumima;
3. razvoj i vođenje internet platforme za prikupljanje sredstava i javnog pregleda prihoda i rashoda;
4. saradnja sa sportskim klubovima, školama, privrednim društvima, organima lokalne samouprave, drugim nevladinim organizacijama i institucijama u zemlji i inostranstvu;
5. organizovanje volonterskih, edukativnih i omladinskih programa;
6. osnivanje i koordinacija lokalnih ogranaka udruženja u drugim opštinama;
7. izdavačka i informativna djelatnost u vezi sa ciljevima udruženja;
8. druge aktivnosti u skladu sa zakonom koje doprinose ostvarivanju ciljeva udruženja.`;
const activitiesEN = `1. organising charity runs, swims, regattas and other sporting, recreational, cultural and public events;
2. collecting, recording and distributing donations and other voluntary contributions to beneficiaries under published criteria;
3. developing and running an online fundraising platform and a public ledger of income and expenditure;
4. cooperating with sports clubs, schools, businesses, local government bodies, other NGOs and institutions at home and abroad;
5. organising volunteer, educational and youth programmes;
6. founding and coordinating local chapters of the association in other municipalities;
7. publishing and information activities related to the association's goals;
8. other lawful activities that contribute to the association's goals.`;
const econME = 'prodaja promotivnih proizvoda (majice, kostimi, suveniri) u vezi sa ciljevima udruženja; naplata kotizacija za učešće na događajima koje organizuje udruženje; pružanje usluga organizacije događaja trećim licima';
const econEN = "sale of promotional items (shirts, costumes, souvenirs) related to the association's goals; charging entry fees for participation in events the association organises; providing event-organisation services to third parties";
const N = (me, en, opts) => Object.assign({ label: { me, en }, value: { me: en === undefined ? me : me, en: en === undefined ? me : me }, neutral: true }, opts || {});
const LINK = (labelMe, labelEn) => ({ label: { me: labelMe, en: labelEn }, value: { me: '', en: '' }, neutral: true, isLink: true });
const NEUTRAL = (labelMe, labelEn, value, opts) => Object.assign({ label: { me: labelMe, en: labelEn }, value: { me: value, en: value }, neutral: true }, opts || {});
const T = (labelMe, labelEn, me, en, opts) => Object.assign({ label: { me: labelMe, en: labelEn }, value: { me, en } }, opts || {});
const F = {
  org: T('Naziv udruženja', 'Name of the association', 'Nevladino udruženje „Santamore“', 'Non-governmental association "Santamore"'),
  short: T('Skraćeni naziv', 'Short name', 'NVU „Santamore“', 'NGA "Santamore"'),
  seat: NEUTRAL('Sjedište', 'Seat', 'Tivat'),
  addr: T('Adresa', 'Address', '[ulica i broj], Tivat', '[street and number], Tivat', { neutral: true }),
  date: T('Datum osnivačke skupštine', 'Date of the founding assembly', '[datum sjednice]', '[date of the meeting]', { neutral: true }),
  f1_name: T('Osnivač 1, ime i prezime', 'Founder 1, full name', '[Ime i prezime]', '[Full name]', { neutral: true }), f1_jmb: NEUTRAL('Osnivač 1, JMB', 'Founder 1, JMB (13-digit personal ID number)', '[JMB]'), f1_addr: T('Osnivač 1, adresa', 'Founder 1, address', '[adresa prebivališta]', '[home address]', { neutral: true }),
  f2_name: T('Osnivač 2, ime i prezime', 'Founder 2, full name', '[Ime i prezime]', '[Full name]', { neutral: true }), f2_jmb: NEUTRAL('Osnivač 2, JMB', 'Founder 2, JMB (13-digit personal ID number)', '[JMB]'), f2_addr: T('Osnivač 2, adresa', 'Founder 2, address', '[adresa prebivališta]', '[home address]', { neutral: true }),
  f3_name: T('Osnivač 3, ime i prezime', 'Founder 3, full name', '[Ime i prezime]', '[Full name]', { neutral: true }), f3_jmb: NEUTRAL('Osnivač 3, JMB', 'Founder 3, JMB (13-digit personal ID number)', '[JMB]'), f3_addr: T('Osnivač 3, adresa', 'Founder 3, address', '[adresa prebivališta]', '[home address]', { neutral: true }),
  // Founders 4 and 5 are optional: three is the legal minimum. Left empty, their rows do not print.
  f4_name: T('Osnivač 4, ime i prezime (opciono)', 'Founder 4, full name (optional)', '', '', { optional: true, neutral: true }), f4_jmb: NEUTRAL('Osnivač 4, JMB', 'Founder 4, JMB (13-digit personal ID number)', '', { optional: true }), f4_addr: T('Osnivač 4, adresa', 'Founder 4, address', '', '', { optional: true, neutral: true }),
  f5_name: T('Osnivač 5, ime i prezime (opciono)', 'Founder 5, full name (optional)', '', '', { optional: true, neutral: true }), f5_jmb: NEUTRAL('Osnivač 5, JMB', 'Founder 5, JMB (13-digit personal ID number)', '', { optional: true }), f5_addr: T('Osnivač 5, adresa', 'Founder 5, address', '', '', { optional: true, neutral: true }),
  goals: T('Ciljevi', 'Goals', goalsME, goalsEN, { block: true }), activities: T('Djelatnosti', 'Activities', activitiesME, activitiesEN, { block: true }),
  rep_title: T('Funkcija ovlašćenog lica', 'Title of the authorised person', 'Izvršni direktor', 'Executive Director'),
  rep_name: T('Ovlašćeno lice, ime i prezime', 'Authorised person, full name', '[Ime i prezime]', '[Full name]', { neutral: true, link: 'rep_of', part: 'name' }), rep_jmb: NEUTRAL('Ovlašćeno lice, JMB', 'Authorised person, JMB (13-digit personal ID number)', '[JMB]', { link: 'rep_of', part: 'jmb' }), rep_addr: T('Ovlašćeno lice, adresa', 'Authorised person, address', '[adresa prebivališta]', '[home address]', { neutral: true, link: 'rep_of', part: 'addr' }),
  chair: T('Predsjedavajući Osnivačke skupštine', 'Chair of the Founding Assembly', '[Ime i prezime]', '[Full name]', { neutral: true, link: 'chair_of', part: 'name' }), deputy: T('Zamjenik predsjednika Skupštine', 'Deputy President of the Assembly', '[Ime i prezime]', '[Full name]', { neutral: true, link: 'deputy_of', part: 'name' }), recorder: T('Zapisničar', 'Recorder', '[Ime i prezime]', '[Full name]', { neutral: true, link: 'recorder_of', part: 'name' }),
  // Which founder a person blank follows ("f1" to "f5", or empty for someone typed by hand). Never rendered.
  rep_of: LINK('Ovlašćeno lice je osnivač', 'Authorised person is founder'), chair_of: LINK('Predsjedavajući je osnivač', 'Chair is founder'), deputy_of: LINK('Zamjenik je osnivač', 'Deputy is founder'), recorder_of: LINK('Zapisničar je osnivač', 'Recorder is founder'),
  phone: T('Telefon predsjedavajućeg', 'Chair\'s phone', '[telefon]', '[phone]', { neutral: true }), email: T('E-pošta predsjedavajućeg', 'Chair\'s email', '[e-pošta]', '[email]', { neutral: true }),
  date_app: T('Datum prijave', 'Filing date', '[datum predaje]', '[filing date]', { neutral: true }),
  start: NEUTRAL('Vrijeme početka', 'Start time', '[18:00]'), end: NEUTRAL('Vrijeme završetka', 'End time', '[19:30]'), venue: T('Adresa mjesta održavanja', 'Venue address', '[adresa mjesta održavanja], Tivat', '[venue address], Tivat', { neutral: true }),
  salut: T('g./gđa', 'Mr/Ms', 'g.', 'Mr'), v1: T('izložio/la', '', 'izložio', '', { meOnly: true }), v2: T('upoznao/la', '', 'upoznao', '', { meOnly: true }),
  term: T('Mandat', 'Term', '4 (četiri)', '4 (four)'), vote: T('Rezultat glasanja', 'Vote', 'jednoglasno', 'unanimously'),
  seal_text: T('Tekst po obodu pečata', 'Text on the rim of the seal', 'Nevladino udruženje „Santamore“, Tivat', 'Non-governmental association "Santamore", Tivat'), seal_symbol: T('Znak u sredini pečata', 'Symbol in the centre of the seal', '[opis znaka Santamore]', '[description of the Santamore mark]'),
  term_pres: T('Mandat predsjednika Skupštine', 'Term of the President of the Assembly', '4 (četiri)', '4 (four)'), term_assembly: T('Mandat Skupštine', 'Term of the Assembly', '4 (četiri)', '4 (four)'), term_rep: T('Mandat ovlašćenog lica', 'Term of the authorised person', '4 (četiri)', '4 (four)'),
  econ: T('Privredne djelatnosti', 'Economic activities', econME, econEN, { block: true }),
};
void N;

// ---------- form 02 ----------
const en02 = enSegments(read(path.join(R, '02-founding-decision.en.md')), b => b.type === 'h3' && /^Article/.test(b.text));
const P = (me, en, extra) => Object.assign({ type: 'p', me, en }, extra || {});
const H3 = (n) => ({ type: 'h3', me: `Član ${n}`, en: `Article ${n}` });
const SIG = (items) => ({ type: 'sigrow', items });
const form02 = { id: '02', title: { me: 'Odluka o osnivanju', en: 'Decision on founding' }, subtitle: { me: 'Osnivački akt po članu 11 Zakona o NVO', en: 'Founding act under Article 11 of the Law on NGOs' }, file: 'santamore-02-odluka-o-osnivanju',
  note: { me: 'Popunjeno prema uputstvu za popunjavanje. <b>Podaci u uglastim zagradama nisu poznati</b> i unose ih osnivači. Potpisi ostaju prazni za štampu. Ciljevi i djelatnosti moraju biti identični čl. 6 i 7 Statuta; ovdje su ista polja.', en: 'Pre-filled from the completion guide. <b>Values in square brackets are not known yet</b> and are entered by the founders. Signatures stay blank for printing. Goals and activities must match Articles 6 and 7 of the Statute; the same fields are used.' },
  blocks: [
    P('Na osnovu člana 11 Zakona o nevladinim organizacijama (Sl. list Crne Gore br. 39/11 i 37/17), Osnivačka Skupština {{org}} donosi', 'Pursuant to Article 11 of the Law on Non-Governmental Organisations (Official Gazette of Montenegro nos. 39/11 and 37/17), the Founding Assembly of {{org}} adopts the following'),
    { type: 'h', me: 'ODLUKU O OSNIVANJU', en: 'DECISION ON FOUNDING' },
    H3(1), P('Osnivači su:', 'The founders are:'),
    { type: 'list', me: ['ime i prezime {{f1_name}}; JMB {{f1_jmb}}; adresa {{f1_addr}}; potpis {{sig}}', 'ime i prezime {{f2_name}}; JMB {{f2_jmb}}; adresa {{f2_addr}}; potpis {{sig}}', 'ime i prezime {{f3_name}}; JMB {{f3_jmb}}; adresa {{f3_addr}}; potpis {{sig}}', 'ime i prezime {{f4_name}}; JMB {{f4_jmb}}; adresa {{f4_addr}}; potpis {{sig}}', 'ime i prezime {{f5_name}}; JMB {{f5_jmb}}; adresa {{f5_addr}}; potpis {{sig}}'], en: ['full name {{f1_name}}; JMB {{f1_jmb}}; address {{f1_addr}}; signature {{sig}}', 'full name {{f2_name}}; JMB {{f2_jmb}}; address {{f2_addr}}; signature {{sig}}', 'full name {{f3_name}}; JMB {{f3_jmb}}; address {{f3_addr}}; signature {{sig}}', 'full name {{f4_name}}; JMB {{f4_jmb}}; address {{f4_addr}}; signature {{sig}}', 'full name {{f5_name}}; JMB {{f5_jmb}}; address {{f5_addr}}; signature {{sig}}'] },
    H3(2), P('Naziv udruženja je: {{org}}', 'The name of the association is: {{org}}'),
    H3(3), P('Adresa udruženja je: {{addr}}', 'The address of the association is: {{addr}}'),
    H3(4), P('Sjedište udruženja je u {{seat}}.', 'The seat of the association is in {{seat}}.'),
    H3(5), P('Ciljevi udruženja su: {{goals}}', 'The goals of the association are: {{goals}}'),
    H3(6), P('Djelatnosti udruženja su: {{activities}}', 'The activities of the association are: {{activities}}'),
    H3(7), P('Lice ovlašćeno za zastupanje i predstavljanje udruženja je {{rep_title}}, {{rep_name}}, JMB {{rep_jmb}}, {{rep_addr}}, potpis {{sig}}', 'The person authorised to represent the association and act on its behalf is the {{rep_title}}, {{rep_name}}, JMB {{rep_jmb}}, {{rep_addr}}, signature {{sig}}'),
    SIG([{ me: 'U Tivtu, dana {{date}}.', en: 'In Tivat, on {{date}}.', lbl: { me: 'mjesto i datum', en: 'place and date' } }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}} s.r.', en: 'Chair of the Founding Assembly {{chair}} {{sig}}', lbl: { me: 'potpis', en: 'signature' } }]),
  ] };
void en02;

// ---------- form 03 ----------
const form03 = { id: '03', title: { me: 'Prijava za upis u Registar NVO', en: 'Application for entry in the NGO Register' }, subtitle: { me: 'Ministarstvu regionalno-investicionog razvoja i saradnje sa NVO', en: 'To the Ministry of Regional-Investment Development and Cooperation with NGOs' }, file: 'santamore-03-prijava-za-upis',
  note: { me: 'Dodat je četvrti prilog (fotokopije ličnih karata osnivača), koji instrukcije traže. Pečata još nema; nema mjesta za njega.', en: 'A fourth enclosure (photocopies of the founders\' identity cards) was added, as the instructions require. There is no seal yet, so no space for one.' },
  blocks: [
    P('Vlada Crne Gore<br>Ministarstvo regionalno-investicionog razvoja i saradnje sa nevladinim organizacijama', 'Government of Montenegro<br>Ministry of Regional-Investment Development and Cooperation with Non-Governmental Organisations'),
    P('<b>Predmet:</b> Prijava za upis u Registar nevladinih organizacija', '<b>Subject:</b> Application for entry in the Register of Non-Governmental Organisations'),
    P('<b>Podnosilac:</b><br>{{org}} u osnivanju<br>{{addr}}<br>zastupano po predsjedavajućem Osnivačke skupštine: {{chair}}<br>tel. {{phone}}<br>e-pošta: {{email}}', '<b>Applicant:</b><br>{{org}} in formation<br>{{addr}}<br>represented by the Chair of the Founding Assembly: {{chair}}<br>tel. {{phone}}<br>email: {{email}}'),
    { type: 'h2', me: 'Obrazloženje', en: 'Explanation' },
    P('Dana {{date}} godine sastala se Osnivačka Skupština {{org}} i donijela sljedeće odluke:', 'On {{date}}, the Founding Assembly of {{org}} met and adopted the following decisions:'),
    { type: 'list', me: ['da osnuje udruženje naziva: {{org}}', 'da usvoji Statut', 'da podnese prijavu za upis u Registar nevladinih organizacija.'], en: ['to found an association named: {{org}}', 'to adopt the Statute', 'to submit an application for entry in the Register of Non-Governmental Organisations.'] },
    P('U skladu sa gore navedenim odlukama molimo vas da izvršite upis nevladine organizacije „{{org}}“ u Registar nevladinih organizacija koji se vodi pri vašem Ministarstvu.', 'In accordance with the decisions listed above, we ask you to enter the non-governmental organisation "{{org}}" in the Register of Non-Governmental Organisations kept at your Ministry.'),
    P('U prilogu dostavljamo:', 'Enclosed we submit:'),
    { type: 'list', me: ['Odluku o osnivanju', 'Zapisnik sa osnivačke skupštine', 'Statut', 'Fotokopije ličnih karata osnivača'], en: ['the Decision on founding', 'the Minutes of the founding assembly', 'the Statute', 'photocopies of the founders\' identity cards'] },
    SIG([{ me: 'U Tivtu, dana {{date_app}}.', en: 'In Tivat, on {{date_app}}.', lbl: { me: 'mjesto i datum predaje', en: 'place and filing date' } }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}} s.r.', en: 'Chair of the Founding Assembly {{chair}} {{sig}}', lbl: { me: 'potpis', en: 'signature' } }]),
  ] };

// ---------- form 05 ----------
const form05 = { id: '05', title: { me: 'Zapisnik sa osnivačke skupštine', en: 'Minutes of the founding assembly' }, subtitle: { me: 'Potpisuju zapisničar i predsjedavajući (čl. 25 Statuta)', en: 'Signed by the recorder and the chair (Statute Art. 25)' }, file: 'santamore-05-zapisnik-osnivacke-skupstine',
  note: { me: 'Obrazac je govorio „u Podgorici“ i „u 15 časova“; zamijenjeno sa Tivtom i poljima za vrijeme. Dodati su prisutni, zapisničar, rezultat glasanja i potpis predsjedavajućeg, koje traže čl. 23 i 25 Statuta.', en: 'The template said "in Podgorica" and "at 15 o\'clock"; replaced with Tivat and time fields. Attendees, the recorder, the vote result and the chair\'s signature were added, as Statute Articles 23 and 25 require.' },
  blocks: [
    { type: 'h', me: 'ZAPISNIK SA OSNIVAČKE SKUPŠTINE NEVLADINOG UDRUŽENJA „SANTAMORE“', en: 'MINUTES OF THE FOUNDING ASSEMBLY OF THE NON-GOVERNMENTAL ASSOCIATION "SANTAMORE"' },
    P('Osnivački odbor NEVLADINOG UDRUŽENJA „Santamore“ u sastavu:', 'The founding committee of the NON-GOVERNMENTAL ASSOCIATION "Santamore", composed of:'),
    { type: 'list', me: ['{{f1_name}}', '{{f2_name}}', '{{f3_name}}', '{{f4_name}}', '{{f5_name}}'], en: ['{{f1_name}}', '{{f2_name}}', '{{f3_name}}', '{{f4_name}}', '{{f5_name}}'] },
    P('sazvao je Osnivačku skupštinu NEVLADINOG UDRUŽENJA „Santamore“ na dan {{date}} godine u Tivtu, sa početkom u {{start}} časova. Skupština je održana u Tivtu, u prostorijama na adresi {{venue}}. Skupštini su prisustvovali svi osnivači navedeni u Odluci o osnivanju i u gornjem spisku. Zapisničar: {{recorder}}.', 'convened the Founding Assembly of the NON-GOVERNMENTAL ASSOCIATION "Santamore" on {{date}} in Tivat, starting at {{start}}. The Assembly was held in Tivat, on the premises at {{venue}}. All the founders listed in the Decision on founding and in the list above attended. Recorder: {{recorder}}.'),
    P('Skupština je usvojila sledeći dnevni red:', 'The Assembly adopted the following agenda:'),
    { type: 'list', me: ['Zadaci i ciljevi NEVLADINOG UDRUŽENJA „Santamore“', 'Nacrti Odluke o osnivanju i Statuta NEVLADINOG UDRUŽENJA „Santamore“', 'Diskusija o Statutu', 'Usvajanje odluka'], en: ['Tasks and goals of the NON-GOVERNMENTAL ASSOCIATION "Santamore"', 'Drafts of the Decision on founding and of the Statute of the NON-GOVERNMENTAL ASSOCIATION "Santamore"', 'Discussion of the Statute', 'Adoption of decisions'] },
    P('Predsjednik osnivačke skupštine {{salut}} {{chair}} {{v1}} je ciljeve i zadatke udruženja, potom {{v2}} prisutne sa osnovnim elementima budućeg Statuta udruženja, koji je u kraćoj raspravi djelimično izmijenjen i dopunjen.', 'The chair of the founding assembly, {{salut}} {{chair}}, presented the goals and tasks of the association, then acquainted those present with the basic elements of the future Statute of the association, which was partially amended and supplemented in a short discussion.'),
    P('Zatim su osnivači donijeli Odluku o osnivanju NEVLADINOG UDRUŽENJA „Santamore“ i usvojili Statut. Sve odluke donijete su {{vote}}.', 'The founders then adopted the Decision on founding the NON-GOVERNMENTAL ASSOCIATION "Santamore" and adopted the Statute. All decisions were adopted {{vote}}.'),
    P('Skupština je potom izabrala predsjednika skupštine, zamjenika predsjednika skupštine i lice ovlašćeno za zastupanje, i to:', 'The Assembly then elected the president of the assembly, the deputy president of the assembly and the person authorised for representation, namely:'),
    { type: 'list', me: ['Predsjednik Skupštine: {{chair}}, na mandat od {{term}} godine', 'Zamjenik predsjednika Skupštine: {{deputy}}, na mandat od {{term}} godine', 'Lice ovlašćeno za zastupanje, {{rep_title}}: {{rep_name}}, na mandat od {{term}} godine'], en: ['President of the Assembly: {{chair}}, for a term of {{term}} years', 'Deputy President of the Assembly: {{deputy}}, for a term of {{term}} years', 'Person authorised for representation, {{rep_title}}: {{rep_name}}, for a term of {{term}} years'] },
    P('Za sjedište udruženja određene su prostorije u: {{addr}}.', 'The premises at {{addr}} were designated as the seat of the association.'),
    P('Skupština je zaključena u {{end}} časova.', 'The Assembly was closed at {{end}}.'),
    P('U Tivtu, {{date}} godine.', 'In Tivat, {{date}}.'),
    SIG([{ me: 'Zapisničar {{recorder}} {{sig}}', en: 'Recorder {{recorder}} {{sig}}', lbl: { me: 'potpis zapisničara', en: 'recorder\'s signature' } }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}}', en: 'Chair of the Founding Assembly {{chair}} {{sig}}', lbl: { me: 'potpis predsjedavajućeg', en: 'chair\'s signature' } }]),
  ] };

// ---------- form 04: Statut ----------
function buildStatute() {
  const me = orig('04').map(p => p.text);
  const en = enSegments(read(path.join(R, '04-statute.en.md')), b => b.type === 'h3' && /^Article/.test(b.text)); // en[0] preamble, en[n] article n
  const isCaps = t => /^[A-ZČĆŠŽĐ ,()\/-]{6,}$/.test(t);
  const CAPS_EN = { 'OPŠTE ODREDBE': 'GENERAL PROVISIONS', 'CILJEVI I DJELATNOSTI': 'GOALS AND ACTIVITIES', 'UNUTRAŠNJA ORGANIZACIJA': 'INTERNAL ORGANISATION', 'SKUPŠTINA': 'THE ASSEMBLY', 'SAZIVANJE SKUPŠTINE': 'CONVENING THE ASSEMBLY', 'KVORUM ZA RAD I ODLUČIVANJE': 'QUORUM FOR WORK AND DECISION-MAKING', 'NAČIN ODLUČIVANJA': 'MANNER OF DECISION-MAKING', 'ISKLJUČENJE PRAVA GLASA': 'EXCLUSION OF THE RIGHT TO VOTE', 'ZAPISNIK O RADU SKUPŠTINE': 'MINUTES OF THE WORK OF THE ASSEMBLY', 'LICE OVLAŠĆENO ZA ZASTUPANJE': 'THE PERSON AUTHORISED FOR REPRESENTATION', 'OVLAŠĆENJA LICA OVLAŠĆENOG ZA ZASTUPANJE': 'POWERS OF THE PERSON AUTHORISED FOR REPRESENTATION', 'ODGOVORNOST LICA OVLAŠĆENOG ZA ZASTUPANJE': 'RESPONSIBILITY OF THE PERSON AUTHORISED FOR REPRESENTATION', 'RAZRIJEŠENJE LICA OVLAŠĆENOG ZA ZASTUPANJE': 'DISMISSAL OF THE PERSON AUTHORISED FOR REPRESENTATION', 'SLUŽBENICI (OSOBLJE)': 'OFFICERS (STAFF)', 'POVEZIVANJE': 'AFFILIATION', 'FINANSIRANJE': 'FINANCING', 'OBAVLJANJE PRIVREDNE DJELATNOSTI': 'CARRYING OUT ECONOMIC ACTIVITY', 'ČLANSTVO U ORGANIZACIJI': 'MEMBERSHIP IN THE ORGANISATION', 'PRESTANAK ČLANSTVA': 'TERMINATION OF MEMBERSHIP', 'PRAVA I OBAVEZE ČLANOVA': 'RIGHTS AND OBLIGATIONS OF MEMBERS', 'PRELAZNE I ZAVRŠNE ODREDBE': 'TRANSITIONAL AND FINAL PROVISIONS' };
  // English article text with the same placeholders as the Montenegrin one
  const enArticle = n => {
    const paras = (en[n] || []).filter(q => !/^\(choose one:/.test(q));
    const sub = (i, re, to) => { if (paras[i] !== undefined) paras[i] = paras[i].replace(re, to); };
    if (n === 1) sub(0, /^_+ \(name of organisation\)/, '{{org}}');
    if (n === 2) { sub(0, /_+\.?/, '{{org}}.'); paras.push('The short name of the association is: {{short}}.'); }
    if (n === 3) sub(0, /_+\.?/, '{{seat}}.');
    if (n === 5) sub(0, /an _+ indefinite/, 'an indefinite');
    if (n === 6) return ['The goals of the association are: {{goals}}'];
    if (n === 7) return ['The activities of the association are: {{activities}}'];
    if (n === 8) { sub(0, /Non-governmental association _+\.?/, '{{seal_text}}.'); sub(1, /symbol _+\.?/, 'symbol {{seal_symbol}}.'); }
    if (n === 13) { const i = paras.findIndex(p => /term of _+ years/.test(p)); sub(i, /term of _+ years/, 'term of {{term_pres}} years'); }
    if (n === 18) sub(0, /is _+ years/, 'is {{term_assembly}} years');
    if (n === 22) { const i = paras.findIndex(p => /paragraph 4 of this Article/.test(p)); sub(i, 'paragraph 4 of this Article', 'paragraph 1 of this Article'); }
    if (n === 27) { sub(0, /term of _+ years/, 'term of {{term_rep}} years'); }
    if (n === 35) { sub(0, /economic activities: _+\.?/, 'economic activities: {{econ}}.'); paras.push('The provisions of the Law on Non-Governmental Organisations apply directly to the use of income earned from economic activity.'); }
    if (n === 36) { const i = paras.findIndex(p => /register of members/.test(p)); if (i >= 0) paras[i] = 'The register of members is kept by the Executive Director.'; }
    if (n === 37) paras.push('The decision on expulsion is taken by the Assembly by a majority of the members present. An expelled member may lodge an objection with the Assembly within 15 days; the Assembly\'s decision on the objection is final.');
    if (n === 40) sub(0, 'public institution that', 'public institution with its seat in Montenegro that');
    return paras;
  };
  const blocks = []; let art = 0, skipUnderscore = false, firstOfArticle = false;
  const push = (meT, enT) => blocks.push({ type: 'p', me: meT, en: enT === undefined ? '' : enT });
  let enQueue = [];
  const flushEn = () => { while (enQueue.length) { const t = enQueue.shift(); blocks.push({ type: 'p', me: '', en: t }); } };
  for (let i = 0; i < me.length; i++) {
    let t = me[i];
    const m = t.match(/^Član (\d+)$/);
    if (m) { flushEn(); art = +m[1]; blocks.push(H3(art)); enQueue = enArticle(art); skipUnderscore = (art === 6 || art === 7); firstOfArticle = true; if (art === 6) { push('Ciljevi udruženja su: {{goals}}', enQueue.shift()); } if (art === 7) { push('Djelatnosti udruženja su: {{activities}}', enQueue.shift()); } continue; }
    if (skipUnderscore && (/^_+$/.test(t) || /^(Ciljevi|Djelatnosti) udruženja su:?$/.test(t))) continue;
    if (t === 'STATUT') { flushEn(); blocks.push({ type: 'h', me: 'STATUT', en: 'STATUTE' }); continue; }
    if (isCaps(t)) { flushEn(); blocks.push({ type: 'h2', me: t, en: CAPS_EN[t] || t }); continue; }
    if (t.startsWith('(izabrati jedno') || t === '(naziv organizacije)') continue;
    if (t.startsWith('Dana, ')) { enQueue = enQueue.filter(q => !/^On \(date\)|^Chair of the Founding Assembly/.test(q)); flushEn(); blocks.push(SIG([{ me: 'Dana {{date}}, u Tivtu.', en: 'On {{date}}, in Tivat.', lbl: { me: 'datum i mjesto', en: 'date and place' } }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}} s.r.', en: 'Chair of the Founding Assembly {{chair}} {{sig}}', lbl: { me: 'potpis', en: 'signature' } }])); blocks.push(SIG([1, 2, 3, 4, 5].map(n => ({ me: `Osnivač {{f${n}_name}} {{sig}}`, en: `Founder {{f${n}_name}} {{sig}}`, lbl: { me: 'potpis osnivača', en: 'founder\'s signature' } })))); break; }
    if (/^u _+ \. Predsjedavajući/.test(t)) continue;
    if (art === 0) { t = t.replace(/nevladine organizacije_*\s*na sjednici od _*\s*je usvojila\s*\(naziv organizacije\)/, 'nevladine organizacije {{org}} na sjednici od {{date}} je usvojila'); push(t, 'Pursuant to Article 12 of the Law on Non-Governmental Organisations (Official Gazette of Montenegro nos. 39/11 and 37/17), the Founding Assembly of the non-governmental organisation {{org}}, at its session of {{date}}, adopted the'); continue; }
    if (art === 1) t = t.replace(/^_+ je nevladino udruženje\.(?:\s*\(naziv organizacije\))?/, '{{org}} je nevladino udruženje.');
    if (art === 2) { t = t.replace(/_+/, '{{org}}.'); push(t, enQueue.shift()); push('Skraćeni naziv udruženja je: {{short}}.', enQueue.shift()); continue; }
    if (art === 3) t = t.replace(/_+/, '{{seat}}');
    if (art === 5) t = t.replace(/na _+ neodređeno/, 'na neodređeno');
    if (art === 8) t = t.replace(/Nevladino udruženje _+/, '{{seal_text}}').replace(/znak _+/, 'znak {{seal_symbol}}');
    if (art === 13) t = t.replace(/mandat od _+ godine/, 'mandat od {{term_pres}} godine');
    if (art === 18) t = t.replace(/je _+ godina/, 'je {{term_assembly}} godine');
    if (art === 22) t = t.replace('iz stava 4 ovog člana', 'iz stava 1 ovog člana');
    if (art === 27) t = t.replace(/mandat od _+ godine/, 'mandat od {{term_rep}} godine');
    if (art === 35) { t = t.replace(/djelatnosti _+\s*\./, 'djelatnosti: {{econ}}.'); push(t, enQueue.shift()); push('Na korišćenje prihoda ostvarenog privrednom djelatnošću neposredno se primjenjuju odredbe Zakona o nevladinim organizacijama.', enQueue.shift()); continue; }
    if (art === 36 && /^O evidenciji članova/.test(t)) t = 'Registar članova vodi Izvršni direktor.';
    if (art === 37 && /^Članu se mora omogućiti/.test(t)) { push(t, enQueue.shift()); push('Odluku o isključenju donosi Skupština većinom glasova prisutnih članova. Isključeni član može podnijeti prigovor Skupštini u roku od 15 dana; odluka Skupštine po prigovoru je konačna.', enQueue.shift()); continue; }
    if (art === 40) t = t.replace('javnoj ustanovi koja', 'javnoj ustanovi sa sjedištem u Crnoj Gori koja');
    push(t, enQueue.shift());
    void firstOfArticle;
  }
  return { id: '04', title: { me: 'Statut', en: 'Statute' }, subtitle: { me: 'Usvaja Osnivačka skupština po članu 12 Zakona o NVO', en: 'Adopted by the Founding Assembly under Article 12 of the Law on NGOs' }, file: 'santamore-04-statut',
    note: { me: 'Obrazac CRNVO sa primijenjenim izmjenama iz uputstva: skraćeni naziv (čl. 2), uklonjena praznina (čl. 5), ispravljeno upućivanje (čl. 22), naziv funkcije Izvršni direktor (čl. 27 do 31), drugi stav u čl. 35, ko vodi registar članova (čl. 36), pravo na prigovor (čl. 37), „sa sjedištem u Crnoj Gori“ (čl. 40). <b>Opcija 1</b> (Upravni odbor, Komisija za dodjelu sredstava, ogranci, punomoćja) je u nacrtu „Dopune statuta“; ako se usvoji, članovi se prenumerišu pri potpisivanju.', en: 'The CRNVO template with the guide\'s edits applied: short name (Art. 2), the removed blank (Art. 5), the corrected cross-reference (Art. 22), the title Executive Director (Arts. 27 to 31), a second paragraph in Art. 35, who keeps the register of members (Art. 36), the right to object (Art. 37), "with its seat in Montenegro" (Art. 40). <b>Option 1</b> (Board, Grants Committee, chapters, proxies) is in the draft "Statute additions"; if adopted, articles are renumbered at signing.' },
    blocks };
}

// ---------- form 01: checklist ----------
function buildInstructions() {
  const paras = orig('01'); const en = enSegments(read(path.join(R, '01-instructions-for-founding-an-ngo.en.md')), b => b.type === 'h2' && /^\d\./.test(b.text));
  const titles = { 1: ['Registracija u Ministarstvu', 'Registration with the Ministry'], 2: ['Razvrstavanje djelatnosti (MONSTAT)', 'Classification of activity (MONSTAT)'], 3: ['Privredna djelatnost (CRPS), samo ako je potrebno', 'Economic activity (CRPS), only if needed'], 4: ['Otvaranje računa u banci', 'Opening a bank account'], 5: ['PIB u Poreskoj upravi', 'Tax number (PIB) at the Tax Administration'] };
  const blocks = []; let step = 0, n = 0, meItems = [];
  const flush = () => {
    if (!step) return;
    const enItems = en[step] || [];
    const aligned = enItems.length === meItems.length;
    meItems.forEach((t, i) => { n++; blocks.push({ type: 'check', id: `s${step}_${n}`, me: t, en: aligned ? enItems[i] : '' }); });
    if (!aligned) blocks.push({ type: 'p', me: '', en: enItems.join(' ') });
    meItems = [];
  };
  for (const p of paras) {
    if (/^\d$/.test(p.text)) { flush(); step = +p.text; blocks.push({ type: 'h3', me: `Korak ${step}: ${titles[step][0]}`, en: `Step ${step}: ${titles[step][1]}` }); continue; }
    if (step === 0) continue;
    meItems.push(p.text);
  }
  flush();
  return { id: '01', title: { me: 'Instrukcije za osnivanje: lista koraka', en: 'Instructions for founding: step checklist' }, subtitle: { me: 'Štikliranje se čuva za cijeli tim', en: 'Ticks are saved for the whole team' }, file: 'santamore-01-instrukcije-koraci',
    note: { me: 'Redosljed u praksi: 1 → 2 → (3 samo uz privrednu djelatnost) → 5 → 4, jer banka traži PIB.', en: 'Working order: 1 → 2 → (3 only with an economic activity) → 5 → 4, because the bank asks for the PIB.' }, blocks };
}

// ---------- drafts ----------
const draftList = [
  ['statute-additions', path.join(R, 'statute-additions.md'), 'Dopune statuta', 'Statute additions'],
  ['grants-criteria', path.join(G, 'grants-criteria.md'), 'Kriterijumi za dodjelu sredstava', 'Grants Committee criteria'],
  ['chapter-rules', path.join(G, 'chapter-rules.md'), 'Pravila o ograncima', 'Chapter Rules'],
  ['conflict-of-interest-policy', path.join(G, 'conflict-of-interest-policy.md'), 'Pravila o sukobu interesa', 'Conflict of interest policy'],
  ['child-safeguarding-policy', path.join(G, 'child-safeguarding-policy.md'), 'Politika zaštite djece', 'Child safeguarding policy'],
  ['event-terms-and-waiver', path.join(G, 'event-terms-and-waiver.md'), 'Uslovi učešća i izjava', 'Event terms and waiver'],
  ['donation-policy', path.join(G, 'donation-policy.md'), 'Pravila donacija', 'Donation policy'],
  ['privacy-policy', path.join(G, 'privacy-policy.md'), 'Politika privatnosti', 'Privacy policy'],
  ['impressum', path.join(G, 'impressum.md'), 'Impressum', 'Impressum'],
  ['terms-of-use', path.join(G, 'terms-of-use.md'), 'Uslovi korišćenja', 'Terms of use'],
  ['code-of-conduct', path.join(G, 'code-of-conduct.md'), 'Kodeks ponašanja', 'Code of conduct'],
  ['volunteer-agreement', path.join(G, 'volunteer-agreement.md'), 'Ugovor o volontiranju', 'Volunteer agreement'],
  ['sponsorship-agreement', path.join(G, 'sponsorship-agreement.md'), 'Ugovor o sponzorstvu', 'Sponsorship agreement'],
  ['beneficiary-application-form', path.join(G, 'beneficiary-application-form.md'), 'Prijava za pomoć', 'Beneficiary application'],
];
const drafts = draftList.map(([id, file, me, en]) => ({ id, title: { me, en }, file: 'santamore-nacrt-' + id, html: draftHtml(read(file)) }));
const forms = [buildInstructions(), form02, form03, buildStatute(), form05];
const guide = { title: { me: 'Kako dovršiti paket', en: 'How to complete the pack' }, file: 'santamore-kako-dovrsiti', html: draftHtml(read(path.join(R, 'HOW-TO-COMPLETE.md'))) };
const pack = { fields: F, forms, drafts, guide, builtAt: new Date().toISOString().slice(0, 10) };
const out = path.join(ROOT, 'content/legal-pack/pack.json');
fs.writeFileSync(out, JSON.stringify(pack, null, 0) + '\n');
console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB;', forms.length, 'forms,', drafts.length, 'drafts');
