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

export type PeopleDeleteReason = "donations" | "missing";

export interface PeopleDeleteResult {
  ok: boolean;
  error?: "invalid" | "server";
  /** The database's own words when the call itself failed. */
  detail?: string;
  /** Rows that were refused, each with why (see migration 0049). */
  blocked: { name: string; reason: PeopleDeleteReason; count: number }[];
  deleted: number;
}

type DeleteRow = { ok: boolean; reason?: PeopleDeleteReason; count?: number; name?: string; photo_path?: string | null };

/**
 * Delete fundraising teams added by mistake. Their pages are unlinked and
 * keep every euro; a team whose pages took donations is refused. Admin
 * only (enforced in SQL).
 */
export async function deleteTeams(input: unknown): Promise<PeopleDeleteResult> {
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", blocked: [], deleted: 0 };
  const supabase = await createClient();
  const blocked: PeopleDeleteResult["blocked"] = [];
  let deleted = 0;
  for (const id of parsed.data.ids) {
    const { data, error } = await supabase.rpc("delete_team", { p_id: id });
    if (error) {
      console.error("[admin] team delete failed:", error.code, error.message);
      return { ok: false, error: "server", detail: `${error.code}: ${error.message}`, blocked, deleted };
    }
    const result = data as DeleteRow;
    if (!result.ok) {
      blocked.push({ name: result.name ?? "", reason: result.reason ?? "missing", count: Number(result.count ?? 0) });
      continue;
    }
    deleted += 1;
  }
  if (deleted > 0) {
    revalidatePath("/[locale]/admin/clanovi", "layout");
    revalidatePath("/[locale]/admin/dogadjaji", "layout");
    revalidatePath("/[locale]/prikupljaci", "page");
  }
  return { ok: true, blocked, deleted };
}

/**
 * Delete a fundraising page added by mistake. Refused once a donation
 * names it; otherwise its ask list, activities and photo go with it.
 * Admin only (enforced in SQL).
 */
export async function deleteFundraiser(input: unknown): Promise<PeopleDeleteResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", blocked: [], deleted: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_fundraiser", { p_id: parsed.data.id });
  if (error) {
    console.error("[admin] page delete failed:", error.code, error.message);
    return { ok: false, error: "server", detail: `${error.code}: ${error.message}`, blocked: [], deleted: 0 };
  }
  const result = data as DeleteRow;
  if (!result.ok) {
    return { ok: true, blocked: [{ name: result.name ?? "", reason: result.reason ?? "missing", count: Number(result.count ?? 0) }], deleted: 0 };
  }
  if (result.photo_path) await supabase.storage.from("fundraiser-photos").remove([result.photo_path]);
  revalidatePath("/[locale]/admin/clanovi", "layout");
  revalidatePath("/[locale]/admin/dogadjaji", "layout");
  revalidatePath("/[locale]/prikupljaci", "page");
  return { ok: true, blocked: [], deleted: 1 };
}
