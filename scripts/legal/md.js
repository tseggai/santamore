// Shared Markdown helpers for the legal build scripts: a small block parser for the
// subset the drafts use (headings, paragraphs, bullet and numbered lists, pipe tables),
// inline bold/italic/code, and HTML rendering.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
function blockHtml(b, cls) {
  const c = cls ? ` class="${cls}"` : '';
  if (b.type === 'p') return `<p${c}>${inline(b.text)}</p>`;
  if (b.type === 'h1') return `<h1${c}>${inline(b.text)}</h1>`;
  if (b.type === 'h2') return `<h2${c}>${inline(b.text)}</h2>`;
  if (b.type === 'h3') return `<h3${c}>${inline(b.text)}</h3>`;
  if (b.type === 'ul') return `<ul${c}>${b.items.map(t => `<li>${inline(t)}</li>`).join('')}</ul>`;
  if (b.type === 'ol') return `<ol${c}>${b.items.map(t => `<li>${inline(t)}</li>`).join('')}</ol>`;
  if (b.type === 'table') return `<div class="tablewrap${cls ? ' ' + cls : ''}"><table>${b.rows.map((r, i) => `<tr>${r.map(x => i ? `<td>${inline(x)}</td>` : `<th>${inline(x)}</th>`).join('')}</tr>`).join('')}</table></div>`;
  return '';
}
/** The shape of a block list, for comparing translations: type and size of every block. */
function shape(blocks) {
  return blocks.map(b => b.type === 'table' ? `table:${b.rows.length}x${b.rows[0]?.length ?? 0}` : b.items ? `${b.type}:${b.items.length}` : b.type);
}
module.exports = { esc, parseBlocks, strip, inline, blockHtml, shape };
