"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; disbursements_staff_* RLS policies enforce, and the
// immutability trigger (0001/0002) freezes published rows except paid_at.

export interface ActionResult {
  ok: boolean;
}

const createSchema = z.object({
  chapterId: z.string().uuid(),
  label: z.string().trim().min(3).max(200),
  privateNote: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(80).optional(),
  amountCents: z.number().int().positive().max(MAX_CENTS),
  committeeRef: z.string().trim().max(120).optional(),
  decidedAtIso: z.string().datetime().optional(),
  documentationPaths: z.array(z.string().trim().min(1).max(300)).max(20),
});

/** Record a decided disbursement as a draft (publish is a separate step). */
export async function createDisbursement(input: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("disbursements").insert({
    chapter_id: data.chapterId,
    beneficiary_label: data.label,
    beneficiary_private_note: data.privateNote || null,
    category: data.category || null,
    amount_cents: data.amountCents,
    committee_decision_ref: data.committeeRef || null,
    decided_at: data.decidedAtIso ?? null,
    documentation_paths: data.documentationPaths,
  });
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/isplate", "page");
  return { ok: true };
}

const idSchema = z.object({ disbursementId: z.string().uuid() });

/** Publish to the public ledger — the row freezes (append-only from here). */
export async function publishDisbursement(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("disbursements")
    .update({ published_at: new Date().toISOString() })
    .eq("id", parsed.data.disbursementId)
    .is("published_at", null)
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/isplate", "page");
  revalidatePath("/[locale]/transparentnost", "page");
  return { ok: true };
}

/** Record the actual payout date (the one change a published row allows). */
export async function markDisbursementPaid(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("disbursements")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", parsed.data.disbursementId)
    .is("paid_at", null)
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/isplate", "page");
  revalidatePath("/[locale]/transparentnost", "page");
  return { ok: true };
}
