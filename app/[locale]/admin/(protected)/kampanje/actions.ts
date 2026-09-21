"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { generatePaymentReference } from "@/lib/references";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; campaigns_staff_* RLS policies (migration 0008)
// are the enforcement. The payment reference — the SEPA matching key — is
// minted server-side on creation and never changes afterwards.

export interface CampaignActionResult {
  ok: boolean;
  error?: "invalid" | "slug" | "server";
}

const isoDate = z.string().datetime({ offset: true });
const amounts = z.array(z.number().int().min(100).max(MAX_CENTS)).min(1).max(6);

const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(1).max(100),
  chapterId: z.string().uuid(),
  description: z.string().trim().max(2000).nullable(),
  goalCents: z.number().int().min(0).max(MAX_CENTS).nullable(),
  startsAt: isoDate.nullable(),
  endsAt: isoDate.nullable(),
  beneficiarySummary: z.string().trim().max(1000).nullable(),
  isPublic: z.boolean(),
  coverPath: z.string().trim().max(300).nullable().optional(),
  oneoffCents: amounts,
  oneoffDefaultIndex: z.number().int().min(0),
  monthlyCents: amounts,
  monthlyDefaultIndex: z.number().int().min(0),
});

// The donate flow reads {oneoff, monthly} with an optional impact_key per
// amount; the keys exist in messages/*.json for the three launch amounts.
const IMPACT_KEYS: Record<number, string> = { 1000: "impact10", 2500: "impact25", 5000: "impact50" };

function buildSet(cents: number[], defaultIndex: number, withImpact: boolean) {
  return cents.map((amount, index) => ({
    amount_cents: amount,
    ...(index === defaultIndex ? { default: true } : {}),
    ...(withImpact && IMPACT_KEYS[amount] ? { impact_key: IMPACT_KEYS[amount] } : {}),
  }));
}

export async function saveCampaign(input: unknown): Promise<CampaignActionResult> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const slug = slugify(data.slug, "");
  if (!slug) return { ok: false, error: "invalid" };
  if (
    data.oneoffDefaultIndex >= data.oneoffCents.length ||
    data.monthlyDefaultIndex >= data.monthlyCents.length
  ) {
    return { ok: false, error: "invalid" };
  }

  const row = {
    title: data.title,
    slug,
    chapter_id: data.chapterId,
    description: data.description,
    goal_cents: data.goalCents,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    beneficiary_summary: data.beneficiarySummary,
    is_public: data.isPublic,
    ...(data.coverPath !== undefined ? { cover_path: data.coverPath } : {}),
    suggested_amounts: {
      oneoff: buildSet(data.oneoffCents, data.oneoffDefaultIndex, true),
      monthly: buildSet(data.monthlyCents, data.monthlyDefaultIndex, false),
    },
  };

  const supabase = await createClient();
  if (data.id) {
    const { error } = await supabase
      .from("campaigns")
      .update(row)
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, error: "slug" };
      console.error("[admin] campaign update failed:", error.code);
      return { ok: false, error: "server" };
    }
  } else {
    // Reference collisions (23505 on the unique key, P0001 from the
    // cross-table trigger) warrant a fresh mint; a slug collision does not.
    let saved = false;
    for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
      const { error } = await supabase
        .from("campaigns")
        .insert({ ...row, payment_reference: generatePaymentReference() })
        .select("id")
        .single();
      if (!error) saved = true;
      else if (error.code === "23505" && /slug/.test(error.message)) {
        return { ok: false, error: "slug" };
      } else if (error.code !== "23505" && error.code !== "P0001") {
        console.error("[admin] campaign create failed:", error.code);
        return { ok: false, error: "server" };
      }
    }
    if (!saved) return { ok: false, error: "server" };
  }

  revalidatePath("/[locale]/admin/kampanje", "page");
  revalidatePath("/[locale]/podrzi", "page");
  revalidatePath("/[locale]", "page");
  return { ok: true };
}

/** Make causes public or draft without touching anything else. */
export async function setCampaignsPublic(input: unknown): Promise<CampaignActionResult> {
  const parsed = z
    .object({ ids: z.array(z.string().uuid()).min(1).max(200), isPublic: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ is_public: parsed.data.isPublic })
    .in("id", parsed.data.ids);
  if (error) return { ok: false, error: "server" };

  revalidatePath("/[locale]/admin/kampanje", "page");
  revalidatePath("/[locale]/kampanje", "layout");
  revalidatePath("/[locale]", "page");
  return { ok: true };
}

export type CampaignDeleteReason = "donations" | "handovers" | "pages" | "teams" | "missing";

export interface CampaignDeleteResult {
  ok: boolean;
  error?: "invalid" | "server";
  /** The database's own words when the call itself failed. */
  detail?: string;
  /** Causes that were refused, each with why (see delete_campaign, migration 0048). */
  blocked: { name: string; reason: CampaignDeleteReason; count: number }[];
  deleted: number;
}

/**
 * Delete causes added by mistake. The database refuses any cause with
 * donations, hand-overs, fundraising pages or teams; the rest go, and
 * their events, sponsorships, photos, proposals, beneficiaries and year
 * reports lose the link. Admin only (enforced in SQL).
 */
export async function deleteCampaigns(input: unknown): Promise<CampaignDeleteResult> {
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", blocked: [], deleted: 0 };

  const supabase = await createClient();
  const { data: rows } = await supabase.from("campaigns").select("id, cover_path").in("id", parsed.data.ids);
  const covers = new Map((rows ?? []).map((r) => [r.id as string, r.cover_path as string | null]));

  const blocked: CampaignDeleteResult["blocked"] = [];
  let deleted = 0;
  for (const id of parsed.data.ids) {
    const { data, error } = await supabase.rpc("delete_campaign", { p_id: id });
    if (error) {
      console.error("[admin] cause delete failed:", error.code, error.message);
      return { ok: false, error: "server", detail: `${error.code}: ${error.message}`, blocked, deleted };
    }
    const result = data as { ok: boolean; reason?: CampaignDeleteReason; count?: number; name?: string };
    if (!result.ok) {
      blocked.push({ name: result.name ?? "", reason: result.reason ?? "missing", count: Number(result.count ?? 0) });
      continue;
    }
    deleted += 1;
    // The cover lives under covers/causes/<id>/ (or a new-<uuid> folder).
    const path = covers.get(id);
    const folder = path && path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : `covers/causes/${id}`;
    const bucket = supabase.storage.from("gallery");
    const { data: files } = await bucket.list(folder);
    if (files && files.length > 0) await bucket.remove(files.map((file) => `${folder}/${file.name}`));
  }

  if (deleted > 0) {
    revalidatePath("/[locale]/admin", "layout");
    revalidatePath("/[locale]/kampanje", "layout");
    revalidatePath("/[locale]", "page");
  }
  return { ok: true, blocked, deleted };
}

/** Close a cause by decision (migration 0063): no more gifts, no new pages, every surface says so. Or reopen it. */
export async function setCampaignsCompleted(input: unknown): Promise<CampaignActionResult> {
  const parsed = z
    .object({ ids: z.array(z.string().uuid()).min(1).max(200), completed: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ completed_at: parsed.data.completed ? new Date().toISOString() : null })
    .in("id", parsed.data.ids);
  if (error) return { ok: false, error: "server" };

  revalidatePath("/[locale]/admin/kampanje", "page");
  revalidatePath("/[locale]/kampanje", "layout");
  revalidatePath("/[locale]/dashboard", "layout");
  revalidatePath("/[locale]", "page");
  return { ok: true };
}
