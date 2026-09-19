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
  | "records"
  /** People from the team records: by role, by name, or both. */
  | "people"
  /** Supporters picked by name. */
  | "supporters"
  /** Beneficiaries picked by name. */
  | "beneficiaries";

export const TEAM_KINDS = ["officer", "staff", "board", "committee", "volunteer"] as const;
export type TeamKind = (typeof TEAM_KINDS)[number];

/** A people attachment: everyone with one of the roles, plus the named ones. */
export interface PeoplePick {
  kinds: TeamKind[];
  ids: string[];
}
/** A supporters or beneficiaries attachment: the named ones. */
export interface IdPick {
  ids: string[];
}
export const EMPTY_PEOPLE: PeoplePick = { kinds: [], ids: [] };
export const EMPTY_IDS: IdPick = { ids: [] };

/** Whether a field is an attachment rather than text. */
export function isAttachment(spec: FieldSpec): boolean {
  return spec.kind === "people" || spec.kind === "supporters" || spec.kind === "beneficiaries";
}

/** The people a pick selects, in the rows' order. Empty pick selects no one. */
export function pickPeople<T extends { id: string; kind: string }>(pick: PeoplePick | undefined, rows: T[]): T[] {
  if (!pick || (pick.kinds.length === 0 && pick.ids.length === 0)) return [];
  const ids = new Set(pick.ids);
  const kinds = new Set<string>(pick.kinds);
  return rows.filter((row) => kinds.has(row.kind) || ids.has(row.id));
}

/** The rows an id pick selects, in the pick's order. */
export function pickIds<T extends { id: string }>(pick: IdPick | undefined, rows: T[]): T[] {
  if (!pick || pick.ids.length === 0) return [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return pick.ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as T] : []));
}

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
    { key: "boardPeople", kind: "people" },
    { key: "committeePeople", kind: "people" },
    { key: "teamPeople", kind: "people" },
    { key: "volunteerPeople", kind: "people" },
    { key: "featuredBeneficiaries", kind: "beneficiaries" },
    { key: "featuredSupporters", kind: "supporters" },
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
    { key: "committeePeople", kind: "people" },
  ],
};

export type FieldValue = string | string[] | Record<string, string>[] | PeoplePick | IdPick;
export type PageContent = Record<string, FieldValue>;

const SEP = " · ";

/** A field's value as it sits in the textarea (attachments are not text). */
export function serializeField(spec: FieldSpec, value: FieldValue | undefined): string {
  if (value === undefined || isAttachment(spec)) return "";
  if (spec.kind === "lines") return Array.isArray(value) ? (value as string[]).join("\n") : String(value);
  if (spec.kind === "records") {
    if (!Array.isArray(value)) return "";
    return (value as Record<string, string>[]).map((record) => (spec.parts ?? []).map((part) => record[part] ?? "").join(SEP)).join("\n");
  }
  return typeof value === "string" ? value : "";
}

/** The textarea back into the field's value; empty text means "not set". */
export function parseField(spec: FieldSpec, text: string): FieldValue | undefined {
  if (isAttachment(spec)) return undefined;
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

const isIdList = (value: unknown) => Array.isArray(value) && value.every((v) => typeof v === "string" && v.length <= 64);

/** Whether a saved value is well-formed for its field. */
export function isValidField(spec: FieldSpec, value: unknown): boolean {
  if (spec.kind === "people") {
    const pick = value as Partial<PeoplePick> | null;
    return Boolean(pick && typeof pick === "object" && isIdList(pick.ids) && Array.isArray(pick.kinds) && pick.kinds.every((k) => (TEAM_KINDS as readonly string[]).includes(k)));
  }
  if (spec.kind === "supporters" || spec.kind === "beneficiaries") {
    const pick = value as Partial<IdPick> | null;
    return Boolean(pick && typeof pick === "object" && isIdList(pick.ids));
  }
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
