#!/usr/bin/env node
/**
 * Renders the legal drafts in docs/legal as side-by-side bilingual Word documents:
 * A4 portrait, Montenegrin in the left column, English in the right, one row per article
 * so a reader of either language stays aligned with the other.
 *
 *   node scripts/legal/build-docx.js bilingual <draft.md> <out.docx>
 *       For drafts written with Montenegrin operative text followed by an English translation
 *       (docs/legal/governance/*.md, docs/legal/registration/statute-additions.md).
 *   node scripts/legal/build-docx.js paired <original-paragraphs.json> <translation.md> <out.docx> [--anchor clan|step|bullet|none]
 *       For the Ministry's templates: the Montenegrin original (extracted with
 *       scripts/legal/extract_docx_paragraphs.py) on the left, the English translation on the right,
 *       aligned by "Član N" / "Article N" (clan), numbered steps (step), bullet index (bullet) or as one row (none).
 *   node scripts/legal/build-docx.js plain <doc.md> <out.docx>
 *       Single-column render for documents that are already bilingual in tables (completion-guide.md).
 *
 * Needs the `docx` package: npm install --no-save docx
 */
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  AlignmentType, LevelFormat, ShadingType, BorderStyle } = require('docx');

const FONT = 'Arial';
const PAGE_W = 11906, MARGIN = 1000, CONTENT_W = PAGE_W - 2 * MARGIN;
const HALF = Math.floor(CONTENT_W / 2);
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'C9D3D7' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, insideHorizontal: BORDER, insideVertical: BORDER };
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

// ---------- inline markdown → runs ----------
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*(?=\S)[^*]+?(?<=\S)\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...base }));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT, ...base }));
    else if (tok.startsWith('`')) out.push(new TextRun({ text: tok.slice(1, -1), font: 'Courier New', ...base }));
    else out.push(new TextRun({ text: tok.slice(1, -1), italics: true, font: FONT, ...base }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, ...base }));
  return out;
}

// ---------- markdown → blocks ----------
function parseBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^#{1,3} /.test(line)) { const level = line.match(/^(#+) /)[1].length; blocks.push({ type: 'h' + level, text: line.replace(/^#+ /, '') }); i++; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      const cells = rows.filter(r => !/^\|\s*-+/.test(r)).map(r => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim()));
      blocks.push({ type: 'table', rows: cells }); continue;
    }
    if (/^- /.test(line)) { const items = []; while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; } blocks.push({ type: 'ul', items }); continue; }
    if (/^\d+\. /.test(line)) { const items = []; while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; } blocks.push({ type: 'ol', items }); continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. )/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    blocks.push({ type: 'p', text: buf.join(' ') });
  }
  return blocks;
}
function blockText(b) { return b.type === 'table' ? b.rows.flat().join(' ') : (b.items ? b.items.join(' ') : b.text); }

// ---------- language guess ----------
function lang(text) {
  const en = (text.match(/\b(the|and|of|to|with|for|is|are|or|by|not|that|this|from)\b/gi) || []).length;
  const me = (text.match(/[čćšžđČĆŠŽĐ]|\b(je|se|su|na|za|od|ili|koji|koje|koja|kada|ako|može|udruženja|udruženje|sa|do|po|u|i)\b/g) || []).length;
  return me > en ? 'me' : 'en';
}

// ---------- docx pieces ----------
let listInstance = 0;
function blockParagraphs(b, size) {
  const base = { size };
  if (b.type === 'p') return [new Paragraph({ children: runs(b.text, base), spacing: { after: 100 } })];
  if (b.type === 'ul') return b.items.map(t => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: runs(t, base), spacing: { after: 40 } }));
  if (b.type === 'ol') { listInstance++; return b.items.map(t => new Paragraph({ numbering: { reference: 'numbers', level: 0, instance: listInstance }, children: runs(t, base), spacing: { after: 40 } })); }
  if (/^h/.test(b.type)) return [headingParagraph(b)];
  return [];
}
function headingParagraph(b, text) {
  const t = text !== undefined ? text : b.text;
  const level = b.type === 'h1' ? HeadingLevel.TITLE : b.type === 'h2' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
  return new Paragraph({ heading: level, children: runs(t) });
}
function nestedTable(b, width) {
  const ncol = b.rows[0].length;
  const widths = Array(ncol).fill(Math.floor(width / ncol));
  return new Table({
    columnWidths: widths, width: { size: width, type: WidthType.DXA }, borders: BORDERS,
    rows: b.rows.map((row, ri) => new TableRow({ tableHeader: ri === 0, children: row.map((c, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 },
      shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'E3EBED', color: 'auto' } : undefined,
      children: [new Paragraph({ children: runs(c, { size: 16, bold: ri === 0 }) })] })) })),
  });
}
function cell(children, width, opts = {}) {
  return new TableCell({ width: { size: width, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 100, right: 100 },
    columnSpan: opts.span, shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: 'auto' } : undefined,
    children: children.length ? children : [new Paragraph({ children: [] })] });
}
function twoColRow(left, right, size) {
  const l = left.flatMap(b => blockParagraphs(b, size)), r = right.flatMap(b => blockParagraphs(b, size));
  if (!l.length && !r.length) return null;
  if (!l.length) return new TableRow({ children: [cell(r, CONTENT_W, { span: 2 })] });
  if (!r.length) return new TableRow({ children: [cell(l, CONTENT_W, { span: 2 })] });
  return new TableRow({ children: [cell(l, HALF), cell(r, HALF)] });
}
function headingRow(leftText, rightText, kind) {
  const fill = kind === 'h2' ? 'E3EBED' : kind === 'h1' ? 'D4E1E5' : 'F1F5F6';
  const size = kind === 'h1' ? 26 : kind === 'h2' ? 22 : 20;
  const mk = t => [new Paragraph({ children: [new TextRun({ text: t, bold: true, size, font: FONT, color: '0E3A46' })] })];
  if (!rightText) return new TableRow({ children: [cell(mk(leftText), CONTENT_W, { span: 2, fill })] });
  return new TableRow({ children: [cell(mk(leftText), HALF, { fill }), cell(mk(rightText), HALF, { fill })] });
}
function fullRow(children) { return new TableRow({ children: [cell(children, CONTENT_W, { span: 2 })] }); }
function splitHeading(text) {
  const idx = text.indexOf(' / ');
  if (idx > 0) {
    const a = text.slice(0, idx).trim(), b = text.slice(idx + 3).trim();
    return lang(a) === 'en' && lang(b) === 'me' ? [b, a] : [a, b]; // Montenegrin always left
  }
  return lang(text) === 'me' ? [text, ''] : ['', text];
}

function buildDoc(rows, title, columnHeader) {
  const table = new Table({ columnWidths: [HALF, HALF], width: { size: CONTENT_W, type: WidthType.DXA }, borders: BORDERS, rows });
  const head = columnHeader ? [new TableRow({ tableHeader: true, children: [
    cell([new Paragraph({ children: [new TextRun({ text: columnHeader[0], bold: true, size: 18, font: FONT, color: '36434B' })] })], HALF, { fill: 'F6F3EE' }),
    cell([new Paragraph({ children: [new TextRun({ text: columnHeader[1], bold: true, size: 18, font: FONT, color: '36434B' })] })], HALF, { fill: 'F6F3EE' }) ] })] : [];
  const tableWithHead = new Table({ columnWidths: [HALF, HALF], width: { size: CONTENT_W, type: WidthType.DXA }, borders: BORDERS, rows: [...head, ...rows] });
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 19 } } }, paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 30, bold: true, font: FONT, color: '0E3A46' }, paragraph: { spacing: { after: 200 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: FONT, color: '0E3A46' }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 20, bold: true, font: FONT }, paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 1 } } ] },
    numbering: { config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 200 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 280 } } } }] } ] },
    sections: [{ properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children: [ new Paragraph({ heading: HeadingLevel.TITLE, children: runs(title) }), tableWithHead ] }],
  });
}

// ---------- mode: bilingual (interleaved ME/EN source) ----------
function bilingualRows(blocks) {
  const rows = [];
  let left = [], right = [], sawH2 = false;
  const flush = () => { const r = twoColRow(left, right, 18); if (r) rows.push(r); left = []; right = []; };
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k];
    if (b.type === 'h1') continue; // title rendered above the table
    if (b.type === 'h2' || b.type === 'h3') {
      flush(); if (b.type === 'h2') sawH2 = true;
      let [l, r] = splitHeading(b.text);
      if (b.type === 'h3' && !r) { // look ahead for the English "*Article N. Title.*" lead-in
        for (let j = k + 1; j < blocks.length && !/^h/.test(blocks[j].type); j++) {
          const m = blocks[j].type === 'p' && blocks[j].text.match(/^\*(Article [^*]+?)\*/); if (m) { r = m[1]; break; }
          const m2 = blocks[j].type === 'p' && blocks[j].text.match(/^\*((?:Part|Step|Annex|B\.\d|C\.\d)[^*]*?)\*/); if (m2) { r = m2[1]; break; }
        }
      }
      rows.push(headingRow(l || r, l ? r : '', b.type)); continue;
    }
    if (b.type === 'table') { flush(); rows.push(fullRow([nestedTable(b, CONTENT_W - 200)])); continue; }
    if (!sawH2) { // editorial preamble, English: full width, small grey
      rows.push(fullRow([new Paragraph({ children: runs(b.text || blockText(b), { size: 16, color: '5A6A72' }), spacing: { after: 80 } })])); continue;
    }
    const isEn = lang(blockText(b)) === 'en';
    if (isEn) right.push(b); else { if (right.length) flush(); left.push(b); }
  }
  flush();
  return rows;
}

// ---------- mode: paired (original ME paragraphs + EN translation) ----------
function segment(items, isAnchor) {
  const segs = [[]];
  items.forEach(it => { if (isAnchor(it) && segs[segs.length - 1].length) segs.push([]); segs[segs.length - 1].push(it); });
  return segs;
}
function pairedRows(orig, blocks, anchor) {
  const meBlocks = orig.map(p => ({ type: p.list ? 'ul' : 'p', items: p.list ? [p.text] : undefined, text: p.list ? undefined : p.text, raw: p }));
  const enBlocks = blocks.filter(b => b.type !== 'h1');
  let meSegs, enSegs;
  if (anchor === 'clan') {
    meSegs = segment(meBlocks, b => /^Član\s+\d+/.test(b.text || ''));
    enSegs = segment(enBlocks, b => b.type === 'h3' && /^Article\s+\d+/.test(b.text));
  } else if (anchor === 'step') {
    meSegs = segment(meBlocks, b => /^\d$/.test(b.text || ''));
    enSegs = segment(enBlocks, b => b.type === 'h2' && /^\d\./.test(b.text));
  } else if (anchor === 'bullet') {
    meSegs = segment(meBlocks, b => b.type === 'ul');
    const flatEn = [];
    enBlocks.forEach(b => { if (b.type === 'ul') b.items.forEach(t => flatEn.push({ type: 'ul', items: [t], anchor: true })); else flatEn.push(b); });
    enSegs = segment(flatEn, b => b.anchor);
  } else { meSegs = [meBlocks]; enSegs = [enBlocks]; }
  if (meSegs.length !== enSegs.length) {
    console.error(`  alignment mismatch (${meSegs.length} ME vs ${enSegs.length} EN segments); falling back to one row`);
    meSegs = [meBlocks]; enSegs = [enBlocks];
  }
  const isCaps = b => b.type === 'p' && /^[A-ZČĆŠŽĐ ,()\/-]{6,}$/.test(b.text || '');
  const isClan = b => b.type === 'p' && /^Član\s+\d+$/.test(b.text || '');
  // A Montenegrin chapter heading at the end of a segment belongs to the next segment, where its English twin sits.
  for (let s = 0; s < meSegs.length - 1; s++) { while (meSegs[s].length > 1 && isCaps(meSegs[s][meSegs[s].length - 1])) meSegs[s + 1].unshift(meSegs[s].pop()); }
  const rows = [];
  for (let s = 0; s < meSegs.length; s++) {
    const en = enSegs[s], me = [...meSegs[s]];
    const heads = en.filter(b => b.type === 'h2' || b.type === 'h3'), body = en.filter(b => !/^h/.test(b.type));
    const meCaps = []; while (me.length && isCaps(me[0])) meCaps.push(me.shift().text);
    let meClan = ''; const ci = me.findIndex(isClan); if (ci >= 0) meClan = me.splice(ci, 1)[0].text;
    heads.forEach(h => {
      if (h.type === 'h3' && /^Article\s+\d+/.test(h.text)) rows.push(headingRow(meClan || h.text, meClan ? h.text : '', 'h3'));
      else { const l = meCaps.length ? meCaps.shift() : ''; rows.push(headingRow(l || h.text, l ? h.text : '', 'h2')); }
    });
    meCaps.forEach(t => rows.push(headingRow(t, '', 'h2')));
    const r = twoColRow(me, body, 18); if (r) rows.push(r);
  }
  return rows;
}

// ---------- mode: plain ----------
function plainDoc(blocks, title) {
  const children = [];
  blocks.forEach(b => { if (b.type === 'h1') return; if (b.type === 'table') { children.push(nestedTable(b, CONTENT_W)); children.push(new Paragraph({ children: [] })); } else children.push(...blockParagraphs(b, 19)); });
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 19 } } }, paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 30, bold: true, font: FONT, color: '0E3A46' }, paragraph: { spacing: { after: 200 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: FONT, color: '0E3A46' }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 20, bold: true, font: FONT }, paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 1 } } ] },
    numbering: { config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] } ] },
    sections: [{ properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children: [new Paragraph({ heading: HeadingLevel.TITLE, children: runs(title) }), ...children] }],
  });
}

// ---------- main ----------
(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const titleOf = blocks => { const h = blocks.find(b => b.type === 'h1'); return h ? h.text : 'Document'; };
  let doc, out;
  if (mode === 'bilingual') {
    const [md, o] = args; out = o; const blocks = parseBlocks(fs.readFileSync(md, 'utf8'));
    doc = buildDoc(bilingualRows(blocks), titleOf(blocks), ['Crnogorski (mjerodavan tekst)', 'English (translation)']);
  } else if (mode === 'paired') {
    const [json, md, o] = args; out = o; const anchor = (args.indexOf('--anchor') >= 0) ? args[args.indexOf('--anchor') + 1] : 'none';
    const blocks = parseBlocks(fs.readFileSync(md, 'utf8')); const orig = JSON.parse(fs.readFileSync(json, 'utf8'));
    doc = buildDoc(pairedRows(orig, blocks, anchor), titleOf(blocks), ['Crnogorski (original obrasca)', 'English (translation)']);
  } else if (mode === 'plain') {
    const [md, o] = args; out = o; const blocks = parseBlocks(fs.readFileSync(md, 'utf8')); doc = plainDoc(blocks, titleOf(blocks));
  } else { console.error('usage: build-docx.js bilingual|paired|plain ...'); process.exit(2); }
  fs.writeFileSync(out, await Packer.toBuffer(doc)); console.log('wrote', out);
})();
