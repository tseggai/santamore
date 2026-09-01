"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Staff-session actions; fundraisers_staff_update / donations_staff_update
// RLS policies are the enforcement.

export interface ActionResult {
  ok: boolean;
}

const statusSchema = z.object({
  fundraiserId: z.string().uuid(),
  status: z.enum(["active", "hidden"]),
});

/**
 * Activate or hide a page. Draft → active is normally the owner's move
 * (through the publish gate); staff use this to reinstate or hide.
 */
export async function setFundraiserModeration(input: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fundraisers")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.fundraiserId)
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/prikupljaci", "page");
  return { ok: true };
}

const messageSchema = z.object({
  donationId: z.string().uuid(),
  hidden: z.boolean(),
});

/** Hide or restore one donor-wall message (the donation itself is untouched). */
export async function setMessageHidden(input: unknown): Promise<ActionResult> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("donations")
    .update({ is_message_hidden: parsed.data.hidden })
    .eq("id", parsed.data.donationId)
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/prikupljaci", "page");
  return { ok: true };
}
