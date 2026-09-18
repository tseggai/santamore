"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PAGE_FIELDS, isValidField, type PageContent, type SitePage } from "@/lib/site-pages";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

// Staff-session action; site_pages_staff_all (migration 0040) enforces.
// One row per page and locale holds the fields staff changed; the site
// lays them over the shipped copy.

export interface SitePageResult {
  ok: boolean;
  error?: "invalid" | "server";
}

const schema = z.object({
  page: z.enum(["about", "how"]),
  locale: z.enum(routing.locales),
  content: z.record(z.string(), z.unknown()),
});

export async function saveSitePage(input: unknown): Promise<SitePageResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { page, locale, content } = parsed.data;
  // Keep only the page's own fields, each well-formed for its kind.
  const clean: PageContent = {};
  for (const spec of PAGE_FIELDS[page as SitePage]) {
    const value = content[spec.key];
    if (value === undefined || value === null) continue;
    if (!isValidField(spec, value)) return { ok: false, error: "invalid" };
    clean[spec.key] = value as PageContent[string];
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("site_pages")
    .upsert({ page, locale, content: clean, updated_at: new Date().toISOString(), updated_by: user?.id ?? null }, { onConflict: "page,locale" });
  if (error) {
    console.error("[admin] site page save failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/o-nama", "page");
  revalidatePath("/[locale]/kako-radimo", "page");
  revalidatePath("/[locale]/admin/podesavanja", "layout");
  return { ok: true };
}
