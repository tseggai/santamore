"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Admin-only: the profile a member shows on /o-nama and their access
// level, written through set_member_profile() (migration 0040), a definer
// RPC that refuses anyone but an admin and never lets an admin demote
// themselves.

export interface MemberActionResult {
  ok: boolean;
  error?: "invalid" | "forbidden" | "server";
}

const schema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).nullable(),
  quote: z.string().trim().max(600).nullable(),
  /** Object path in the team-photos bucket; undefined leaves it as is. */
  photoPath: z.string().trim().max(300).nullable(),
  isTeam: z.boolean(),
  teamOrder: z.number().int().min(0).max(999),
  role: z.enum(["member", "chapter_lead", "admin"]),
});

export async function saveMemberProfile(input: unknown): Promise<MemberActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_profile", {
    p_id: data.id,
    p_full_name: data.fullName,
    p_title: data.title,
    p_quote: data.quote,
    p_photo_path: data.photoPath,
    p_is_team: data.isTeam,
    p_team_order: data.teamOrder,
    p_role: data.role,
  });
  if (error) {
    console.error("[admin] member profile save failed:", error.code);
    return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  }
  revalidatePath("/[locale]/admin/clanovi", "page");
  revalidatePath("/[locale]/o-nama", "page");
  return { ok: true };
}
