// The governance documents as the site and the console consume them: one HTML rendering
// per language, the public part(s) alone for the site, the Montenegrin and English
// interleaved for the console's bilingual view, and the working notes.
//   docs/legal/governance/manifest.json names every document; <id>.<lang>.md carries its text.
const fs = require('fs'), path = require('path');
const { parseBlocks, blockHtml, shape } = require('./md');
const G = path.join(__dirname, '..', '..', 'docs/legal/governance');
const LANGS = ['me', 'en', 'ru'];

function readMd(id, lang) {
  const file = path.join(G, `${id}.${lang}.md`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** Blocks of the public part(s): the first `publicParts` "##" sections (or everything), the part heading dropped when there is only one. */
function publicBlocks(blocks, publicParts) {
  const body = blocks.filter(b => b.type !== 'h1');
  if (publicParts === 'all') return body;
  const out = []; let part = 0;
  for (const b of body) {
    if (b.type === 'h2') { part++; if (part > publicParts) break; if (publicParts === 1) continue; }
    out.push(b);
  }
  return out;
}

const html = blocks => blocks.map(b => blockHtml(b)).join('\n');
/** Montenegrin and English interleaved, every English block marked "en", the title left out. */
function bilingualHtml(me, en) {
  const a = me.filter(b => b.type !== 'h1'), b = en.filter(x => x.type !== 'h1');
  if (shape(a).join() !== shape(b).join()) throw new Error('bilingualHtml: the two languages do not line up');
  return a.map((block, i) => blockHtml(block) + '\n' + blockHtml(b[i], 'en')).join('\n');
}

function loadDoc(id, meta) {
  const langs = LANGS.filter(l => readMd(id, l) !== null);
  if (!langs.includes('me') || !langs.includes('en')) return null;
  const blocks = Object.fromEntries(langs.map(l => [l, parseBlocks(readMd(id, l))]));
  for (const l of langs) if (shape(blocks[l]).join() !== shape(blocks.me).join()) throw new Error(`${id}: ${l} does not line up with me (run scripts/legal/check-align.js ${id})`);
  const title = Object.fromEntries(langs.map(l => [l, blocks[l].find(b => b.type === 'h1')?.text ?? id]));
  const notes = readMd(id, 'notes');
  return {
    id, category: meta.category, route: meta.route ?? null, langs, title,
    html: Object.fromEntries(langs.map(l => [l, html(blocks[l].filter(b => b.type !== 'h1'))])),
    publicHtml: meta.route ? Object.fromEntries(langs.map(l => [l, html(publicBlocks(blocks[l], meta.publicParts ?? 1))])) : null,
    bilingualHtml: bilingualHtml(blocks.me, blocks.en),
    notesHtml: notes ? html(parseBlocks(notes).filter(b => b.type !== 'h1')) : null,
  };
}

/** Every document the manifest names and whose files exist; missing ones are reported and skipped. */
function buildDocs() {
  const manifest = JSON.parse(fs.readFileSync(path.join(G, 'manifest.json'), 'utf8')).docs;
  const docs = {}; const missing = [];
  for (const [id, meta] of Object.entries(manifest)) {
    const doc = loadDoc(id, meta);
    if (doc) docs[id] = doc; else missing.push(id);
  }
  return { docs, missing, order: Object.keys(manifest) };
}
module.exports = { buildDocs, loadDoc, LANGS };
