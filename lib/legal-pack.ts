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

import { z } from "zod";

/** The languages the pack can be read and completed in. The templates exist in the first two; the others are translated on demand and cached. */
export const PACK_LANGS = ["me", "en", "ru", "tr"] as const;
export type PackLang = (typeof PACK_LANGS)[number];
export type SourceLang = "me" | "en";
export type Bilingual = Record<SourceLang, string>;
export const LANG_LABELS: Record<PackLang, string> = { me: "Crnogorski", en: "English", ru: "Русский", tr: "Türkçe" };
export const isSourceLang = (lang: PackLang): lang is SourceLang => lang === "me" || lang === "en";

export interface PackField {
  label: Bilingual;
  value: Bilingual;
  /** What the blank is for and how to fill it, shown in the Complete panel. */
  hint?: Bilingual;
  /** Same value in both languages (names, numbers, dates): copied, never translated. */
  neutral?: boolean;
  /** Exists in the Montenegrin text only (grammatical forms). */
  meOnly?: boolean;
  /** Several lines: rendered as a block. */
  block?: boolean;
  /** May stay empty (founders beyond the legal minimum): a list or signature row of only empty optional fields does not print. */
  optional?: boolean;
  /** A person blank that may follow a founder: the id of its link field, and which founder part it mirrors. */
  link?: string;
  part?: "name" | "jmb" | "addr";
  /** A link field: holds "f1" to "f5" (which founder a person blank follows) or "". Never rendered. */
  isLink?: boolean;
  /** The section of the Complete panel the blank belongs to (a key of LegalPack.groups). */
  group?: string;
}

export type PackBlock =
  /** meOnly: the text exists in Montenegrin only (the English side of a merged article is a summary on its first paragraph). */
  | { type: "p" | "h" | "h2" | "h3"; me: string; en: string; meOnly?: boolean }
  | { type: "list"; me: string[]; en: string[]; meOnly?: boolean }
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

/** A translation of one document's texts into one language, keyed by text path. */
export type DocTexts = Record<string, string>;

export interface LegalPack {
  fields: Record<string, PackField>;
  /** The sections of the Complete panel, by key. */
  groups?: Record<string, Bilingual>;
  forms: PackForm[];
  drafts: PackDraft[];
  /** The founders' guide: read-only, English, shown in both languages. */
  guide?: { title: Bilingual; file: string; html: string };
  builtAt: string;
}

/** A field's saved state: a value per language, and which languages are out of date since the last edit. */
export interface FieldState {
  me: string;
  en: string;
  ru: string;
  tr: string;
  stale: PackLang[];
}

/** The same value in every language, nothing stale. */
export function sameEverywhere(value: string): FieldState {
  return { me: value, en: value, ru: value, tr: value, stale: [] };
}

/** A saved field state in today's shape, whatever shape it was saved in (an older row had two languages and one stale side). */
export function normalizeFieldState(raw: unknown, meta: PackField | undefined, base: FieldState): FieldState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const me = str(r.me, base.me);
  const en = str(r.en, base.en);
  const stale = new Set<PackLang>(Array.isArray(r.stale) ? r.stale.filter((l): l is PackLang => (PACK_LANGS as readonly string[]).includes(l as string)) : typeof r.stale === "string" && (PACK_LANGS as readonly string[]).includes(r.stale) ? [r.stale as PackLang] : []);
  const extra = (lang: "ru" | "tr") => {
    if (typeof r[lang] === "string") return r[lang] as string;
    if (meta?.neutral) return me;
    stale.add(lang);
    return "";
  };
  return { me, en, ru: extra("ru"), tr: extra("tr"), stale: [...stale] };
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

export const FOUNDER_IDS = ["f1", "f2", "f3", "f4", "f5"] as const;

/**
 * The values as shown: a person blank that follows a founder shows that
 * founder's name, JMB or address. The raw map (what is saved) is left as
 * it is; every render, print and completeness check uses this one.
 */
export function resolveFields(pack: LegalPack, fields: Record<string, FieldState>): Record<string, FieldState> {
  const out = { ...fields };
  for (const [id, meta] of Object.entries(pack.fields)) {
    if (!meta.link || !meta.part) continue;
    const founder = fields[meta.link]?.me;
    if (!founder || !(FOUNDER_IDS as readonly string[]).includes(founder)) continue;
    const source = fields[`${founder}_${meta.part}`];
    if (source) out[id] = { ...source, stale: [] };
  }
  return out;
}

/** A blank still to be completed: empty, or left at its bracketed placeholder. */
export function isIncomplete(value: string): boolean {
  return value.trim() === "" || /^\s*\[/.test(value);
}

/** An optional blank that may stay empty: an unnamed founder's parts. Once the founder is named, their JMB and address are needed. */
export function isOptionalEmpty(id: string, fields: Record<string, FieldState>, meta: Record<string, PackField>, lang: PackLang): boolean {
  const m = meta[id];
  const f = fields[id];
  if (!m?.optional || !f || f[lang].trim() !== "") return false;
  const group = id.match(/^(f[1-5])_(jmb|addr)$/);
  if (group && (fields[`${group[1]}_name`]?.[lang] ?? "").trim() !== "") return false;
  return true;
}

/** Every blank a form uses, in document order. */
export function formFieldIds(form: PackForm, lang: PackLang): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (template: string) => { for (const id of placeholderIds(template)) if (!seen.has(id)) { seen.add(id); out.push(id); } };
  const src: SourceLang = lang === "me" ? "me" : "en";
  for (const block of form.blocks) {
    if (block.type === "list") block[src].forEach(visit);
    else if (block.type === "sigrow") block.items.forEach((item) => visit(item[src] || item.me));
    else visit(block[src] || block.me);
  }
  return out;
}

/** The ids of the blanks a form still needs in the given language, in document order. */
export function incompleteFields(form: PackForm, lang: PackLang, fields: Record<string, FieldState>, meta: Record<string, PackField>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (template: string) => {
    for (const id of placeholderIds(template)) {
      if (seen.has(id)) continue;
      seen.add(id);
      const m = meta[id];
      const f = fields[id];
      if (!m || !f) continue;
      if (m.meOnly && lang === "en") continue;
      if (isOptionalEmpty(id, fields, meta, lang)) continue;
      if (isIncomplete(f[lang])) out.push(id);
    }
  };
  const src: SourceLang = lang === "me" ? "me" : "en";
  for (const block of form.blocks) {
    if (block.type === "list") block[src].forEach(visit);
    else if (block.type === "sigrow") block.items.forEach((item) => visit(item[src] || item.me));
    else visit(block[src] || block.me);
  }
  return out;
}

/** True when a template's blanks are all optional and all empty: the item is left out of the printed page. */
export function isEmptyOptional(template: string, fields: Record<string, FieldState>, meta: Record<string, PackField>): boolean {
  const ids = placeholderIds(template);
  return ids.length > 0 && ids.every((id) => meta[id]?.optional && !PACK_LANGS.some((l) => fields[id]?.[l].trim()));
}

/** The initial field state: the pack's recommended values; the other languages wait for a translation, except where the value is the same everywhere. */
export function initialFields(pack: LegalPack): Record<string, FieldState> {
  return Object.fromEntries(Object.entries(pack.fields).map(([id, f]) => [id, f.neutral
    ? { me: f.value.me, en: f.value.en, ru: f.value.me, tr: f.value.me, stale: [] }
    : { me: f.value.me, en: f.value.en, ru: "", tr: "", stale: f.meOnly ? [] : ["ru", "tr"] }]));
}

export const FORM_KEY = /^form:([0-9]{2}[a-z]?)$/;
export const DRAFT_KEY = /^draft:([a-z0-9-]{1,60})$/;
export const I18N_KEY = /^i18n:(labels|guide|form:[0-9]{2}|draft:[a-z0-9-]{1,60}):(ru|tr)$/;

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

/**
 * What the save action accepts: one part of the pack, its value shaped for
 * that part, every id checked against the pack. Plain union: a regex key
 * cannot be a zod discriminator (zod 4 throws at module load).
 */
export function savePackSchema(pack: LegalPack) {
  const fieldIds = new Set(Object.keys(pack.fields));
  const checkIds = new Set(pack.forms.flatMap((f) => f.blocks.flatMap((b) => (b.type === "check" ? [b.id] : []))));
  const draftIds = new Set(pack.drafts.map((d) => d.id));
  const formIds = new Set(pack.forms.map((f) => f.id));
  const text = z.string().max(20_000);
  const fieldState = z.object({ me: text, en: text, ru: text, tr: text, stale: z.array(z.enum(PACK_LANGS)).max(4) });
  const bilingual = z.object({ me: text, en: text });
  const block = z.union([
    z.object({ type: z.enum(["p", "h", "h2", "h3"]), me: text, en: text, meOnly: z.boolean().optional() }),
    z.object({ type: z.literal("list"), me: z.array(text).max(200), en: z.array(text).max(200), meOnly: z.boolean().optional() }),
    z.object({ type: z.literal("check"), id: z.string().regex(/^s\d_\d{1,3}$/).refine((id) => checkIds.has(id)), me: text, en: text }),
    z.object({ type: z.literal("sigrow"), items: z.array(z.object({ me: text, en: text, lbl: bilingual })).max(20) }),
  ]);
  return z.union([
    // The edited text of one form (every block, both languages), or null to return to the template.
    z.object({ key: z.string().regex(FORM_KEY).refine((k) => formIds.has(k.slice("form:".length))), value: z.object({ blocks: z.array(block).max(1_000).nullable() }).refine((v) => v.blocks === null || (JSON.stringify(v.blocks).length <= 800_000 && v.blocks.every((b) => templatesOf(b as PackBlock).every((tpl) => [...placeholderIds(tpl.me), ...placeholderIds(tpl.en)].every((id) => fieldIds.has(id)))))) }),
    z.object({ key: z.literal("fields"), value: z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), fieldState).refine((v) => Object.keys(v).every((id) => fieldIds.has(id))) }),
    z.object({ key: z.literal("checks"), value: z.record(z.string().regex(/^s\d_\d{1,3}$/), z.boolean()).refine((v) => Object.keys(v).every((id) => checkIds.has(id))) }),
    z.object({ key: z.string().regex(DRAFT_KEY).refine((k) => draftIds.has(k.slice("draft:".length))), value: z.object({ html: z.string().max(400_000) }) }),
    // A cached translation of one document into one language, keyed by text path.
    z.object({ key: z.string().regex(I18N_KEY).refine((k) => { const m = k.match(I18N_KEY); if (!m) return false; return m[1] === "labels" || m[1] === "guide" || (m[1].startsWith("form:") && formIds.has(m[1].slice(5))) || (m[1].startsWith("draft:") && draftIds.has(m[1].slice(6))); }), value: z.record(z.string().regex(/^[a-z0-9_:.-]{1,60}$/), z.string().max(60_000)).refine((v) => JSON.stringify(v).length <= 600_000) }),
  ]);
}

/** Split HTML into its top-level elements (a draft is a flat list of them). */
export function splitTopLevel(html: string): string[] {
  const parts: string[] = [];
  const VOID = new Set(["br", "hr", "img", "input", "wbr"]);
  let depth = 0;
  let start = -1;
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  for (const m of html.matchAll(re)) {
    const name = m[1].toLowerCase();
    const closing = m[0].startsWith("</");
    const selfClosing = VOID.has(name) || m[0].endsWith("/>");
    if (!closing) {
      if (depth === 0) start = m.index;
      if (!selfClosing) depth++;
      if (selfClosing && depth === 0) { parts.push(m[0]); start = -1; }
    } else {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && start >= 0) { parts.push(html.slice(start, m.index + m[0].length)); start = -1; }
    }
  }
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** A short hash of a document's source texts: a cached translation whose hash differs was made from an older template. */
export function docHash(texts: DocTexts): string {
  let h = 5381;
  for (const [k, v] of Object.entries(texts).sort(([a], [b]) => (a < b ? -1 : 1))) {
    for (const ch of `${k}=${v};`) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  }
  return h.toString(36);
}

/** The key under which a document's translation is cached. */
export const i18nKey = (docKey: string, lang: PackLang) => `i18n:${docKey}:${lang}`;

/**
 * The texts of one document in a source language, keyed by path, as sent
 * for translation: a form's title, subtitle, note and every block; a
 * draft's top-level elements that carry English (the Montenegrin twins
 * are left out); the labels and hints of every blank plus every title.
 */
export function docTexts(pack: LegalPack, docKey: string, draftHtml?: string, formBlocks?: PackBlock[]): DocTexts {
  const out: DocTexts = {};
  if (docKey === "labels") {
    for (const [id, f] of Object.entries(pack.fields)) {
      if (f.isLink) continue;
      if (f.label.en) out[`f:${id}`] = f.label.en;
      if (f.hint?.en) out[`f:${id}.h`] = f.hint.en;
    }
    for (const [key, g] of Object.entries(pack.groups ?? {})) out[`g:${key}`] = g.en;
    for (const f of pack.forms) out[`form:${f.id}.t`] = f.title.en;
    for (const d of pack.drafts) out[`draft:${d.id}.t`] = d.title.en;
    if (pack.guide) out["guide.t"] = pack.guide.title.en;
    return out;
  }
  if (docKey.startsWith("form:")) {
    const form = pack.forms.find((f) => f.id === docKey.slice(5));
    if (!form) return out;
    out.t = form.title.en; out.s = form.subtitle.en; out.n = form.note.en;
    (formBlocks ?? form.blocks).forEach((b, i) => {
      if (b.type === "list") b.en.forEach((item, j) => { out[`b${i}.${j}`] = item; });
      else if (b.type === "sigrow") b.items.forEach((item, j) => { out[`b${i}.s${j}`] = item.en || item.me; out[`b${i}.s${j}.l`] = item.lbl.en || item.lbl.me; });
      else out[`b${i}`] = b.en || b.me;
    });
    return out;
  }
  const html = docKey === "guide" ? pack.guide?.html : draftHtml ?? pack.drafts.find((d) => `draft:${d.id}` === docKey)?.html;
  if (!html) return out;
  splitTopLevel(html).forEach((part, i) => {
    // A draft paragraph without the "en" class is the Montenegrin twin of the English one after it: not translated again.
    if (docKey !== "guide" && /^<p(?![^>]*class="[^"]*\ben\b)/.test(part)) return;
    out[`e${i}`] = part;
  });
  return out;
}

/** A translated template is used only if it kept every blank of the original. */
export function keepsPlaceholders(source: string, translated: string): boolean {
  const a = placeholderIds(source).sort().join(",");
  const b = placeholderIds(translated).sort().join(",");
  return a === b && (source.match(/\{\{sig\}\}/g) ?? []).length === (translated.match(/\{\{sig\}\}/g) ?? []).length;
}

/** The text of an edited block keeps <b>, </b> and <br> (the tags the templates use) and loses every other tag. */
export function sanitizeBlockText(text: string): string {
  return text.replace(/<(?!\/?b>|br\s*\/?>)[^>]*>/gi, "");
}

/** A form's blocks with every text passed through sanitizeBlockText. */
export function sanitizeBlocks(blocks: PackBlock[]): PackBlock[] {
  return blocks.map((b) => {
    if (b.type === "list") return { ...b, me: b.me.map(sanitizeBlockText), en: b.en.map(sanitizeBlockText) };
    if (b.type === "sigrow") return { ...b, items: b.items.map((item) => ({ ...item, me: sanitizeBlockText(item.me), en: sanitizeBlockText(item.en) })) };
    return { ...b, me: sanitizeBlockText(b.me), en: sanitizeBlockText(b.en) };
  });
}
