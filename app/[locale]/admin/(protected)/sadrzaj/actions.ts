"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

// Staff-session actions; posts_staff_all / gallery_staff_all RLS policies
// are the enforcement.

export interface ActionResult {
  ok: boolean;
}

const postSchema = z.object({
  id: z.string().uuid().optional(),
  locale: z.enum(routing.locales),
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(500).optional(),
  bodyMd: z.string().trim().min(1).max(50_000),
  coverPath: z.string().trim().max(300).optional(),
  published: z.boolean(),
});

/** Create or update one post (per-locale row; same slug links translations). */
export async function savePost(input: unknown): Promise<ActionResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const data = parsed.data;
  const slug = slugify(data.slug);
  if (!slug) return { ok: false };

  const supabase = await createClient();

  if (data.id) {
    const { data: existing } = await supabase
      .from("posts")
      .select("published_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) return { ok: false };
    const { error } = await supabase
      .from("posts")
      .update({
        locale: data.locale,
        slug,
        title: data.title,
        excerpt: data.excerpt || null,
        body_md: data.bodyMd,
        cover_path: data.coverPath || null,
        published_at: data.published
          ? (existing.published_at ?? new Date().toISOString())
          : null,
      })
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) return { ok: false };
  } else {
    const { error } = await supabase.from("posts").insert({
      locale: data.locale,
      slug,
      title: data.title,
      excerpt: data.excerpt || null,
      body_md: data.bodyMd,
      cover_path: data.coverPath || null,
      published_at: data.published ? new Date().toISOString() : null,
    });
    if (error) return { ok: false };
  }

  revalidatePath("/[locale]/admin/sadrzaj", "page");
  revalidatePath("/[locale]/vijesti", "page");
  return { ok: true };
}

const galleryBatchSchema = z.object({
  eventId: z.string().uuid().nullable(),
  caption: z.string().trim().max(300).optional(),
  credit: z.string().trim().max(120).optional(),
  publish: z.boolean(),
  paths: z.array(z.string().trim().min(1).max(300)).min(1).max(40),
});

/** Register a batch of already-uploaded gallery files as items. */
export async function addGalleryItems(input: unknown): Promise<ActionResult> {
  const parsed = galleryBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const data = parsed.data;

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("gallery_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const base = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("gallery_items").insert(
    data.paths.map((path, index) => ({
      event_id: data.eventId,
      storage_path: path,
      caption: data.caption || null,
      credit: data.credit || null,
      sort_order: base + index,
      is_published: data.publish,
    })),
  );
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/sadrzaj", "page");
  revalidatePath("/[locale]/galerija", "page");
  return { ok: true };
}

const galleryToggleSchema = z.object({
  itemId: z.string().uuid(),
  published: z.boolean(),
});

export async function setGalleryPublished(input: unknown): Promise<ActionResult> {
  const parsed = galleryToggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_items")
    .update({ is_published: parsed.data.published })
    .eq("id", parsed.data.itemId)
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/sadrzaj", "page");
  revalidatePath("/[locale]/galerija", "page");
  return { ok: true };
}

const galleryDeleteSchema = z.object({ itemId: z.string().uuid() });

/** Remove a gallery item (photo taken down, e.g. consent withdrawn). */
export async function deleteGalleryItem(input: unknown): Promise<ActionResult> {
  const parsed = galleryDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("gallery_items")
    .select("storage_path")
    .eq("id", parsed.data.itemId)
    .maybeSingle();
  if (!item) return { ok: false };

  const { error } = await supabase
    .from("gallery_items")
    .delete()
    .eq("id", parsed.data.itemId);
  if (error) return { ok: false };

  // Best-effort: consent withdrawal means the file itself must go too.
  await supabase.storage.from("gallery").remove([item.storage_path]);

  revalidatePath("/[locale]/admin/sadrzaj", "page");
  revalidatePath("/[locale]/galerija", "page");
  return { ok: true };
}
