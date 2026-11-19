/**
 * Prospects found and checked live (migration 0089): the pure half. What a
 * Google search is made of, how a Places result and a website's HTML become
 * a candidate, and how an answer from live research is held to its sources.
 * The network calls are in lib/server (google-places, site-contacts,
 * prospect-research).
 */
import { z } from "zod";

import { PROSPECT_SECTORS, type ProspectArea, type ProspectSector } from "@/lib/prospects";

// ── Google search: what and where ───────────────────────────────────────────

/** Towns offered for a Google search, with the area a find there belongs to. */
export const GOOGLE_TOWNS: { name: string; area: ProspectArea }[] = [
  { name: "Tivat", area: "tivat" },
  { name: "Kotor", area: "boka" },
  { name: "Herceg Novi", area: "boka" },
  { name: "Budva", area: "coast" },
  { name: "Bar", area: "coast" },
  { name: "Podgorica", area: "national" },
  { name: "Nikšić", area: "national" },
];

/** What is typed into Google for a sector: plain words a business listing matches. */
export const SECTOR_QUERIES: Partial<Record<ProspectSector, string[]>> = {
  bank: ["bank"],
  insurance: ["insurance company"],
  retail_fmcg: ["supermarket"],
  food_drink: ["restaurant", "cafe"],
  marina_resort: ["marina"],
  hotel: ["hotel"],
  real_estate: ["real estate agency"],
  yachting: ["yacht charter"],
  tourism_transport: ["travel agency", "rent a car"],
  health: ["dental clinic", "private clinic"],
  fitness_wellness: ["gym", "spa"],
  professional_services: ["law firm", "accounting firm"],
  local_shop: ["printing shop", "photographer", "florist", "bakery"],
  sport_body: ["sports club"],
  media: ["radio station"],
};

export const GOOGLE_SECTORS = PROSPECT_SECTORS.filter((sector) => SECTOR_QUERIES[sector]);
export const GOOGLE_DEPTHS = [20, 40, 60] as const;

export interface PlannedSearch {
  query: string;
  sector: ProspectSector;
  town: string;
  area: ProspectArea;
}

/** One search per term and town: "dental clinic Tivat Montenegro". Extra words are searched as typed, per town. */
export function planSearches(sectors: ProspectSector[], towns: string[], extra: string): PlannedSearch[] {
  const places = towns.map((name) => GOOGLE_TOWNS.find((town) => town.name === name) ?? { name, area: "national" as ProspectArea });
  const terms: { term: string; sector: ProspectSector }[] = sectors.flatMap((sector) => (SECTOR_QUERIES[sector] ?? []).map((term) => ({ term, sector })));
  const typed = extra.trim();
  if (typed) terms.push({ term: typed, sector: sectors[0] ?? "local_shop" });
  return places.flatMap((place) => terms.map(({ term, sector }) => ({ query: `${term} ${place.name} Montenegro`, sector, town: place.name, area: place.area })));
}

// ── a candidate, whichever way it was found ─────────────────────────────────

export const liveCandidateSchema = z.object({
  /** The Google place id, or a key made from the name for a research find. */
  ref: z.string().min(1).max(300),
  source: z.enum(["google", "research"]),
  name: z.string().trim().min(1).max(200),
  sector: z.enum(PROSPECT_SECTORS),
  area: z.enum(["tivat", "boka", "coast", "national", "international"]),
  town: z.string().trim().max(120).nullable(),
  address: z.string().trim().max(300).nullable(),
  website: z.string().trim().max(300).nullable(),
  email: z.string().trim().max(160).nullable(),
  phone: z.string().trim().max(80).nullable(),
  instagram: z.string().trim().max(80).nullable(),
  contact_name: z.string().trim().max(160).nullable(),
  contact_role: z.string().trim().max(200).nullable(),
  why: z.string().trim().max(600).nullable(),
  sources: z.array(z.string().trim().max(500)).max(8),
  rating: z.number().nullable(),
  rating_count: z.number().nullable(),
});
export type LiveCandidate = z.infer<typeof liveCandidateSchema> & { exists?: boolean };

/** A place as Places API (New) Text Search returns it under our field mask (docs/vendor/google-places.md). */
export interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
}

/** A place becomes a candidate; one that is closed for good, or has no name, does not. */
export function placeToCandidate(place: GooglePlace, search: PlannedSearch): LiveCandidate | null {
  const name = place.displayName?.text?.trim();
  if (!place.id || !name || place.businessStatus === "CLOSED_PERMANENTLY") return null;
  return {
    ref: place.id,
    source: "google",
    name: name.slice(0, 200),
    sector: search.sector,
    area: search.area,
    town: search.town,
    address: place.formattedAddress?.slice(0, 300) ?? null,
    website: cleanUrl(place.websiteUri),
    email: null,
    phone: place.internationalPhoneNumber ?? null,
    instagram: null,
    contact_name: null,
    contact_role: null,
    why: null,
    sources: [place.googleMapsUri, cleanUrl(place.websiteUri)].filter((url): url is string => Boolean(url)),
    rating: place.rating ?? null,
    rating_count: place.userRatingCount ?? null,
  };
}

// ── a website's own contact details ─────────────────────────────────────────

/** An http(s) URL without tracking parameters, or null. */
export function cleanUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|srsltid)/i.test(key)) url.searchParams.delete(key);
    url.hash = "";
    return url.toString().slice(0, 300);
  } catch {
    return null;
  }
}

/**
 * A host our server may fetch: a public name, not this machine, a private
 * network or a bare address. The fetch follows no redirects off this rule
 * (lib/server/site-contacts checks every hop).
 */
export function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return false;
  return /^[a-z0-9.-]+$/.test(host);
}

const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g;
const NOT_A_MAILBOX = /\.(png|jpe?g|gif|webp|svg|css|js)$|^(example|email|name|user|you|your|info@example)|@(example|domain|email|sentry|wixpress|sentry-next)\.|@[0-9.]+$|@2x/i;

/** The email addresses and the Instagram account a page publishes, the site's own domain first. */
export function extractContacts(html: string, pageUrl: string): { emails: string[]; instagram: string | null } {
  const host = (() => {
    try {
      return new URL(pageUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const text = html.replace(/&#64;|&commat;|\s*\[at\]\s*|\s*\(at\)\s*/gi, "@").replace(/%40/g, "@");
  const found = [...new Set((text.match(EMAIL_IN_TEXT) ?? []).map((email) => email.toLowerCase().replace(/^mailto:/, "")))].filter((email) => !NOT_A_MAILBOX.test(email));
  const own = found.filter((email) => host && email.endsWith(`@${host}`));
  const emails = [...own, ...found.filter((email) => !own.includes(email))].slice(0, 3);
  const handle = /instagram\.com\/([A-Za-z0-9._]{2,30})(?=[/"'?\s]|$)/i.exec(html)?.[1] ?? null;
  const instagram = handle && !/^(p|reel|reels|explore|accounts|share|stories|tv)$/i.test(handle) ? handle.replace(/\.$/, "") : null;
  return { emails, instagram };
}

// ── live research, held to its sources ──────────────────────────────────────

/** A URL as we compare it: no fragment, no trailing slash, host in lower case. */
export function comparableUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return `${url.protocol}//${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return null;
  }
}

/** The sources an answer may keep: only pages the search actually returned. */
export function keepRetrieved(claimed: readonly (string | null | undefined)[], retrieved: ReadonlySet<string>): string[] {
  const kept: string[] = [];
  for (const source of claimed) {
    const comparable = source ? comparableUrl(source) : null;
    if (comparable && retrieved.has(comparable) && !kept.includes(source!.trim())) kept.push(source!.trim());
  }
  return kept;
}

/** The last JSON value in an answer, fenced or bare. */
export function lastJson(text: string): unknown {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((match) => match[1]);
  const candidates = fenced.length > 0 ? fenced.reverse() : [text.slice(Math.max(text.indexOf("{"), 0)), text.slice(Math.max(text.indexOf("["), 0))];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const optional = (max: number) => z.string().trim().max(max).nullable().catch(null);

/** What a live check of one prospect answers. */
export const researchCheckSchema = z.object({
  status: z.enum(["operating", "changed", "closed", "unknown"]).catch("unknown"),
  /** Two sentences at most: what was found and what changed. */
  summary: z.string().trim().max(700).catch(""),
  /** Sponsorships and donations found, newest first, each with its year. */
  sponsorship_record: optional(700),
  website: optional(300),
  email: optional(160),
  phone: optional(80),
  instagram: optional(80),
  contact_name: optional(160),
  contact_role: optional(200),
  contact_email: optional(160),
  contact_phone: optional(80),
  /** The page that names the person with that role. */
  contact_source: optional(500),
  sources: z.array(z.string().trim().max(500)).max(10).catch([]),
});
export type ResearchCheck = z.infer<typeof researchCheckSchema>;

/**
 * A check with everything unsourced removed: its sources are cut to the
 * pages the search returned, and a person stays only when the page naming
 * them is one of those. Null when nothing sourced is left.
 */
export function sourcedCheck(raw: unknown, retrieved: ReadonlySet<string>): ResearchCheck | null {
  const parsed = researchCheckSchema.safeParse(raw);
  if (!parsed.success) return null;
  const check = { ...parsed.data, sources: keepRetrieved(parsed.data.sources, retrieved) };
  const personSource = keepRetrieved([check.contact_source], retrieved)[0] ?? null;
  if (!check.contact_name || !personSource) {
    check.contact_name = null;
    check.contact_role = null;
    check.contact_email = null;
    check.contact_phone = null;
    check.contact_source = null;
  } else if (!check.sources.includes(personSource)) {
    check.sources = [personSource, ...check.sources].slice(0, 10);
  }
  if (check.sources.length === 0) return null;
  check.website = cleanUrl(check.website);
  if (check.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(check.email)) check.email = null;
  if (check.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(check.contact_email)) check.contact_email = null;
  if (check.instagram) check.instagram = check.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "") || null;
  return check;
}

/** What live research answers when asked who has sponsored before. */
export const researchFindSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sector: z.enum(PROSPECT_SECTORS).catch("professional_services"),
  town: optional(120),
  website: optional(300),
  email: optional(160),
  phone: optional(80),
  instagram: optional(80),
  contact_name: optional(160),
  contact_role: optional(200),
  contact_source: optional(500),
  /** What they sponsored or gave to, with the year. */
  why: optional(600),
  sources: z.array(z.string().trim().max(500)).max(8).catch([]),
});

/** Research finds as candidates, each held to the pages the search returned; one with no source left is dropped. */
export function sourcedFinds(raw: unknown, retrieved: ReadonlySet<string>, area: ProspectArea, keyOf: (name: string) => string): LiveCandidate[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { organisations?: unknown }).organisations) ? (raw as { organisations: unknown[] }).organisations : [];
  const out: LiveCandidate[] = [];
  for (const item of list) {
    const parsed = researchFindSchema.safeParse(item);
    if (!parsed.success) continue;
    const find = parsed.data;
    const sources = keepRetrieved(find.sources, retrieved);
    const personSource = keepRetrieved([find.contact_source], retrieved)[0] ?? null;
    if (sources.length === 0 && !personSource) continue;
    const named = Boolean(find.contact_name && personSource);
    const ref = keyOf(find.name);
    if (!ref || out.some((candidate) => candidate.ref === ref)) continue;
    out.push({
      ref,
      source: "research",
      name: find.name,
      sector: find.sector,
      area,
      town: find.town,
      address: null,
      website: cleanUrl(find.website),
      email: find.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(find.email) ? find.email : null,
      phone: find.phone,
      instagram: find.instagram ? find.instagram.replace(/^@/, "") : null,
      contact_name: named ? find.contact_name : null,
      contact_role: named ? find.contact_role : null,
      why: find.why,
      sources: [...new Set([...(personSource && named ? [personSource] : []), ...sources])].slice(0, 8),
      rating: null,
      rating_count: null,
    });
  }
  return out;
}
