"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sectionsSchema } from "@/lib/site-sections";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

// Staff-session action; site_pages_staff_all (migration 0040) enforces.
// One row per page and locale holds that language's sections; the
// structure and the assets are the same in every row, the text differs.

export interface SitePageResult {
  ok: boolean;
  error?: "invalid" | "server";
}

const schema = z.object({
  page: z.enum(["about", "how"]),
  locale: z.enum(routing.locales),
  content: z.object({ sections: sectionsSchema }),
});

export async function saveSitePage(input: unknown): Promise<SitePageResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { page, locale, content } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("site_pages")
    .upsert({ page, locale, content, updated_at: new Date().toISOString(), updated_by: user?.id ?? null }, { onConflict: "page,locale" });
  if (error) {
    console.error("[admin] site page save failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/o-nama", "page");
  revalidatePath("/[locale]/kako-radimo", "page");
  revalidatePath("/[locale]/admin/podesavanja", "layout");
  return { ok: true };
}
