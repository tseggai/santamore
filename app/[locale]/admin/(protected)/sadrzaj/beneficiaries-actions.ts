"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; beneficiaries_staff_all (migration 0041) enforces.
// A beneficiary is who the money reached: name, photo, website and a
// story in each language, optionally on the cause that reached them.

export interface BeneficiaryResult {
  ok: boolean;
  error?: "invalid" | "server";
  beneficiary?: { id: string; name: string };
}

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  website: z.string().trim().url().max(300).nullable(),
  /** Object path in the beneficiary-photos bucket; undefined leaves it as is. */
  photoPath: z.string().trim().max(300).nullable().optional(),
  story: z.object({ me: z.string().trim().max(6000), en: z.string().trim().max(6000), ru: z.string().trim().max(6000) }),
  campaignId: z.string().uuid().nullable(),
  isPublished: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function saveBeneficiary(input: unknown): Promise<BeneficiaryResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const row = {
    name: data.name,
    website: data.website,
    story: data.story,
    campaign_id: data.campaignId,
    is_published: data.isPublished,
    sort_order: data.sortOrder,
    updated_at: new Date().toISOString(),
    ...(data.photoPath !== undefined ? { photo_path: data.photoPath } : {}),
  };
  const insertWith = (slug: string) => supabase.from("beneficiaries").insert({ ...row, slug }).select("id, name").single();
  let result = data.id
    ? await supabase.from("beneficiaries").update(row).eq("id", data.id).select("id, name").single()
    : await insertWith(slugify(data.name, "korisnik"));
  if (result.error?.code === "23505" && !data.id) {
    result = await insertWith(`${slugify(data.name, "korisnik")}-${Math.random().toString(36).slice(2, 6)}`);
  }
  if (result.error || !result.data) {
    console.error("[admin] beneficiary save failed:", result.error?.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/admin/korisnici", "page");
  revalidatePath("/[locale]/korisnici", "page");
  revalidatePath("/[locale]/kampanje", "layout");
  return { ok: true, beneficiary: result.data };
}

export async function deleteBeneficiary(input: unknown): Promise<BeneficiaryResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: row } = await supabase.from("beneficiaries").select("photo_path").eq("id", parsed.data.id).maybeSingle();
  const { error } = await supabase.from("beneficiaries").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: "server" };
  const photos = supabase.storage.from("beneficiary-photos");
  const { data: files } = await photos.list(parsed.data.id);
  if (files && files.length > 0) await photos.remove(files.map((file) => `${parsed.data.id}/${file.name}`));
  if (row?.photo_path && !row.photo_path.startsWith(`${parsed.data.id}/`)) await photos.remove([row.photo_path]);
  revalidatePath("/[locale]/admin/korisnici", "page");
  revalidatePath("/[locale]/korisnici", "page");
  revalidatePath("/[locale]/kampanje", "layout");
  return { ok: true };
}
