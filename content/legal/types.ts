/**
 * Legal documents live here as typed TS content rather than in messages/*.json
 * (full policies would bloat every page's message bundle). Each document file
 * exports a `<key>Content: LegalContent` with the complete text in all three
 * locales. Every draft is headed by the lawyer-review banner rendered by
 * `components/LegalPage.tsx`; unknown facts are `[[PLACEHOLDER: ...]]` and are
 * logged in docs/PLACEHOLDERS.md.
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalContent = Record<"me" | "en" | "ru", LegalDoc>;
