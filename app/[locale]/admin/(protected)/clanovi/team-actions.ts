"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Staff-session actions; team_members_staff_all (migration 0042) enforces.
// A team record stands on its own; linking an account is optional and
// only ties the access level (set on the Accounts tab) to the person.

export interface TeamActionResult {
  ok: boolean;
  error?: "invalid" | "server" | "account_taken";
  /** The database's own words, for staff to act on. */
  detail?: string;
}

const schema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["officer", "staff", "board", "committee", "volunteer"]),
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).nullable(),
  quote: z.string().trim().max(600).nullable(),
  /** Object path in the team-photos bucket; undefined leaves it as is. */
  photoPath: z.string().trim().max(300).nullable().optional(),
  email: z.string().trim().email().max(120).nullable(),
  phone: z.string().trim().max(40).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  years: z.array(z.number().int().min(2000).max(2100)).max(50),
  isPublic: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  userId: z.string().uuid().nullable(),
});

export async function saveTeamMember(input: unknown): Promise<TeamActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const row = {
    kind: data.kind,
    full_name: data.fullName,
    title: data.title,
    quote: data.quote,
    email: data.email,
    phone: data.phone,
    notes: data.notes,
    years: [...new Set(data.years)].sort(),
    is_public: data.isPublic,
    sort_order: data.sortOrder,
    user_id: data.userId,
    updated_at: new Date().toISOString(),
    ...(data.photoPath !== undefined ? { photo_path: data.photoPath } : {}),
  };
  const { error } = data.id
    ? await supabase.from("team_members").update(row).eq("id", data.id)
    : await supabase.from("team_members").insert(row);
  if (error) {
    console.error("[admin] team member save failed:", error.code, error.message);
    if (error.code === "23505") return { ok: false, error: "account_taken", detail: `${error.code}: ${error.message}` };
    return { ok: false, error: "server", detail: `${error.code}: ${error.message}` };
  }
  revalidatePath("/[locale]/admin/clanovi", "layout");
  revalidatePath("/[locale]/o-nama", "page");
  revalidatePath("/[locale]/transparentnost", "page");
  return { ok: true };
}

export async function deleteTeamMember(input: unknown): Promise<TeamActionResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: "server", detail: `${error.code}: ${error.message}` };
  const photos = supabase.storage.from("team-photos");
  const { data: files } = await photos.list(parsed.data.id);
  if (files && files.length > 0) await photos.remove(files.map((file) => `${parsed.data.id}/${file.name}`));
  revalidatePath("/[locale]/admin/clanovi", "layout");
  revalidatePath("/[locale]/o-nama", "page");
  revalidatePath("/[locale]/transparentnost", "page");
  return { ok: true };
}
