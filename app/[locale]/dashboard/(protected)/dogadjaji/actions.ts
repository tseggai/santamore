"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const rsvpSchema = z.object({
  eventId: z.string().uuid(),
  status: z.enum(["going", "interested"]).nullable(),
});

export interface RsvpResult {
  ok: boolean;
  error?: "invalid" | "server";
}

/** Going / interested / neither — the member's own row, under RLS. */
export async function setRsvp(input: unknown): Promise<RsvpResult> {
  const parsed = rsvpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "server" };

  // Only published events take RSVPs.
  const { data: event } = await supabase
    .from("v_public_events")
    .select("id")
    .eq("id", parsed.data.eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "invalid" };

  const { error } = parsed.data.status
    ? await supabase.from("event_rsvps").upsert(
        {
          event_id: parsed.data.eventId,
          user_id: user.id,
          status: parsed.data.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,user_id" },
      )
    : await supabase
        .from("event_rsvps")
        .delete()
        .eq("event_id", parsed.data.eventId)
        .eq("user_id", user.id);
  if (error) {
    console.error("[dashboard] rsvp failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
