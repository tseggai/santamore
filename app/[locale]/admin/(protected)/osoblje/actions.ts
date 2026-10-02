"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Admin-only: an account's name and access level, written through
// set_member_access() (migration 0069), a definer RPC that refuses anyone
// but an admin and never lets an admin demote themselves. What the person
// shows on /o-nama is their team record (team-actions.ts).

export interface MemberActionResult {
  ok: boolean;
  error?: "invalid" | "forbidden" | "server";
}

const schema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["member", "accounting", "chapter_lead", "admin"]),
});

export async function saveMemberAccess(input: unknown): Promise<MemberActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_access", {
    p_id: data.id,
    p_full_name: data.fullName,
    p_role: data.role,
  });
  if (error) {
    console.error("[admin] member access save failed:", error.code);
    return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  }
  revalidatePath("/[locale]/admin", "layout");
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
    revalidatePath("/[locale]/admin", "layout");
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
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/admin/dogadjaji", "layout");
  revalidatePath("/[locale]/prikupljaci", "page");
  return { ok: true, blocked: [], deleted: 1 };
}
