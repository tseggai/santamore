"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generatePaymentReference } from "@/lib/references";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; cause_proposals_staff_update and
// cause_criteria_staff_all (migration 0029) are the enforcement.

export interface ProposalActionResult {
  ok: boolean;
  error?: "invalid" | "server";
  campaignId?: string;
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "shortlisted", "declined"]),
  note: z.string().trim().max(1000).nullable().optional(),
});

/** Shortlist, put back, or decline — with a note to file. */
export async function setProposalStatus(input: unknown): Promise<ProposalActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("cause_proposals")
    .update({
      status: parsed.data.status,
      ...(parsed.data.note !== undefined ? { staff_note: parsed.data.note } : {}),
      decided_at: parsed.data.status === "declined" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .neq("status", "chosen");
  if (error) return { ok: false, error: "server" };
  revalidatePath("/[locale]/admin/kampanje", "layout");
  revalidatePath("/[locale]/kampanje", "layout");
  return { ok: true };
}

/**
 * Choose a proposal: a draft cause is created from it (title, summary as
 * description, beneficiary line, the guessed goal) with its own payment
 * reference, and the proposal points at it. Staff finish the cause on
 * the Causes screen and make it public there.
 */
export async function chooseProposal(input: unknown): Promise<ProposalActionResult> {
  const parsed = z.object({ id: z.string().uuid(), chapterId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("cause_proposals")
    .select("id, title, summary, beneficiary, amount_cents, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!proposal || proposal.status === "chosen") return { ok: false, error: "invalid" };

  const base = slugify(proposal.title, "cilj");
  let campaignId: string | null = null;
  for (let attempt = 0; attempt < 5 && !campaignId; attempt += 1) {
    const { data: created, error } = await supabase
      .from("campaigns")
      .insert({
        title: proposal.title,
        slug: attempt === 0 ? base : `${base}-${attempt + 1}`,
        chapter_id: parsed.data.chapterId,
        description: proposal.summary,
        beneficiary_summary: proposal.beneficiary,
        goal_cents: proposal.amount_cents,
        is_public: false,
        payment_reference: generatePaymentReference(),
        suggested_amounts: {
          oneoff: [
            { amount_cents: 1000, impact_key: "impact10" },
            { amount_cents: 2500, default: true, impact_key: "impact25" },
            { amount_cents: 5000, impact_key: "impact50" },
          ],
          monthly: [{ amount_cents: 500 }, { amount_cents: 1000, default: true }, { amount_cents: 2000 }],
        },
      })
      .select("id")
      .single();
    if (!error && created) campaignId = created.id;
    else if (error && error.code !== "23505" && error.code !== "P0001") {
      console.error("[admin] cause from proposal failed:", error.code);
      return { ok: false, error: "server" };
    }
  }
  if (!campaignId) return { ok: false, error: "server" };

  const { error } = await supabase
    .from("cause_proposals")
    .update({ status: "chosen", campaign_id: campaignId, decided_at: new Date().toISOString() })
    .eq("id", proposal.id);
  if (error) return { ok: false, error: "server" };
  revalidatePath("/[locale]/admin/kampanje", "layout");
  revalidatePath("/[locale]/kampanje", "layout");
  return { ok: true, campaignId };
}

const criterionSchema = z.object({
  id: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).max(1000),
  questionMe: z.string().trim().min(4).max(300),
  questionEn: z.string().trim().min(4).max(300),
  questionRu: z.string().trim().min(4).max(300),
  disqualifyOn: z.boolean(),
  reasonMe: z.string().trim().min(4).max(500),
  reasonEn: z.string().trim().min(4).max(500),
  reasonRu: z.string().trim().min(4).max(500),
  isActive: z.boolean(),
});

export async function saveCriterion(input: unknown): Promise<ProposalActionResult> {
  const parsed = criterionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;
  const row = {
    sort_order: d.sortOrder,
    question_me: d.questionMe,
    question_en: d.questionEn,
    question_ru: d.questionRu,
    disqualify_on: d.disqualifyOn,
    reason_me: d.reasonMe,
    reason_en: d.reasonEn,
    reason_ru: d.reasonRu,
    is_active: d.isActive,
  };
  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from("cause_criteria").update(row).eq("id", d.id)
    : await supabase.from("cause_criteria").insert(row);
  if (error) return { ok: false, error: "server" };
  revalidatePath("/[locale]/admin/kampanje", "layout");
  revalidatePath("/[locale]/kampanje", "layout");
  return { ok: true };
}
