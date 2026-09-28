import docsJson from "@/content/legal/docs.json";
import type { Locale } from "@/i18n/routing";

/**
 * The governance documents, built from docs/legal/governance/<id>.<lang>.md by
 * scripts/legal/build-legal-docs.js. The site's legal pages show a document's
 * public part(s); the console's Rules section shows whole documents to staff,
 * Montenegrin and English side by side, with the working notes.
 */
export type LegalDocCategory = "public" | "board" | "template";
export type LegalDocLang = "me" | "en" | "ru";

export interface LegalDocEntry {
  id: string;
  category: LegalDocCategory;
  /** The site route the public part is published on, or null for internal documents. */
  route: string | null;
  langs: LegalDocLang[];
  title: Partial<Record<LegalDocLang, string>>;
  html: Partial<Record<LegalDocLang, string>>;
  publicHtml: Partial<Record<LegalDocLang, string>> | null;
  bilingualHtml: string;
  /** The bilingual HTML with every [[PLACEHOLDER]] marked, for the Rules section. */
  rulesHtml: string;
  notesHtml: string | null;
}

const data = docsJson as unknown as { builtAt: string; order: string[]; docs: Record<string, LegalDocEntry> };

export const LEGAL_DOC_IDS: string[] = data.order.filter((id) => id in data.docs);

export function legalDoc(id: string): LegalDocEntry | null {
  return data.docs[id] ?? null;
}

/** The language a document is read in: the locale itself, or English where a translation is missing. */
export function legalDocLang(doc: LegalDocEntry, locale: Locale): LegalDocLang {
  return doc.langs.includes(locale) ? locale : "en";
}

/** The public part of a document for the site, in the locale or English. */
export function publicLegalDoc(id: string, locale: Locale): { title: string; html: string } | null {
  const doc = legalDoc(id);
  if (!doc?.publicHtml) return null;
  const lang = legalDocLang(doc, locale);
  return { title: doc.title[lang] ?? doc.title.en ?? id, html: doc.publicHtml[lang] ?? doc.publicHtml.en ?? "" };
}

export function legalDocsByCategory(category: LegalDocCategory): LegalDocEntry[] {
  return LEGAL_DOC_IDS.map((id) => data.docs[id]).filter((doc) => doc.category === category);
}
