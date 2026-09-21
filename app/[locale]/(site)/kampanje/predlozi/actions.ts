"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { failedCriteria } from "@/lib/proposals";
import { createClient } from "@/lib/supabase/server";

// Member-session actions; the cause_proposals_* and cause_votes_own
// policies (migration 0029) are the enforcement. Screening is judged HERE,
// against the live criteria — the form's early warning is a courtesy.

const proposeSchema = z.object({
  title: z.string().trim().min(4).max(120),
  summary: z.string().trim().min(40).max(2000),
  location: z.string().trim().max(120).nullable(),
  beneficiary: z.string().trim().max(200).nullable(),
  amountCents: z.number().int().min(0).max(MAX_CENTS).nullable(),
  /** Where people can read more, and one picture (a path in proposal-photos under the proposer's folder). */
  linkUrl: z.string().trim().url().max(300).nullable(),
  photoPath: z.string().trim().max(200).regex(/^[0-9a-f-]{36}\/[\w.-]+$/).nullable(),
  answers: z.record(z.string().uuid(), z.boolean()),
  locale: z.enum(["me", "en", "ru"]),
});

export interface ProposeResult {
  ok: boolean;
  error?: "invalid" | "unanswered" | "server";
  /** Screening turned it down: the reasons, in the proposer's language. */
  rejected?: string[];
  id?: string;
}

interface CriterionRow {
  id: string;
  disqualify_on: boolean;
  reason_me: string;
  reason_en: string;
  reason_ru: string;
}

export async function proposeCause(input: unknown): Promise<ProposeResult> {
  const parsed = proposeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "server" };

  const { data: criteriaRows } = await supabase.from("v_public_cause_criteria").select("id, disqualify_on, reason_me, reason_en, reason_ru");
  const criteria = (criteriaRows ?? []) as CriterionRow[];
  if (criteria.some((criterion) => typeof data.answers[criterion.id] !== "boolean")) return { ok: false, error: "unanswered" };
  const failed = failedCriteria(criteria, data.answers);
  const reasons = failed.map((criterion) => criterion[`reason_${data.locale}` as const]);

  if (data.photoPath && !data.photoPath.startsWith(`${user.id}/`)) return { ok: false, error: "invalid" };
  const { data: row, error } = await supabase
    .from("cause_proposals")
    .insert({
      proposer_id: user.id,
      title: data.title,
      summary: data.summary,
      location: data.location,
      beneficiary: data.beneficiary,
      amount_cents: data.amountCents,
      link_url: data.linkUrl,
      photo_path: data.photoPath,
      status: failed.length > 0 ? "rejected" : "open",
      // Stored in English so staff read one language in the console.
      rejection_reasons: failed.map((criterion) => criterion.reason_en),
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[proposals] insert failed:", error?.code);
    return { ok: false, error: "server" };
  }
  if (failed.length > 0) return { ok: true, rejected: reasons, id: row.id };
  revalidatePath("/[locale]/kampanje", "layout");
  return { ok: true, id: row.id };
}

export interface VoteResult {
  ok: boolean;
  error?: "invalid" | "server" | "closed";
}

/** One vote per member per proposal; calling again takes it back. */
export async function toggleVote(input: unknown): Promise<VoteResult> {
  const parsed = z.object({ proposalId: z.string().uuid(), on: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "server" };
  // The insert trigger guards the way in; the way out is guarded here.
  const { data: proposal } = await supabase.from("v_public_cause_proposals").select("status").eq("id", parsed.data.proposalId).maybeSingle();
  if (!proposal || (proposal.status !== "open" && proposal.status !== "shortlisted")) return { ok: false, error: "closed" };
  // A plain insert: members hold insert and delete on cause_votes, not
  // update, so an upsert (insert … on conflict do update) is refused.
  const { error } = parsed.data.on
    ? await supabase.from("cause_votes").insert({ proposal_id: parsed.data.proposalId, user_id: user.id })
    : await supabase.from("cause_votes").delete().eq("proposal_id", parsed.data.proposalId).eq("user_id", user.id);
  if (error && error.code !== "23505") {
    console.error("[proposals] vote failed:", error.code, error.message);
    return { ok: false, error: error.code === "P0001" ? "closed" : "server" };
  }
  revalidatePath("/[locale]/kampanje", "layout");
  return { ok: true };
}

export interface EditProposalResult {
  ok: boolean;
  error?: "invalid" | "server" | "closed" | "voted";
}

/**
 * The proposer rewrites their own proposal while it is open and no one has
 * voted yet (update_my_proposal, migration 0058, enforces all three).
 */
export async function updateProposal(input: unknown): Promise<EditProposalResult> {
  const parsed = proposeSchema
    .omit({ answers: true, locale: true })
    .extend({ proposalId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("update_my_proposal", {
    p_id: data.proposalId,
    p_title: data.title,
    p_summary: data.summary,
    p_location: data.location,
    p_beneficiary: data.beneficiary,
    p_amount_cents: data.amountCents,
    p_link_url: data.linkUrl,
    p_photo_path: data.photoPath,
  });
  if (error) {
    console.error("[proposals] update failed:", error.code, error.message);
    return { ok: false, error: "server" };
  }
  const row = result as { ok: boolean; reason?: string };
  if (!row.ok) return { ok: false, error: row.reason === "voted" ? "voted" : "closed" };
  revalidatePath("/[locale]/kampanje", "layout");
  revalidatePath("/[locale]/predlozi", "page");
  return { ok: true };
}

/** The proposer withdraws their proposal under the same rule as an edit (delete_my_proposal, migration 0060). */
export async function deleteProposal(input: unknown): Promise<EditProposalResult> {
  const parsed = z.object({ proposalId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("delete_my_proposal", { p_id: parsed.data.proposalId });
  if (error) {
    console.error("[proposals] delete failed:", error.code, error.message);
    return { ok: false, error: "server" };
  }
  const row = result as { ok: boolean; reason?: string };
  if (!row.ok) return { ok: false, error: row.reason === "voted" ? "voted" : "closed" };
  revalidatePath("/[locale]/kampanje", "layout");
  revalidatePath("/[locale]", "page");
  return { ok: true };
}
