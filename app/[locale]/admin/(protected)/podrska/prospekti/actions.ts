"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveSupporter } from "@/app/[locale]/admin/(protected)/podrska/actions";
import {
  PROSPECT_AREAS,
  PROSPECT_CHANNELS,
  PROSPECT_KINDS,
  PROSPECT_SECTORS,
  PROSPECT_STAGES,
  PROSPECT_TEMPLATES,
  PROSPECT_TIERS,
  followUpAfter,
  matchesCriteria,
} from "@/lib/prospects";
import { CATALOGUE } from "@/lib/server/prospect-catalogue";
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
  lang: z.enum(["me", "en"]),
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
