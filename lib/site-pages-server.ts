import { mergePageContent, type PageContent, type SitePage } from "@/lib/site-pages";
import { sectionsOf, type Section } from "@/lib/site-sections";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

/**
 * A page as the site shows it. Saved as sections (the current editor):
 * those sections. Saved as fields (the earlier editor): the shipped copy
 * with the fields laid over it. Nothing saved, or trouble reading: the
 * shipped copy.
 */
export async function loadSitePage<T extends object>(page: SitePage, locale: Locale, shipped: T): Promise<{ sections: Section[] | null; content: T }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("v_public_site_pages").select("content").eq("page", page).eq("locale", locale).maybeSingle();
    const sections = sectionsOf(data?.content);
    return { sections, content: sections ? shipped : mergePageContent(shipped, (data?.content ?? null) as PageContent | null, page) };
  } catch {
    return { sections: null, content: shipped };
  }
}
