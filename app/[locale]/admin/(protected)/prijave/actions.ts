"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Staff-session actions — the registrations_staff_update RLS policy is the
// enforcement, same pattern as donacije/actions.ts.

export interface ActionResult {
  ok: boolean;
}

const bibSchema = z.object({
  registrationId: z.string().uuid(),
  bib: z.string().trim().max(10),
});

/** Assign (or clear) a bib number. */
export async function setBibNumber(input: unknown): Promise<ActionResult> {
  const parsed = bibSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("registrations")
    .update({ bib_number: parsed.data.bib === "" ? null : parsed.data.bib })
    .eq("id", parsed.data.registrationId)
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/prijave", "page");
  return { ok: true };
}

const cancelSchema = z.object({ registrationId: z.string().uuid() });

/** Cancel a registration (no-show, withdrawal before the start). */
export async function cancelRegistration(input: unknown): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("registrations")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.registrationId)
    .neq("status", "cancelled")
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/prijave", "page");
  return { ok: true };
}
