#!/usr/bin/env node
/**
 * Builds docs/legal/web/index.html: the team review site for the registration pack.
 * Forms 01 to 05 come from the Ministry's originals (registration/originals) with the blanks turned into
 * pre-filled editable fields per completion-guide.md; the English translations come from registration/*.en.md.
 * Drafts come from registration/statute-additions.md and governance/*.md.
 *   node scripts/legal/build-web.js
 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..'), R = path.join(ROOT, 'docs/legal/registration'), G = path.join(ROOT, 'docs/legal/governance');
const read = p => fs.readFileSync(p, 'utf8');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const orig = n => JSON.parse(execFileSync('python3', [path.join(__dirname, 'extract_docx_paragraphs.py'), path.join(R, 'originals', fs.readdirSync(path.join(R, 'originals')).find(f => f.startsWith(n + '-')))], { encoding: 'utf8' }));

// ---------- markdown → blocks / html ----------
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
function inline(t) {
  return esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
}
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
  const blocks = parseBlocks(md); let out = [], sawH2 = false;
  for (const b of blocks) {
    if (b.type === 'h1') continue;
    if (b.type === 'h2') { sawH2 = true; out.push(`<h2>${inline(b.text)}</h2>`); continue; }
    if (b.type === 'h3') { out.push(`<h3>${inline(b.text)}</h3>`); continue; }
    if (b.type === 'table') { out.push(blockHtml(b)); continue; }
    const text = b.items ? b.items.join(' ') : b.text;
    const isEn = !sawH2 || lang(text) === 'en';
    out.push(blockHtml(b, isEn ? 'en' : ''));
  }
  return out.join('\n');
}
function segmentsEn(md, isAnchor) { const segs = [[]]; for (const b of parseBlocks(md)) { if (b.type === 'h1') continue; if (isAnchor(b) && segs[segs.length - 1].length) segs.push([]); segs[segs.length - 1].push(b); } return segs.map(s => s.filter(b => !/^h/.test(b.type)).map(b => blockHtml(b)).join('')); }

// ---------- shared field defaults (from completion-guide.md; unknown facts stay bracketed placeholders) ----------
const goalsME = `1. pružanje humanitarne, materijalne i druge podrške pojedincima, porodicama, djeci, malim preduzećima i organizacijama u stanju socijalne potrebe, prvenstveno u Tivtu i Boki Kotorskoj, a zatim i u ostalim opštinama Crne Gore;
2. prikupljanje dobrovoljnih priloga i donacija putem javnih sportskih, rekreativnih, humanitarnih i kulturnih događaja i putem internet platforme za prikupljanje sredstava, uz potpunu javnost prihoda i rashoda;
3. promocija sporta, rekreacije, zdravih stilova života i volonterizma;
4. podrška djeci i mladima, kulturi i zaštiti životne sredine, posebno mora i obale Boke Kotorske;
5. podsticanje solidarnosti, društvene odgovornosti i razvoja lokalne zajednice;
6. jačanje povjerenja u dobrotvorni rad kroz javno objavljivanje svakog prihoda i rashoda udruženja.`;
const activitiesME = `1. organizovanje humanitarnih trka, plivanja, regata i drugih sportskih, rekreativnih, kulturnih i javnih manifestacija;
2. prikupljanje, evidentiranje i raspodjela donacija i drugih dobrovoljnih priloga korisnicima po javno objavljenim kriterijumima;
3. razvoj i vođenje internet platforme za prikupljanje sredstava i javnog pregleda prihoda i rashoda;
4. saradnja sa sportskim klubovima, školama, privrednim društvima, organima lokalne samouprave, drugim nevladinim organizacijama i institucijama u zemlji i inostranstvu;
5. organizovanje volonterskih, edukativnih i omladinskih programa;
6. osnivanje i koordinacija lokalnih ogranaka udruženja u drugim opštinama;
7. izdavačka i informativna djelatnost u vezi sa ciljevima udruženja;
8. druge aktivnosti u skladu sa zakonom koje doprinose ostvarivanju ciljeva udruženja.`;
const econME = `prodaja promotivnih proizvoda (majice, kostimi, suveniri) u vezi sa ciljevima udruženja; naplata kotizacija za učešće na događajima koje organizuje udruženje; pružanje usluga organizacije događaja trećim licima`;
const F = {
  org: { label: 'Naziv udruženja', value: 'Nevladino udruženje „Santamore“' },
  short: { label: 'Skraćeni naziv', value: 'NVU „Santamore“' },
  seat: { label: 'Sjedište', value: 'Tivat' },
  addr: { label: 'Adresa', value: '[ulica i broj], Tivat' },
  date: { label: 'Datum osnivačke skupštine', value: '[datum sjednice]' },
  place: { label: 'Mjesto', value: 'Tivtu' },
  f1_name: { label: 'Osnivač 1, ime i prezime', value: '[Ime i prezime]' }, f1_jmb: { label: 'Osnivač 1, JMB', value: '[JMB]' }, f1_addr: { label: 'Osnivač 1, adresa', value: '[adresa prebivališta]' },
  f2_name: { label: 'Osnivač 2, ime i prezime', value: '[Ime i prezime]' }, f2_jmb: { label: 'Osnivač 2, JMB', value: '[JMB]' }, f2_addr: { label: 'Osnivač 2, adresa', value: '[adresa prebivališta]' },
  f3_name: { label: 'Osnivač 3, ime i prezime', value: '[Ime i prezime]' }, f3_jmb: { label: 'Osnivač 3, JMB', value: '[JMB]' }, f3_addr: { label: 'Osnivač 3, adresa', value: '[adresa prebivališta]' },
  goals: { label: 'Ciljevi', value: goalsME, block: true }, activities: { label: 'Djelatnosti', value: activitiesME, block: true },
  rep_title: { label: 'Funkcija ovlašćenog lica', value: 'Izvršni direktor' }, rep_name: { label: 'Ovlašćeno lice, ime i prezime', value: '[Ime i prezime]' }, rep_jmb: { label: 'Ovlašćeno lice, JMB', value: '[JMB]' }, rep_addr: { label: 'Ovlašćeno lice, adresa', value: '[adresa prebivališta]' },
  chair: { label: 'Predsjedavajući Osnivačke skupštine', value: '[Ime i prezime]' }, deputy: { label: 'Zamjenik predsjednika Skupštine', value: '[Ime i prezime]' }, recorder: { label: 'Zapisničar', value: '[Ime i prezime]' },
  applicant: { label: 'Podnosilac', value: 'Nevladino udruženje „Santamore“ u osnivanju, [ulica i broj], Tivat, zastupano po predsjedavajućem Osnivačke skupštine [Ime i prezime], tel. [telefon], e-pošta [e-pošta]', block: true },
  date_app: { label: 'Datum prijave', value: '[datum predaje]' },
  start: { label: 'Vrijeme početka', value: '[18:00]' }, end: { label: 'Vrijeme završetka', value: '[19:30]' }, venue: { label: 'Adresa mjesta održavanja', value: '[adresa mjesta održavanja], Tivat' },
  salut: { label: 'g./gđa', value: 'g.' }, v1: { label: 'izložio/la', value: 'izložio' }, v2: { label: 'upoznao/la', value: 'upoznao' }, term: { label: 'Mandat', value: '4 (četiri)' }, vote: { label: 'Rezultat glasanja', value: 'jednoglasno' },
  seal_text: { label: 'Tekst po obodu pečata', value: 'Nevladino udruženje „Santamore“, Tivat' }, seal_symbol: { label: 'Znak u sredini pečata', value: '[opis znaka Santamore]' },
  term_pres: { label: 'Mandat predsjednika Skupštine', value: '4 (četiri)' }, term_assembly: { label: 'Mandat Skupštine', value: '4 (četiri)' }, term_rep: { label: 'Mandat ovlašćenog lica', value: '4 (četiri)' },
  econ: { label: 'Privredne djelatnosti', value: econME, block: true },
};

// ---------- form 02: Odluka o osnivanju ----------
const en02 = segmentsEn(read(path.join(R, '02-founding-decision.en.md')), b => b.type === 'h3' && /^Article/.test(b.text));
const form02 = { id: '02', title: 'Odluka o osnivanju', subtitle: 'Decision on founding · osnivački akt po članu 11 Zakona o NVO', file: 'santamore-02-odluka-o-osnivanju',
  note: 'Popunjeno prema uputstvu za popunjavanje (completion-guide.md). <b>Podaci u uglastim zagradama nisu poznati</b> i unose ih osnivači. Potpisi ostaju prazni za štampu. Ciljevi i djelatnosti moraju biti identični čl. 6 i 7 Statuta; ovdje su ista polja.',
  fields: F, blocks: [
    { type: 'p', me: 'Na osnovu člana 11 Zakona o nevladinim organizacijama (Sl. list Crne Gore br. 39/11 i 37/17), Osnivačka Skupština {{org}} donosi', en: en02[0].replace(/<p>English translation.*?<\/p>/, '') },
    { type: 'h', me: 'ODLUKU O OSNIVANJU', en: 'DECISION ON FOUNDING' },
    { type: 'h3', me: 'Član 1', en: 'Article 1' }, { type: 'p', me: 'Osnivači su:' },
    { type: 'list', items: ['ime i prezime {{f1_name}}; JMB {{f1_jmb}}; adresa {{f1_addr}}; potpis {{sig}}', 'ime i prezime {{f2_name}}; JMB {{f2_jmb}}; adresa {{f2_addr}}; potpis {{sig}}', 'ime i prezime {{f3_name}}; JMB {{f3_jmb}}; adresa {{f3_addr}}; potpis {{sig}}'], en: en02[1] },
    { type: 'h3', me: 'Član 2', en: 'Article 2' }, { type: 'p', me: 'Naziv udruženja je: {{org}}', en: en02[2] },
    { type: 'h3', me: 'Član 3', en: 'Article 3' }, { type: 'p', me: 'Adresa udruženja je: {{addr}}', en: en02[3] },
    { type: 'h3', me: 'Član 4', en: 'Article 4' }, { type: 'p', me: 'Sjedište udruženja je u {{seat}}.', en: en02[4] },
    { type: 'h3', me: 'Član 5', en: 'Article 5' }, { type: 'p', me: 'Ciljevi udruženja su: {{goals}}', en: en02[5] },
    { type: 'h3', me: 'Član 6', en: 'Article 6' }, { type: 'p', me: 'Djelatnosti udruženja su: {{activities}}', en: en02[6] },
    { type: 'h3', me: 'Član 7', en: 'Article 7' }, { type: 'p', me: 'Lice ovlašćeno za zastupanje i predstavljanje udruženja je {{rep_title}}, {{rep_name}}, JMB {{rep_jmb}}, {{rep_addr}}, potpis {{sig}}', en: en02[7] },
    { type: 'sigrow', items: [{ me: 'U {{place}}, dana {{date}}.', lbl: 'mjesto i datum', en: 'place and date' }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}} s.r.', lbl: 'potpis', en: 'signature' }] },
  ] };

// ---------- form 03: Prijava za upis ----------
const form03 = { id: '03', title: 'Prijava za upis u Registar NVO', subtitle: 'Application for entry in the Register of Non-Governmental Organisations', file: 'santamore-03-prijava-za-upis',
  note: 'Dodat je četvrti prilog (fotokopije ličnih karata osnivača), koji instrukcije traže. Pečata još nema; nema mjesta za njega.', fields: F, blocks: [
    { type: 'p', me: 'Vlada Crne Gore<br>Ministarstvo regionalno-investicionog razvoja i saradnje sa nevladinim organizacijama', en: 'Government of Montenegro · Ministry of Regional-Investment Development and Cooperation with Non-Governmental Organisations' },
    { type: 'p', me: '<b>Predmet:</b> Prijava za upis u Registar nevladinih organizacija', en: 'Subject: Application for entry in the Register of Non-Governmental Organisations' },
    { type: 'p', me: '<b>Podnosilac:</b> {{applicant}}', en: 'Applicant' },
    { type: 'h2', me: 'Obrazloženje', en: 'Explanation' },
    { type: 'p', me: 'Dana {{date}} godine sastala se Osnivačka Skupština {{org}} i donijela sljedeće odluke:', en: 'On the stated date the Founding Assembly of the association met and adopted the following decisions:' },
    { type: 'list', items: ['da osnuje udruženje naziva: {{org}}', 'da usvoji Statut', 'da podnese prijavu za upis u Registar nevladinih organizacija.'], en: '1. to found an association with the stated name; 2. to adopt the Statute; 3. to submit an application for entry in the Register.' },
    { type: 'p', me: 'U skladu sa gore navedenim odlukama molimo vas da izvršite upis nevladine organizacije „{{org}}“ u Registar nevladinih organizacija koji se vodi pri vašem Ministarstvu.', en: 'In accordance with the decisions above, we ask you to enter the association in the Register kept at your Ministry.' },
    { type: 'p', me: 'U prilogu dostavljamo:' },
    { type: 'list', items: ['Odluku o osnivanju', 'Zapisnik sa osnivačke skupštine', 'Statut', 'Fotokopije ličnih karata osnivača'], en: 'Enclosed: the Decision on founding, the Minutes of the founding assembly, the Statute, photocopies of the founders\' identity cards.' },
    { type: 'sigrow', items: [{ me: 'U {{place}}, dana {{date_app}}.', lbl: 'mjesto i datum predaje', en: 'place and filing date' }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}} s.r.', lbl: 'potpis', en: 'signature' }] },
  ] };

// ---------- form 05: Zapisnik ----------
const form05 = { id: '05', title: 'Zapisnik sa osnivačke skupštine', subtitle: 'Minutes of the founding assembly', file: 'santamore-05-zapisnik-osnivacke-skupstine',
  note: 'Obrazac je govorio „u Podgorici“ i „u 15 časova“; zamijenjeno sa Tivtom i poljima za vrijeme. Dodati su prisutni, zapisničar, rezultat glasanja i potpis predsjedavajućeg, koje traži čl. 23 i 25 Statuta.', fields: F, blocks: [
    { type: 'h', me: 'ZAPISNIK SA OSNIVAČKE SKUPŠTINE NEVLADINOG UDRUŽENJA „SANTAMORE“', en: 'MINUTES OF THE FOUNDING ASSEMBLY OF THE NON-GOVERNMENTAL ASSOCIATION' },
    { type: 'p', me: 'Osnivački odbor NEVLADINOG UDRUŽENJA „Santamore“ u sastavu:', en: 'The founding committee of the association, composed of:' },
    { type: 'list', items: ['{{f1_name}}', '{{f2_name}}', '{{f3_name}}'] },
    { type: 'p', me: 'sazvao je Osnivačku skupštinu NEVLADINOG UDRUŽENJA „Santamore“ na dan {{date}} godine u {{place}}, sa početkom u {{start}} časova. Skupština je održana u {{place}}, u prostorijama na adresi {{venue}}. Skupštini su prisustvovali svi osnivači navedeni u Odluci o osnivanju i spisku osnivača: {{f1_name}}, {{f2_name}}, {{f3_name}}. Zapisničar: {{recorder}}.', en: 'convened the Founding Assembly on the stated date and time in Tivat at the stated address. All founders listed in the Decision on founding attended; the recorder is named.' },
    { type: 'p', me: 'Skupština je usvojila sledeći dnevni red:', en: 'The Assembly adopted the following agenda:' },
    { type: 'list', items: ['Zadaci i ciljevi NEVLADINOG UDRUŽENJA „Santamore“', 'Nacrti Odluke o osnivanju i Statuta NEVLADINOG UDRUŽENJA „Santamore“', 'Diskusija o Statutu', 'Usvajanje odluka'], en: '1. Tasks and goals; 2. Drafts of the Decision on founding and the Statute; 3. Discussion of the Statute; 4. Adoption of decisions.' },
    { type: 'p', me: 'Predsjednik osnivačke skupštine {{salut}} {{chair}} {{v1}} je ciljeve i zadatke udruženja, potom {{v2}} prisutne sa osnovnim elementima budućeg Statuta udruženja, koji je u kraćoj raspravi djelimično izmijenjen i dopunjen.', en: 'The chair presented the goals and tasks and the elements of the future Statute, which was partly amended in a short discussion.' },
    { type: 'p', me: 'Zatim su osnivači donijeli Odluku o osnivanju NEVLADINOG UDRUŽENJA „Santamore“ i usvojili Statut. Sve odluke donijete su {{vote}}.', en: 'The founders then adopted the Decision on founding and the Statute; the vote result is recorded.' },
    { type: 'p', me: 'Skupština je potom izabrala predsjednika skupštine, zamjenika predsjednika skupštine i lice ovlašćeno za zastupanje, i to:', en: 'The Assembly then elected:' },
    { type: 'list', items: ['Predsjednik Skupštine: {{chair}}, na mandat od {{term}} godine', 'Zamjenik predsjednika Skupštine: {{deputy}}, na mandat od {{term}} godine', 'Lice ovlašćeno za zastupanje, {{rep_title}}: {{rep_name}}, na mandat od {{term}} godine'], en: '1. President of the Assembly; 2. Deputy President; 3. the person authorised for representation (Executive Director), each for the stated term.' },
    { type: 'p', me: 'Za sjedište udruženja određene su prostorije u: {{addr}}.', en: 'The premises at the stated address were designated as the seat.' },
    { type: 'p', me: 'Skupština je zaključena u {{end}} časova.', en: 'The Assembly was closed at the stated time.' },
    { type: 'p', me: 'U {{place}}, {{date}} godine.' },
    { type: 'sigrow', items: [{ me: 'Zapisničar {{recorder}} {{sig}}', lbl: 'potpis zapisničara', en: 'recorder' }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}}', lbl: 'potpis predsjedavajućeg', en: 'chair' }] },
  ] };

// ---------- form 04: Statut (from the original, blanks → fields, guide's edits applied) ----------
function buildStatute() {
  const paras = orig('04').map(p => p.text);
  const en = segmentsEn(read(path.join(R, '04-statute.en.md')), b => b.type === 'h3' && /^Article/.test(b.text)); // en[0] preamble, en[n] article n
  const blocks = []; let art = 0; let skipUnderscore = false;
  const isCaps = t => /^[A-ZČĆŠŽĐ ,()\/-]{6,}$/.test(t);
  const push = (me, extra) => blocks.push(Object.assign({ type: 'p', me }, extra || {}));
  for (let i = 0; i < paras.length; i++) {
    let t = paras[i];
    const m = t.match(/^Član (\d+)$/);
    if (m) { art = +m[1]; blocks.push({ type: 'h3', me: t, en: 'Article ' + art }); skipUnderscore = (art === 6 || art === 7); if (art === 6) push('{{goals}}', { en: en[6] }); if (art === 7) push('{{activities}}', { en: en[7] }); continue; }
    if (skipUnderscore && /^_+$/.test(t)) continue;
    if (t === 'STATUT') { blocks.push({ type: 'h', me: 'STATUT', en: 'STATUTE' }); continue; }
    if (isCaps(t)) { blocks.push({ type: 'h2', me: t }); continue; }
    if (t.startsWith('(izabrati jedno')) continue;
    if (t.startsWith('Dana, ')) { blocks.push({ type: 'sigrow', items: [{ me: 'Dana {{date}}, u {{place}}.', lbl: 'datum i mjesto', en: 'date and place' }, { me: 'Predsjedavajući Osnivačke Skupštine {{chair}} {{sig}} s.r.', lbl: 'potpis', en: 'signature' }] }); blocks.push({ type: 'sigrow', items: [{ me: 'Osnivač {{f1_name}} {{sig}}', lbl: 'potpis osnivača' }, { me: 'Osnivač {{f2_name}} {{sig}}', lbl: 'potpis osnivača' }, { me: 'Osnivač {{f3_name}} {{sig}}', lbl: 'potpis osnivača' }] }); break; }
    if (/^u _+ \. Predsjedavajući/.test(t)) continue;
    // substitutions per article
    if (art === 0) { t = t.replace(/nevladine organizacije_*\s*na sjednici od _*\s*je usvojila\s*\(naziv organizacije\)/, 'nevladine organizacije {{org}} na sjednici od {{date}} je usvojila'); push(t, { en: en[0].replace(/<p>English translation.*?<\/p>/, '') }); continue; }
    if (art === 1) t = t.replace(/^_+ je nevladino udruženje\.(?:\s*\(naziv organizacije\))?/, '{{org}} je nevladino udruženje.');
    if (art === 2) { t = t.replace(/_+/, '{{org}}.'); push(t, { en: en[2] }); push('Skraćeni naziv udruženja je: {{short}}.'); continue; }
    if (art === 3) t = t.replace(/_+/, '{{seat}}');
    if (art === 5) t = t.replace(/na _+ neodređeno/, 'na neodređeno');
    if (art === 8) { t = t.replace(/Nevladino udruženje _+/, '{{seal_text}}').replace(/znak _+/, 'znak {{seal_symbol}}'); }
    if (art === 13) t = t.replace(/mandat od _+ godine/, 'mandat od {{term_pres}} godine');
    if (art === 18) t = t.replace(/je _+ godina/, 'je {{term_assembly}} godine');
    if (art === 22) t = t.replace('iz stava 4 ovog člana', 'iz stava 1 ovog člana');
    if (art === 27) t = t.replace(/mandat od _+ godine/, 'mandat od {{term_rep}} godine');
    if (art === 35) { t = t.replace(/djelatnosti _+\s*\./, 'djelatnosti: {{econ}}.'); push(t, { en: en[35] }); push('Na korišćenje prihoda ostvarenog privrednom djelatnošću neposredno se primjenjuju odredbe Zakona o nevladinim organizacijama.'); continue; }
    if (art === 36 && /^O evidenciji članova/.test(t)) t = 'Registar članova vodi Izvršni direktor.';
    if (art === 37 && /^Članu se mora omogućiti/.test(t)) { push(t, { en: en[37] }); push('Odluku o isključenju donosi Skupština većinom glasova prisutnih članova. Isključeni član može podnijeti prigovor Skupštini u roku od 15 dana; odluka Skupštine po prigovoru je konačna.'); continue; }
    if (art === 40) t = t.replace('javnoj ustanovi koja', 'javnoj ustanovi sa sjedištem u Crnoj Gori koja');
    // attach the English translation to the first paragraph of each article
    const first = !blocks.some(b => b.art === art && b.type === 'p');
    push(t, Object.assign({ art }, first && en[art] ? { en: en[art] } : {}));
  }
  return { id: '04', title: 'Statut', subtitle: 'Statute · usvaja Osnivačka skupština po članu 12 Zakona o NVO', file: 'santamore-04-statut',
    note: 'Obrazac CRNVO sa primijenjenim izmjenama iz uputstva: skraćeni naziv (čl. 2), uklonjena praznina (čl. 5), ispravljeno upućivanje (čl. 22), naziv funkcije Izvršni direktor (čl. 27 do 31), drugi stav u čl. 35, ko vodi registar članova (čl. 36), pravo na prigovor (čl. 37), „sa sjedištem u Crnoj Gori“ (čl. 40). <b>Opcija 1</b> (Upravni odbor, Komisija za dodjelu sredstava, ogranci, punomoćja) je u nacrtu „Dopune statuta“ u lijevom meniju; ako se usvoji, članovi se prenumerišu pri potpisivanju.',
    fields: F, blocks };
}

// ---------- form 01: Instrukcije as a shared checklist ----------
function buildInstructions() {
  const paras = orig('01'); const en = segmentsEn(read(path.join(R, '01-instructions-for-founding-an-ngo.en.md')), b => b.type === 'h2' && /^\d\./.test(b.text));
  const titles = { 1: 'Registracija u Ministarstvu', 2: 'Razvrstavanje djelatnosti (MONSTAT)', 3: 'Privredna djelatnost (CRPS), samo ako je potrebno', 4: 'Otvaranje računa u banci', 5: 'PIB u Poreskoj upravi' };
  const blocks = []; let step = 0, n = 0;
  for (const p of paras) {
    if (/^\d$/.test(p.text)) { step = +p.text; blocks.push({ type: 'h3', me: `Korak ${step}: ${titles[step]}`, en: en[step] ? '' : '' }); if (en[step]) blocks.push({ type: 'p', me: '', en: en[step] }); continue; }
    if (step === 0) continue;
    n++; blocks.push({ type: 'check', id: `s${step}_${n}`, me: p.text });
  }
  return { id: '01', title: 'Instrukcije za osnivanje: lista koraka', subtitle: 'Instructions for founding an NGO, as a shared checklist', file: 'santamore-01-instrukcije-koraci',
    note: 'Redosljed u praksi: 1 → 2 → (3 samo uz privrednu djelatnost) → 5 → 4, jer banka traži PIB. Štikliranje se čuva za tim dugmetom „Sačuvaj za tim“.', fields: F, blocks: blocks.filter(b => !(b.type === 'p' && !b.me && !b.en)) };
}

// ---------- drafts ----------
const draftList = [
  ['statute-additions', path.join(R, 'statute-additions.md'), 'Dopune statuta', 'Statute additions: Board, Grants Committee, chapters, proxy voting'],
  ['grants-criteria', path.join(G, 'grants-criteria.md'), 'Kriterijumi za dodjelu sredstava', 'Grants Committee criteria'],
  ['chapter-rules', path.join(G, 'chapter-rules.md'), 'Pravila o ograncima', 'Chapter Rules'],
  ['conflict-of-interest-policy', path.join(G, 'conflict-of-interest-policy.md'), 'Pravila o sukobu interesa', 'Conflict of interest policy'],
  ['child-safeguarding-policy', path.join(G, 'child-safeguarding-policy.md'), 'Politika zaštite djece', 'Child and vulnerable adult safeguarding policy'],
  ['event-terms-and-waiver', path.join(G, 'event-terms-and-waiver.md'), 'Uslovi učešća i izjava', 'Event terms and participation waiver'],
  ['donation-policy', path.join(G, 'donation-policy.md'), 'Pravila donacija', 'Donation policy'],
  ['privacy-policy', path.join(G, 'privacy-policy.md'), 'Politika privatnosti', 'Privacy policy'],
  ['impressum', path.join(G, 'impressum.md'), 'Impressum', 'Organisation details for the acquirer'],
  ['terms-of-use', path.join(G, 'terms-of-use.md'), 'Uslovi korišćenja', 'Terms of use'],
  ['code-of-conduct', path.join(G, 'code-of-conduct.md'), 'Kodeks ponašanja', 'Code of conduct'],
  ['volunteer-agreement', path.join(G, 'volunteer-agreement.md'), 'Ugovor o volontiranju', 'Volunteer agreement and rules'],
  ['sponsorship-agreement', path.join(G, 'sponsorship-agreement.md'), 'Ugovor o sponzorstvu', 'Sponsorship agreement and rules'],
  ['beneficiary-application-form', path.join(G, 'beneficiary-application-form.md'), 'Prijava za pomoć', 'Beneficiary application form, guidance and intake'],
];
const drafts = draftList.map(([id, file, title, subtitle]) => ({ id, title, subtitle, file: 'santamore-nacrt-' + id, html: draftHtml(read(file)) }));
const forms = [buildInstructions(), form02, form03, buildStatute(), form05];
const PACK = { forms, drafts };

// ---------- page ----------
const css = read(path.join(__dirname, 'web-app.css')), js = read(path.join(__dirname, 'web-app.js'));
const safeJson = o => JSON.stringify(o).replace(/<\//g, '<\\/');
const html = `<title>Santamore Registration Pack</title>
<meta name="description" content="Pre-filled founding documents and governance drafts for review, editing and PDF download">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Julius+Sans+One&family=Nunito:wght@500;600;700;800&display=swap">
<style>${css}</style>
<div class="app">
  <aside class="nav" id="navpanel" aria-label="Dokumenti">
    <h1 class="brand">Santamore<small>Registracija i pravila</small></h1>
    <nav id="nav"></nav>
    <div class="navfoot">Crnogorski je mjerodavan tekst. Plava polja su popunjena i mogu se mijenjati; potpisi ostaju prazni za štampu. „Sačuvaj za tim“ objavljuje izmjene svima koji otvore stranicu.</div>
  </aside>
  <div class="scrim" id="scrim" hidden></div>
  <main class="main" id="main">
    <div class="toolbar">
      <button class="btn menubtn" id="menubtn" aria-label="Otvori meni">☰ Dokumenti</button>
      <label class="toggle"><input type="checkbox" id="show-en"> EN prevod</label>
      <span class="grow"></span>
      <span class="status" id="status" aria-live="polite">Učitavanje…</span>
      <label class="toggle" title="Uključi prevod u PDF i štampu"><input type="checkbox" id="pdf-en"> EN u PDF</label>
      <button class="btn" id="print">Štampaj</button>
      <button class="btn" id="pdf">Preuzmi PDF</button>
      <span class="status" id="pdf-hint" hidden>PDF: koristi Štampaj → Sačuvaj kao PDF</span>
      <button class="btn primary" id="save">Sačuvaj za tim</button>
    </div>
    <article class="sheet" id="sheet"></article>
  </main>
</div>
<script id="pack-state" type="application/json">{}</script>
<script>window.PACK=${safeJson(PACK)};</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>${js}</script>
`;
const out = path.join(ROOT, 'docs/legal/web/index.html');
fs.writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024) + ' KB', forms.length, 'forms,', drafts.length, 'drafts');
