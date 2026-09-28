#!/usr/bin/env node
/**
 * Checks that the language versions of a governance document line up block for block:
 *   node scripts/legal/check-align.js <id>            (docs/legal/governance/<id>.{me,en,ru}.md)
 *   node scripts/legal/check-align.js --all
 * Every file must start with a single "# Title", carry the same sequence of headings,
 * paragraphs, lists (same item counts) and tables (same size), contain no HTML, and
 * keep the same set of [[PLACEHOLDER: …]] marks (the description may be translated).
 * Exit code 1 lists every difference with the first block that differs.
 */
const fs = require('fs'), path = require('path');
const { parseBlocks, shape } = require('./md');
const G = path.join(__dirname, '..', '..', 'docs/legal/governance');

function check(id) {
  const langs = ['me', 'en', 'ru'].filter(l => fs.existsSync(path.join(G, `${id}.${l}.md`)));
  const problems = [];
  if (!langs.includes('me') || !langs.includes('en')) problems.push(`${id}: needs at least ${id}.me.md and ${id}.en.md`);
  const parsed = {};
  for (const l of langs) {
    const md = fs.readFileSync(path.join(G, `${id}.${l}.md`), 'utf8');
    if (/<[a-z][^>]*>/i.test(md)) problems.push(`${id}.${l}.md: contains HTML tags`);
    if (/^\s*$/.test(md)) problems.push(`${id}.${l}.md: empty`);
    const blocks = parseBlocks(md);
    if (blocks[0]?.type !== 'h1') problems.push(`${id}.${l}.md: must start with "# Title"`);
    if (blocks.filter(b => b.type === 'h1').length !== 1) problems.push(`${id}.${l}.md: exactly one "# " heading`);
    if (/^\s*\[\[PLACEHOLDER/m.test(md) === false && /PLACEHOLDER/.test(md) && !/\[\[PLACEHOLDER/.test(md)) problems.push(`${id}.${l}.md: PLACEHOLDER marks must be written [[PLACEHOLDER: …]]`);
    parsed[l] = { md, blocks, shape: shape(blocks), marks: (md.match(/\[\[PLACEHOLDER[^\]]*\]\]/g) || []).length };
  }
  const base = parsed.me;
  if (base) for (const l of langs.filter(x => x !== 'me')) {
    const other = parsed[l];
    if (other.shape.length !== base.shape.length || other.shape.some((s, i) => s !== base.shape[i])) {
      const i = other.shape.findIndex((s, k) => s !== base.shape[k]);
      const at = i < 0 ? Math.min(other.shape.length, base.shape.length) : i;
      const show = b => (b ? (b.text ?? (b.items ? b.items[0] : b.rows?.[0]?.join(' | ')) ?? '').slice(0, 70) : '(none)');
      problems.push(`${id}: me (${base.shape.length} blocks) and ${l} (${other.shape.length} blocks) differ at block ${at + 1}: me ${base.shape[at] ?? '(end)'} "${show(base.blocks[at])}" vs ${l} ${other.shape[at] ?? '(end)'} "${show(other.blocks[at])}"`);
    }
    if (other.marks !== base.marks) problems.push(`${id}: ${base.marks} placeholder marks in me, ${other.marks} in ${l}`);
  }
  return problems;
}

const args = process.argv.slice(2);
const ids = args.includes('--all')
  ? [...new Set(fs.readdirSync(G).filter(f => /\.(me|en|ru)\.md$/.test(f)).map(f => f.replace(/\.(me|en|ru)\.md$/, '')))]
  : args;
if (ids.length === 0) { console.error('usage: check-align.js <id> | --all'); process.exit(2); }
let bad = 0;
for (const id of ids) {
  const problems = check(id);
  if (problems.length) { bad++; console.log(problems.join('\n')); } else console.log(`${id}: ok (${['me', 'en', 'ru'].filter(l => fs.existsSync(path.join(G, `${id}.${l}.md`))).join(', ')})`);
}
process.exit(bad ? 1 : 0);
