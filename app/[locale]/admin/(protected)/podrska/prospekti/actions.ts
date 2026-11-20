"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import Anthropic from "@anthropic-ai/sdk";

import { saveSupporter } from "@/app/[locale]/admin/(protected)/podrska/actions";
import { GOOGLE_DEPTHS, liveCandidateSchema, planSearches, researchCheckSchema, type LiveCandidate, type ResearchCheck } from "@/lib/prospect-live";
import {
  PROSPECT_AREAS,
  MESSAGE_LANGS,
  PROSPECT_CHANNELS,
  PROSPECT_KINDS,
  PROSPECT_SECTORS,
  PROSPECT_STAGES,
  PROSPECT_TEMPLATES,
  PROSPECT_TIERS,
  catalogueKey,
  followUpAfter,
  matchesCriteria,
} from "@/lib/prospects";
import { GooglePlacesError, googlePlacesConfigured, searchPlaces } from "@/lib/server/google-places";
import { CATALOGUE } from "@/lib/server/prospect-catalogue";
import { checkProspect, findSponsors, researchConfigured } from "@/lib/server/prospect-research";
import { readSiteContacts } from "@/lib/server/site-contacts";
import { describeError } from "@/lib/server/translate";
import { isStaff } from "@/lib/server/access";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; prospects_staff_all and prospect_activities_staff_all
// (migration 0088) are the enforcement. The catalogue is read here, on the
// server, and only the entries a criteria set picks ever reach the database.

export type ProspectResult =
  | { ok: true; id?: string; added?: number; matched?: number }
  | { ok: false; error: "invalid" | "forbidden" | "server" };

const PAGE = "/[locale]/admin/podrska/prospekti";

/** Today's date where the team works, for follow-ups. */
function todayInPodgorica(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Podgorica" }).format(new Date());
}

const criteriaSchema = z.object({
  kinds: z.array(z.enum(PROSPECT_KINDS)).max(PROSPECT_KINDS.length),
  sectors: z.array(z.enum(PROSPECT_SECTORS)).max(PROSPECT_SECTORS.length),
  areas: z.array(z.enum(PROSPECT_AREAS)).max(PROSPECT_AREAS.length),
  tiers: z.array(z.enum(PROSPECT_TIERS)).max(PROSPECT_TIERS.length),
  personOnly: z.boolean(),
});

/** Develop the list: every researched organisation the criteria pick that is not on the list yet joins it as a new prospect. */
export async function developProspects(input: unknown): Promise<ProspectResult> {
  const parsed = criteriaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const picked = CATALOGUE.filter((entry) => matchesCriteria({ ...entry, hasPerson: Boolean(entry.contact_name) }, parsed.data));
  if (picked.length === 0) return { ok: true, added: 0, matched: 0 };

  const rows = picked.map((entry) => ({
    catalogue_key: entry.key,
    kind: entry.kind,
    name: entry.name,
    sector: entry.sector,
    area: entry.area,
    town: entry.town,
    website: entry.website,
    email: entry.email,
    phone: entry.phone,
    instagram: entry.instagram,
    contact_name: entry.contact_name,
    contact_role: entry.contact_role,
    contact_email: entry.contact_email,
    contact_phone: entry.contact_phone,
    tier_fit: entry.tier_fit,
    why: entry.why,
    // The page that names the person first, then the rest.
    sources: [...new Set([entry.contact_source, ...entry.sources].filter((url): url is string => Boolean(url)))],
    created_by: user?.id ?? null,
  }));
  const { data, error } = await supabase
    .from("prospects")
    .upsert(rows, { onConflict: "catalogue_key", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error("[prospects] develop failed:", error.code, error.message);
    return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  }
  revalidatePath(PAGE, "page");
  return { ok: true, added: data?.length ?? 0, matched: picked.length };
}

const text = (max: number) => z.string().trim().max(max).nullable();

const prospectSchema = z.object({
  id: z.string().uuid().nullable(),
  kind: z.enum(PROSPECT_KINDS),
  name: z.string().trim().min(1).max(200),
  sector: z.enum(PROSPECT_SECTORS),
  area: z.enum(PROSPECT_AREAS),
  town: text(120),
  website: text(300),
  email: text(160),
  phone: text(80),
  instagram: text(80),
  contactName: text(160),
  contactRole: text(160),
  contactEmail: text(160),
  contactPhone: text(80),
  tierFit: z.enum(PROSPECT_TIERS).nullable(),
  notes: text(4000),
});

/** Add an organisation by hand, or correct what is known about one (a warmer contact, a better number). */
export async function saveProspect(input: unknown): Promise<ProspectResult> {
  const parsed = prospectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;
  const supabase = await createClient();
  const row = {
    kind: d.kind,
    name: d.name,
    sector: d.sector,
    area: d.area,
    town: d.town || null,
    website: d.website || null,
    email: d.email || null,
    phone: d.phone || null,
    instagram: d.instagram ? d.instagram.replace(/^@/, "") : null,
    contact_name: d.contactName || null,
    contact_role: d.contactRole || null,
    contact_email: d.contactEmail || null,
    contact_phone: d.contactPhone || null,
    tier_fit: d.tierFit,
    notes: d.notes || null,
    updated_at: new Date().toISOString(),
  };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = d.id
    ? await supabase.from("prospects").update(row).eq("id", d.id).select("id").single()
    : await supabase.from("prospects").insert({ ...row, created_by: user?.id ?? null }).select("id").single();
  if (error || !data) {
    console.error("[prospects] save failed:", error?.code, error?.message);
    return { ok: false, error: error?.code === "42501" ? "forbidden" : "server" };
  }
  revalidatePath(PAGE, "page");
  return { ok: true, id: data.id };
}

export async function setProspectStage(input: unknown): Promise<ProspectResult> {
  const parsed = z.object({ id: z.string().uuid(), stage: z.enum(PROSPECT_STAGES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const closed = parsed.data.stage === "won" || parsed.data.stage === "declined";
  const { error } = await supabase
    .from("prospects")
    // A closed ask has nothing left to follow up.
    .update({ stage: parsed.data.stage, ...(closed ? { next_follow_up: null } : {}), updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  await supabase.from("prospect_activities").insert({ prospect_id: parsed.data.id, kind: "stage", body: parsed.data.stage, created_by: user?.id ?? null });
  revalidatePath(PAGE, "page");
  return { ok: true, id: parsed.data.id };
}

export async function setProspectFollowUp(input: unknown): Promise<ProspectResult> {
  const parsed = z.object({ id: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    .update({ next_follow_up: parsed.data.date, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  revalidatePath(PAGE, "page");
  return { ok: true, id: parsed.data.id };
}

const messageSchema = z.object({
  id: z.string().uuid(),
  channel: z.enum(PROSPECT_CHANNELS),
  template: z.enum(PROSPECT_TEMPLATES),
  lang: z.enum(MESSAGE_LANGS),
  body: z.string().trim().min(1).max(6000),
});

/**
 * Record a message opened for sending: the words go in the log, a new
 * prospect becomes contacted, and the follow-up is set (five days after a
 * first message, a week after a follow-up). The sending itself happens in
 * the person's own WhatsApp, mail app or Instagram.
 */
export async function logProspectMessage(input: unknown): Promise<ProspectResult> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: current, error: readError } = await supabase.from("prospects").select("stage").eq("id", d.id).maybeSingle();
  if (readError || !current) return { ok: false, error: readError?.code === "42501" ? "forbidden" : "invalid" };

  const { error: logError } = await supabase
    .from("prospect_activities")
    .insert({ prospect_id: d.id, kind: "message", channel: d.channel, template: d.template, lang: d.lang, body: d.body, created_by: user?.id ?? null });
  if (logError) {
    console.error("[prospects] log failed:", logError.code, logError.message);
    return { ok: false, error: logError.code === "42501" ? "forbidden" : "server" };
  }
  const { error } = await supabase
    .from("prospects")
    .update({
      last_contacted_at: new Date().toISOString(),
      next_follow_up: followUpAfter(d.template, todayInPodgorica()),
      ...(current.stage === "new" ? { stage: "contacted" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: "server" };
  revalidatePath(PAGE, "page");
  return { ok: true, id: d.id };
}

export async function addProspectNote(input: unknown): Promise<ProspectResult> {
  const parsed = z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("prospect_activities").insert({ prospect_id: parsed.data.id, kind: "note", body: parsed.data.body, created_by: user?.id ?? null });
  if (error) return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  revalidatePath(PAGE, "page");
  return { ok: true, id: parsed.data.id };
}

export async function deleteProspects(input: unknown): Promise<ProspectResult> {
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").delete().in("id", parsed.data.ids);
  if (error) return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  revalidatePath(PAGE, "page");
  return { ok: true };
}

/**
 * A prospect that said yes becomes a supporter, with the contact we already
 * hold, and keeps the link. The sponsorship itself (tier, amount, event) is
 * recorded on the supporter, where the money is.
 */
export async function prospectToSupporter(input: unknown): Promise<ProspectResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: prospect, error: readError } = await supabase
    .from("prospects")
    .select("id, name, website, email, phone, contact_name, contact_email, contact_phone, why, supporter_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError || !prospect) return { ok: false, error: readError?.code === "42501" ? "forbidden" : "invalid" };
  if (prospect.supporter_id) return { ok: true, id: prospect.supporter_id };

  const url = (value: string | null) => (value && /^https?:\/\/\S+$/.test(value) ? value : null);
  const mail = (value: string | null) => (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null);
  const created = await saveSupporter({
    name: prospect.name,
    kind: "sponsor",
    website: url(prospect.website),
    contactName: prospect.contact_name?.slice(0, 120) ?? null,
    contactEmail: mail(prospect.contact_email) ?? mail(prospect.email),
    contactPhone: (prospect.contact_phone ?? prospect.phone)?.slice(0, 40) ?? null,
    notes: prospect.why?.slice(0, 2000) ?? null,
    isActive: true,
  });
  if (!created.ok || !("supporter" in created) || !created.supporter) return { ok: false, error: "server" };

  const { error } = await supabase
    .from("prospects")
    .update({ supporter_id: created.supporter.id, stage: "won", next_follow_up: null, updated_at: new Date().toISOString() })
    .eq("id", prospect.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: "server" };
  revalidatePath(PAGE, "page");
  revalidatePath("/[locale]/admin/podrska", "page");
  return { ok: true, id: created.supporter.id };
}

// ── found and checked live (migration 0089) ─────────────────────────────────

export type LiveSearchResult =
  | { ok: true; candidates: LiveCandidate[]; requests?: number }
  | { ok: false; error: "invalid" | "forbidden" | "unconfigured" | "refused" | "server"; detail?: string };

/** Mark the candidates already on the list: the same Google place, or the same name. */
async function markExisting(candidates: LiveCandidate[]): Promise<LiveCandidate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select("name, google_place_id").limit(5000);
  const places = new Set((data ?? []).map((row) => row.google_place_id).filter(Boolean));
  const names = new Set((data ?? []).map((row) => catalogueKey(row.name)));
  return candidates.map((candidate) => ({ ...candidate, exists: places.has(candidate.ref) || names.has(catalogueKey(candidate.name)) }));
}

const googleSchema = z.object({
  sectors: z.array(z.enum(PROSPECT_SECTORS)).max(PROSPECT_SECTORS.length),
  towns: z.array(z.string().trim().min(2).max(60)).min(1).max(8),
  extra: z.string().trim().max(80),
  depth: z.union([z.literal(GOOGLE_DEPTHS[0]), z.literal(GOOGLE_DEPTHS[1]), z.literal(GOOGLE_DEPTHS[2])]),
});

/** At most this many searches in one go, so a wide pick cannot run up a bill by accident. */
const MAX_SEARCHES = 12;

/** Search Google for businesses of a type in a town. Nothing is saved: the finds come back to be picked. */
export async function searchGoogleProspects(input: unknown): Promise<LiveSearchResult> {
  const parsed = googleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  if (!googlePlacesConfigured()) return { ok: false, error: "unconfigured" };
  const plan = planSearches(parsed.data.sectors, parsed.data.towns, parsed.data.extra);
  if (plan.length === 0 || plan.length > MAX_SEARCHES) return { ok: false, error: "invalid" };
  try {
    const results = await Promise.all(plan.map((search) => searchPlaces(search, parsed.data.depth)));
    const byRef = new Map<string, LiveCandidate>();
    for (const result of results) for (const candidate of result.candidates) if (!byRef.has(candidate.ref)) byRef.set(candidate.ref, candidate);
    const candidates = [...byRef.values()].sort((a, b) => (b.rating_count ?? 0) - (a.rating_count ?? 0));
    return { ok: true, candidates: await markExisting(candidates), requests: results.reduce((sum, result) => sum + result.requests, 0) };
  } catch (error) {
    if (error instanceof GooglePlacesError && error.message === "refused") return { ok: false, error: "refused" };
    console.error("[prospects] google search failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "server" };
  }
}

function researchError(error: unknown): { ok: false; error: "unconfigured" | "server"; detail?: string } {
  console.error("[prospects] live research failed:", describeError(error));
  if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "unconfigured", detail: describeError(error) };
  return { ok: false, error: "server", detail: describeError(error) };
}

/** Live research: who has sponsored or supported events like ours in an area and is not on the list. Nothing is saved. */
export async function findLiveProspects(input: unknown): Promise<LiveSearchResult> {
  const parsed = z.object({ kind: z.enum(PROSPECT_KINDS), area: z.enum(PROSPECT_AREAS), focus: z.string().trim().max(200) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  if (!researchConfigured()) return { ok: false, error: "unconfigured" };
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select("name").limit(5000);
  // The research file counts as known too: its entries are one click away.
  const exclude = [...new Set([...(data ?? []).map((row) => row.name), ...CATALOGUE.map((entry) => entry.name)])];
  try {
    const candidates = await findSponsors({ ...parsed.data, exclude });
    return { ok: true, candidates: await markExisting(candidates) };
  } catch (error) {
    return researchError(error);
  }
}

const addSchema = z.object({
  kind: z.enum(PROSPECT_KINDS),
  /** Visit each website for a published email and Instagram account. */
  enrich: z.boolean(),
  items: z.array(liveCandidateSchema).min(1).max(60),
});

/** Add the picked finds to the list. A Google find's website is read for its email when asked; a place or name already on the list is skipped. */
export async function addLiveProspects(input: unknown): Promise<ProspectResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const items = (await markExisting(parsed.data.items)).filter((item) => !item.exists);
  if (items.length === 0) return { ok: true, added: 0, matched: parsed.data.items.length };

  // Read the websites six at a time, and stop starting new ones after 40 seconds.
  const read = new Map<string, Awaited<ReturnType<typeof readSiteContacts>>>();
  if (parsed.data.enrich) {
    const started = Date.now();
    const queue = items.filter((item) => item.website && !item.email);
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        if (Date.now() - started > 40_000) return;
        read.set(item.ref, await readSiteContacts(item.website!).catch(() => null));
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  const rows = items.map((item) => {
    const site = read.get(item.ref);
    return {
      kind: parsed.data.kind,
      name: item.name,
      sector: item.sector,
      area: item.area,
      town: item.town,
      website: item.website,
      email: item.email ?? site?.emails[0] ?? null,
      phone: item.phone,
      instagram: item.instagram ?? site?.instagram ?? null,
      contact_name: item.contact_name,
      contact_role: item.contact_role,
      why: item.why,
      notes: item.address,
      sources: [...new Set([...item.sources, ...(site && (site.emails.length > 0 || site.instagram) ? site.pages : [])])].slice(0, 8),
      google_place_id: item.source === "google" ? item.ref : null,
      catalogue_key: item.source === "research" ? `live-${item.ref}`.slice(0, 90) : null,
      created_by: user?.id ?? null,
    };
  });
  let added = 0;
  for (const [column, subset] of [["google_place_id", rows.filter((row) => row.google_place_id)], ["catalogue_key", rows.filter((row) => row.catalogue_key)]] as const) {
    if (subset.length === 0) continue;
    const { data, error } = await supabase.from("prospects").upsert(subset, { onConflict: column, ignoreDuplicates: true }).select("id");
    if (error) {
      console.error("[prospects] add live failed:", error.code, error.message);
      return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
    }
    added += data?.length ?? 0;
  }
  revalidatePath(PAGE, "page");
  return { ok: true, added, matched: parsed.data.items.length };
}

export type LiveCheckResult =
  | { ok: true; check: ResearchCheck }
  | { ok: false; error: "invalid" | "forbidden" | "unconfigured" | "nothing" | "server"; detail?: string };

/**
 * Check one prospect live: is it operating, what has it sponsored, who to
 * ask now. The finding is logged and dated at once, so the log shows how a
 * prospect changes over time; the details change only when a person
 * applies them (applyProspectCheck).
 */
export async function checkProspectLive(input: unknown): Promise<LiveCheckResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  if (!researchConfigured()) return { ok: false, error: "unconfigured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: row } = await supabase.from("prospects").select("id, name, kind, town, website, contact_name, contact_role, why").eq("id", parsed.data.id).maybeSingle();
  if (!row) return { ok: false, error: "invalid" };
  let check: ResearchCheck | null;
  try {
    check = await checkProspect(row as Parameters<typeof checkProspect>[0]);
  } catch (error) {
    return researchError(error);
  }
  if (!check) return { ok: false, error: "nothing" };
  const body = [check.summary, check.sponsorship_record, check.sources.join("\n")].filter(Boolean).join("\n\n");
  await supabase.from("prospect_activities").insert({ prospect_id: row.id, kind: "research", body: body.slice(0, 6000), created_by: user?.id ?? null });
  await supabase.from("prospects").update({ checked_at: new Date().toISOString() }).eq("id", row.id);
  revalidatePath(PAGE, "page");
  return { ok: true, check };
}

/** Apply what a live check proposed: the details it found replace the ones on file, its sources join the prospect's. */
export async function applyProspectCheck(input: unknown): Promise<ProspectResult> {
  const parsed = z.object({ id: z.string().uuid(), check: researchCheckSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, check } = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase.from("prospects").select("sources").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "invalid" };
  const person = check.contact_name
    ? { contact_name: check.contact_name, contact_role: check.contact_role, contact_email: check.contact_email, contact_phone: check.contact_phone }
    : {};
  const { error } = await supabase
    .from("prospects")
    .update({
      ...(check.website ? { website: check.website } : {}),
      ...(check.email ? { email: check.email } : {}),
      ...(check.phone ? { phone: check.phone } : {}),
      ...(check.instagram ? { instagram: check.instagram.replace(/^@/, "") } : {}),
      ...person,
      ...(check.sponsorship_record ? { why: check.sponsorship_record.slice(0, 600) } : {}),
      sources: [...new Set([...check.sources, ...((current.sources as string[] | null) ?? [])])].slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  revalidatePath(PAGE, "page");
  return { ok: true, id };
}
