// The editorial pages staff can edit from the admin: which fields each
// has, how a field is typed in a textarea, and how the saved text merges
// over the shipped copy in content/site/*.ts.

export type SitePage = "about" | "how";

export type FieldKind =
  /** One line. */
  | "text"
  /** A paragraph or more. */
  | "long"
  /** A list: one entry per line. */
  | "lines"
  /** A list of records: one per line, parts separated by " · ". */
  | "records";

export interface FieldSpec {
  key: string;
  kind: FieldKind;
  /** For records: the part names, in order. */
  parts?: string[];
}

export const PAGE_FIELDS: Record<SitePage, FieldSpec[]> = {
  about: [
    { key: "heroEyebrow", kind: "text" },
    { key: "heroTitle", kind: "text" },
    { key: "heroLead", kind: "long" },
    { key: "storyHeading", kind: "text" },
    { key: "story", kind: "lines" },
    { key: "nameHeading", kind: "text" },
    { key: "name", kind: "lines" },
    { key: "structureHeading", kind: "text" },
    { key: "structureLead", kind: "long" },
    { key: "roles", kind: "records", parts: ["name", "who", "desc"] },
    { key: "committeeHeading", kind: "text" },
    { key: "committee", kind: "lines" },
    { key: "planHeading", kind: "text" },
    { key: "plan", kind: "lines" },
    { key: "teamHeading", kind: "text" },
    { key: "teamLead", kind: "long" },
    { key: "peopleNote", kind: "long" },
  ],
  how: [
    { key: "heroEyebrow", kind: "text" },
    { key: "heroTitle", kind: "text" },
    { key: "heroLead", kind: "long" },
    { key: "fundsHeading", kind: "text" },
    { key: "funds", kind: "records", parts: ["name", "inFlows", "outFlows", "rule"] },
    { key: "fundsNote", kind: "long" },
    { key: "splitHeading", kind: "text" },
    { key: "splitLead", kind: "long" },
    { key: "split", kind: "records", parts: ["pct", "label"] },
    { key: "splitReasons", kind: "records", parts: ["title", "desc"] },
    { key: "ledgerHeading", kind: "text" },
    { key: "ledgerLead", kind: "long" },
    { key: "ledgerPoints", kind: "records", parts: ["title", "desc"] },
    { key: "ledgerCta", kind: "text" },
    { key: "decideHeading", kind: "text" },
    { key: "decide", kind: "lines" },
    { key: "decideCta", kind: "text" },
  ],
};

export type FieldValue = string | string[] | Record<string, string>[];
export type PageContent = Record<string, FieldValue>;

const SEP = " · ";

/** A field's value as it sits in the textarea. */
export function serializeField(spec: FieldSpec, value: FieldValue | undefined): string {
  if (value === undefined) return "";
  if (spec.kind === "lines") return Array.isArray(value) ? (value as string[]).join("\n") : String(value);
  if (spec.kind === "records") {
    if (!Array.isArray(value)) return "";
    return (value as Record<string, string>[]).map((record) => (spec.parts ?? []).map((part) => record[part] ?? "").join(SEP)).join("\n");
  }
  return typeof value === "string" ? value : "";
}

/** The textarea back into the field's value; empty text means "not set". */
export function parseField(spec: FieldSpec, text: string): FieldValue | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (spec.kind === "lines") return trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  if (spec.kind === "records") {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(SEP.trim()).map((part) => part.trim());
        return Object.fromEntries((spec.parts ?? []).map((part, index) => [part, parts[index] ?? ""]));
      });
  }
  return trimmed;
}

/** Whether a saved value is well-formed for its field. */
export function isValidField(spec: FieldSpec, value: unknown): boolean {
  if (spec.kind === "lines") return Array.isArray(value) && value.every((v) => typeof v === "string");
  if (spec.kind === "records") {
    return (
      Array.isArray(value) &&
      value.every((record) => record && typeof record === "object" && (spec.parts ?? []).every((part) => typeof (record as Record<string, unknown>)[part] === "string"))
    );
  }
  return typeof value === "string";
}

/**
 * The page as the site shows it: the shipped copy with every field staff
 * saved laid over it. A saved field replaces the shipped one whole; an
 * unsaved field keeps the shipped text.
 */
export function mergePageContent<T extends object>(shipped: T, saved: PageContent | null | undefined, page: SitePage): T {
  if (!saved) return shipped;
  const out: Record<string, unknown> = { ...(shipped as Record<string, unknown>) };
  for (const spec of PAGE_FIELDS[page]) {
    const value = saved[spec.key];
    if (value !== undefined && isValidField(spec, value)) out[spec.key] = value;
  }
  return out as T;
}
