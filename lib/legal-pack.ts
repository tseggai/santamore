/**
 * The legal pack: the five Ministry registration forms and the policy
 * drafts, built from docs/legal by scripts/legal/build-pack.js into
 * content/legal-pack/pack.json, completed by staff in the console.
 *
 * A form is a list of blocks whose text is a template in each language;
 * `{{id}}` marks a blank shared by every form (the association's name,
 * a founder's address), `{{sig}}` a signature line left empty on paper.
 * Field values are kept in both languages; editing one side marks the
 * other stale until it is translated again.
 */

export type PackLang = "me" | "en";
export type Bilingual = Record<PackLang, string>;

export interface PackField {
  label: Bilingual;
  value: Bilingual;
  /** Same value in both languages (names, numbers, dates): copied, never translated. */
  neutral?: boolean;
  /** Exists in the Montenegrin text only (grammatical forms). */
  meOnly?: boolean;
  /** Several lines: rendered as a block. */
  block?: boolean;
  /** May stay empty (founders beyond the legal minimum): a list or signature row of only empty optional fields does not print. */
  optional?: boolean;
}

export type PackBlock =
  | { type: "p" | "h" | "h2" | "h3"; me: string; en: string }
  | { type: "list"; me: string[]; en: string[] }
  | { type: "check"; id: string; me: string; en: string }
  | { type: "sigrow"; items: { me: string; en: string; lbl: Bilingual }[] };

export interface PackForm {
  id: string;
  title: Bilingual;
  subtitle: Bilingual;
  file: string;
  note: Bilingual;
  blocks: PackBlock[];
}

export interface PackDraft {
  id: string;
  title: Bilingual;
  file: string;
  html: string;
}

export interface LegalPack {
  fields: Record<string, PackField>;
  forms: PackForm[];
  drafts: PackDraft[];
  /** The founders' guide: read-only, English, shown in both languages. */
  guide?: { title: Bilingual; file: string; html: string };
  builtAt: string;
}

/** A field's saved state: both languages, and which side is out of date. */
export interface FieldState {
  me: string;
  en: string;
  stale: PackLang | null;
}

export type Segment =
  | { type: "text"; text: string }
  | { type: "field"; id: string }
  | { type: "sig" };

const TOKEN = /\{\{(sig|[a-z0-9_]+)\}\}/g;

/** Split a template into text, blanks and signature lines. */
export function segments(template: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(TOKEN)) {
    if (m.index > last) out.push({ type: "text", text: template.slice(last, m.index) });
    out.push(m[1] === "sig" ? { type: "sig" } : { type: "field", id: m[1] });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ type: "text", text: template.slice(last) });
  return out;
}

/** The field ids a template refers to. */
export function placeholderIds(template: string): string[] {
  return [...new Set([...template.matchAll(TOKEN)].map((m) => m[1]).filter((id) => id !== "sig"))];
}

function templatesOf(block: PackBlock): Bilingual[] {
  switch (block.type) {
    case "list":
      return [{ me: block.me.join("\n"), en: block.en.join("\n") }];
    case "sigrow":
      return block.items.map((item) => ({ me: item.me, en: item.en }));
    default:
      return [{ me: block.me, en: block.en }];
  }
}

/**
 * What is wrong with a pack: an undefined blank, or a blank the two
 * languages do not share (a Montenegrin-only field may be missing from
 * the English). Empty when the pack is sound.
 */
export function packProblems(pack: LegalPack): string[] {
  const problems: string[] = [];
  for (const form of pack.forms) {
    form.blocks.forEach((block, i) => {
      for (const tpl of templatesOf(block)) {
        const me = placeholderIds(tpl.me);
        const en = placeholderIds(tpl.en);
        for (const id of [...me, ...en]) if (!pack.fields[id]) problems.push(`${form.id}#${i}: undefined field ${id}`);
        const meOnly = me.filter((id) => !en.includes(id) && !pack.fields[id]?.meOnly);
        const enOnly = en.filter((id) => !me.includes(id));
        if (meOnly.length || enOnly.length) problems.push(`${form.id}#${i}: fields differ between languages (me: ${meOnly.join(",") || "-"}; en: ${enOnly.join(",") || "-"})`);
      }
    });
  }
  return problems;
}

/** True when a template's blanks are all optional and all empty: the item is left out of the printed page. */
export function isEmptyOptional(template: string, fields: Record<string, FieldState>, meta: Record<string, PackField>): boolean {
  const ids = placeholderIds(template);
  return ids.length > 0 && ids.every((id) => meta[id]?.optional && !(fields[id]?.me.trim() || fields[id]?.en.trim()));
}

/** The initial field state: the pack's recommended values, nothing stale. */
export function initialFields(pack: LegalPack): Record<string, FieldState> {
  return Object.fromEntries(Object.entries(pack.fields).map(([id, f]) => [id, { me: f.value.me, en: f.value.en, stale: null }]));
}

export const DRAFT_KEY = /^draft:([a-z0-9-]{1,60})$/;

// A draft is edited as HTML in the browser and shown again to other staff,
// so what is stored is reduced to the markup the drafts are written in:
// no scripts, no handlers, no styles, no links to anything but the web.
const ALLOWED_TAGS = new Set(["p", "b", "i", "u", "em", "strong", "s", "code", "br", "h2", "h3", "h4", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "div", "span", "a", "sub", "sup", "blockquote"]);
const ALLOWED_CLASSES = new Set(["en", "tablewrap"]);

/** Reduce draft HTML to the allowed markup; returns null for markup that cannot be made safe. */
export function sanitizeDraftHtml(html: string): string | null {
  if (/<!\[CDATA\[|<\?/.test(html)) return null;
  const out = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (whole, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      if (whole.startsWith("</")) return `</${name}>`;
      const attrs: string[] = [];
      for (const m of rawAttrs.matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
        const key = m[1].toLowerCase();
        const value = (m[2] ?? m[3] ?? m[4] ?? "").trim();
        if (key === "class") {
          const classes = value.split(/\s+/).filter((c) => ALLOWED_CLASSES.has(c));
          if (classes.length) attrs.push(`class="${classes.join(" ")}"`);
        } else if ((key === "colspan" || key === "rowspan") && /^\d{1,2}$/.test(value)) {
          attrs.push(`${key}="${value}"`);
        } else if (key === "href" && name === "a" && /^(https?:\/\/|mailto:)/i.test(value)) {
          attrs.push(`href="${value.replace(/"/g, "&quot;")}" rel="noopener noreferrer"`);
        }
      }
      return `<${name}${attrs.length ? " " + attrs.join(" ") : ""}${name === "br" ? " /" : ""}>`;
    });
  if (/<\s*(script|style|iframe|object|embed|form|input|link|meta)\b/i.test(out) || /\son[a-z]+\s*=/i.test(out) || /javascript:/i.test(out)) return null;
  return out;
}
