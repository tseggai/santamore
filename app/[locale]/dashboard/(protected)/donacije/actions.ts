"use server";

import { z } from "zod";

import { sendReceiptFor } from "@/lib/email/receipt";
import { createClient } from "@/lib/supabase/server";

export interface GivingActionResult {
  ok: boolean;
  error?: "invalid" | "not_yours" | "server";
}

/**
 * Re-send the receipt for one of MY approved donations. Ownership is
 * proven by reading the row through v_my_donations, which only returns
 * donations made with the signed-in (verified) email.
 */
export async function resendMyReceipt(input: unknown): Promise<GivingActionResult> {
  const parsed = z.object({ donationId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_my_donations")
    .select("id, status")
    .eq("id", parsed.data.donationId)
    .maybeSingle();
  if (!data || data.status !== "approved") return { ok: false, error: "not_yours" };

  const sent = await sendReceiptFor(data.id);
  return sent ? { ok: true } : { ok: false, error: "server" };
}
