// Pages as a list of sections. Each section has a structure (one of a few
// shapes the site already uses), text in each language, and any assets
// attached to it: people from the team records, supporters, beneficiaries.
// The shipped copy of a page converts into sections, so the editor starts
// from what is on the site today.

import { z } from "zod";

import type { AboutContent } from "@/content/site/about";
import type { HowContent } from "@/content/site/how";
import { EMPTY_IDS, EMPTY_PEOPLE, TEAM_KINDS, type IdPick, type PeoplePick } from "@/lib/site-pages";
import type { Locale } from "@/i18n/routing";

export const SECTION_TYPES = ["hero", "prose", "cards", "figures", "list", "callout", "note"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

/** How a text field is typed: one line, a paragraph, one entry per line, records with " · " parts. */
export type TextKind = "text" | "long" | "lines" | "records";

export interface TextFieldSpec {
  key: string;
  kind: TextKind;
  parts?: string[];
}

/** The text fields each structure carries. Records keep their part order. */
export const SECTION_FIELDS: Record<SectionType, TextFieldSpec[]> = {
  hero: [
    { key: "eyebrow", kind: "text" },
    { key: "title", kind: "text" },
    { key: "lead", kind: "long" },
  ],
  prose: [
    { key: "heading", kind: "text" },
    { key: "lead", kind: "long" },
    { key: "paragraphs", kind: "lines" },
    { key: "buttonLabel", kind: "text" },
  ],
  cards: [
    { key: "heading", kind: "text" },
    { key: "lead", kind: "long" },
    { key: "items", kind: "records", parts: ["kicker", "title", "text"] },
    { key: "note", kind: "long" },
  ],
  figures: [
    { key: "heading", kind: "text" },
    { key: "lead", kind: "long" },
    { key: "items", kind: "records", parts: ["figure", "label"] },
  ],
  list: [
    { key: "heading", kind: "text" },
    { key: "lead", kind: "long" },
    { key: "items", kind: "records", parts: ["title", "text"] },
    { key: "buttonLabel", kind: "text" },
  ],
  callout: [
    { key: "heading", kind: "text" },
    { key: "paragraphs", kind: "lines" },
    { key: "buttonLabel", kind: "text" },
  ],
  note: [{ key: "text", kind: "long" }],
};

/** Assets a section can carry, rendered under its text. */
export interface SectionAssets {
  people?: PeoplePick;
  /** cards: photo, title and words; chips: name and title in a row. */
  peopleLayout?: "cards" | "chips";
  supporters?: IdPick;
  beneficiaries?: IdPick;
}

/** Text as it is stored per language: strings, lists, or records. */
export type SectionText = Record<string, string | string[] | Record<string, string>[]>;

export interface Section {
  id: string;
  type: SectionType;
  /** Where a button points, when the structure has one; the same in every language. */
  href?: string;
  /** Whether a cards section spans three columns (else two). */
  columns?: 2 | 3;
  assets?: SectionAssets;
  text: SectionText;
}

/** What the editor holds: one section with text in every language. */
export interface SectionDraft extends Omit<Section, "text"> {
  text: Record<Locale, Record<string, string>>;
}

const pickSchema = z.object({
  kinds: z.array(z.enum(TEAM_KINDS)).max(10),
  ids: z.array(z.string().max(64)).max(200),
});
const idPickSchema = z.object({ ids: z.array(z.string().max(64)).max(200) });

export const sectionSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(SECTION_TYPES),
  href: z.string().max(300).optional(),
  columns: z.union([z.literal(2), z.literal(3)]).optional(),
  assets: z
    .object({
      people: pickSchema.optional(),
      peopleLayout: z.enum(["cards", "chips"]).optional(),
      supporters: idPickSchema.optional(),
      beneficiaries: idPickSchema.optional(),
    })
    .optional(),
  text: z.record(z.string().max(40), z.union([z.string().max(20_000), z.array(z.string().max(4000)).max(200), z.array(z.record(z.string().max(40), z.string().max(4000))).max(200)])),
});
export const sectionsSchema = z.array(sectionSchema).max(60);

export function newSectionId(): string {
  return `s-${Math.random().toString(36).slice(2, 10)}`;
}

/** A blank section of a type, with every text field empty in every language. */
export function blankSection(type: SectionType, locales: readonly Locale[]): SectionDraft {
  return {
    id: newSectionId(),
    type,
    text: Object.fromEntries(locales.map((loc) => [loc, Object.fromEntries(SECTION_FIELDS[type].map((f) => [f.key, ""]))])) as Record<Locale, Record<string, string>>,
  };
}

// A pipe, not the middle dot: the shipped copy uses " · " inside its own text.
const SEP = " | ";

/** A stored text value as it sits in the textarea. */
export function serializeText(spec: TextFieldSpec, value: SectionText[string] | undefined): string {
  if (value === undefined) return "";
  if (spec.kind === "lines") return Array.isArray(value) ? (value as string[]).join("\n") : String(value);
  if (spec.kind === "records") {
    if (!Array.isArray(value)) return "";
    return (value as Record<string, string>[]).map((record) => (spec.parts ?? []).map((part) => record[part] ?? "").join(SEP)).join("\n");
  }
  return typeof value === "string" ? value : "";
}

/** The textarea back into the stored value. Empty text stores as empty. */
export function parseText(spec: TextFieldSpec, text: string): SectionText[string] {
  const trimmed = text.trim();
  if (spec.kind === "lines") return trimmed ? trimmed.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  if (spec.kind === "records") {
    if (!trimmed) return [];
    return trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(SEP.trim()).map((p) => p.trim());
        return Object.fromEntries((spec.parts ?? []).map((part, i) => [part, parts[i] ?? ""]));
      });
  }
  return trimmed;
}

/** Sections of every language from the editor's drafts. */
export function projectDrafts(drafts: SectionDraft[], locale: Locale): Section[] {
  return drafts.map(({ text, ...rest }) => ({
    ...rest,
    text: Object.fromEntries(SECTION_FIELDS[rest.type].map((spec) => [spec.key, parseText(spec, text[locale]?.[spec.key] ?? "")])),
  }));
}

/** The editor's drafts from one language's sections, texts of other languages merged in. */
export function draftsFromSections(byLocale: Partial<Record<Locale, Section[]>>, locales: readonly Locale[]): SectionDraft[] {
  const base = locales.map((loc) => byLocale[loc]).find((s) => s && s.length > 0) ?? [];
  return base.map((section) => ({
    ...section,
    text: Object.fromEntries(
      locales.map((loc) => {
        const own = byLocale[loc]?.find((s) => s.id === section.id);
        return [loc, Object.fromEntries(SECTION_FIELDS[section.type].map((spec) => [spec.key, serializeText(spec, own?.text[spec.key])]))];
      }),
    ) as Record<Locale, Record<string, string>>,
  }));
}

/** Whether a page's saved content holds sections (the new model). */
export function sectionsOf(content: unknown): Section[] | null {
  const parsed = z.object({ sections: sectionsSchema }).safeParse(content);
  return parsed.success && parsed.data.sections.length > 0 ? parsed.data.sections : null;
}

// ─ the shipped pages as sections ───────────────────────────────────────────

const fixedId = (page: string, key: string) => `${page}-${key}`;

/** The About us page, as the site ships it, as sections. */
export function sectionsFromAbout(c: AboutContent): Section[] {
  return [
    { id: fixedId("about", "hero"), type: "hero", text: { eyebrow: c.heroEyebrow, title: c.heroTitle, lead: c.heroLead } },
    { id: fixedId("about", "story"), type: "prose", text: { heading: c.storyHeading, lead: "", paragraphs: c.story, buttonLabel: "" } },
    { id: fixedId("about", "name"), type: "prose", text: { heading: c.nameHeading, lead: "", paragraphs: c.name, buttonLabel: "" } },
    {
      id: fixedId("about", "structure"),
      type: "cards",
      columns: 2,
      assets: { people: { kinds: ["board"], ids: [] }, peopleLayout: "chips" },
      text: { heading: c.structureHeading, lead: c.structureLead, items: c.roles.map((r) => ({ kicker: r.name, title: r.who, text: r.desc })), note: "" },
    },
    { id: fixedId("about", "plan"), type: "prose", href: "/transparentnost", text: { heading: c.planHeading, lead: "", paragraphs: c.plan, buttonLabel: "" } },
    {
      id: fixedId("about", "committee"),
      type: "callout",
      href: "/kako-radimo",
      assets: { people: { kinds: ["committee"], ids: [] }, peopleLayout: "chips" },
      text: { heading: c.committeeHeading, paragraphs: c.committee, buttonLabel: "" },
    },
    {
      id: fixedId("about", "team"),
      type: "prose",
      assets: { people: { kinds: ["officer", "staff", "board", "committee"], ids: [] }, peopleLayout: "cards" },
      text: { heading: c.teamHeading, lead: c.teamLead, paragraphs: [], buttonLabel: "" },
    },
    {
      id: fixedId("about", "volunteers"),
      type: "prose",
      assets: { people: { kinds: ["volunteer"], ids: [] }, peopleLayout: "chips" },
      text: { heading: "", lead: "", paragraphs: [], buttonLabel: "" },
    },
    { id: fixedId("about", "note"), type: "note", text: { text: c.peopleNote } },
  ];
}

/** The How we work page, as the site ships it, as sections. */
export function sectionsFromHow(c: HowContent): Section[] {
  return [
    { id: fixedId("how", "hero"), type: "hero", text: { eyebrow: c.heroEyebrow, title: c.heroTitle, lead: c.heroLead } },
    {
      id: fixedId("how", "funds"),
      type: "cards",
      columns: 2,
      text: { heading: c.fundsHeading, lead: "", items: c.funds.map((f) => ({ kicker: f.name, title: f.rule, text: `${f.inFlows} ${f.outFlows}` })), note: c.fundsNote },
    },
    { id: fixedId("how", "split"), type: "figures", text: { heading: c.splitHeading, lead: c.splitLead, items: c.split.map((s) => ({ figure: s.pct, label: s.label })) } },
    { id: fixedId("how", "splitReasons"), type: "list", text: { heading: "", lead: "", items: c.splitReasons.map((r) => ({ title: r.title, text: r.desc })), buttonLabel: "" } },
    {
      id: fixedId("how", "ledger"),
      type: "callout",
      href: "/transparentnost",
      text: { heading: c.ledgerHeading, paragraphs: [c.ledgerLead, ...c.ledgerPoints.map((p) => `${p.title}: ${p.desc}`)], buttonLabel: c.ledgerCta },
    },
    {
      id: fixedId("how", "decide"),
      type: "prose",
      href: "/o-nama",
      assets: { people: { kinds: ["committee"], ids: [] }, peopleLayout: "chips" },
      text: { heading: c.decideHeading, lead: "", paragraphs: c.decide, buttonLabel: c.decideCta },
    },
  ];
}

export const EMPTY_ASSETS: Required<Pick<SectionAssets, "people" | "supporters" | "beneficiaries">> = {
  people: EMPTY_PEOPLE,
  supporters: EMPTY_IDS,
  beneficiaries: EMPTY_IDS,
};
