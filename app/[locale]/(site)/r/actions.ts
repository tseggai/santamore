"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type RedeemOutcome =
  | "ok"
  | "not_found"
  | "bad_pin"
  | "locked"
  | "already_redeemed"
  | "revoked"
  | "expired"
  | "invalid"
  | "server";

const schema = z.object({
  code: z.string().trim().min(4).max(16),
  pin: z.string().trim().regex(/^[0-9]{4,8}$/),
});

/**
 * Partner-side redemption. Anonymous by design — the cafe scans the code
 * off the athlete's phone and types its PIN; the database function does
 * the checking and the per-code throttling.
 */
export async function redeemAward(input: unknown): Promise<RedeemOutcome> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return "invalid";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_perk_award", {
    p_code: parsed.data.code,
    p_pin: parsed.data.pin,
  });
  if (error) {
    console.error("[perks] redeem failed:", error.code);
    return "server";
  }
  if (data === "ok") revalidatePath("/[locale]/r/[code]", "page");
  return (data as RedeemOutcome) ?? "server";
}
