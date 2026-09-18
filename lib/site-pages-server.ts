import { mergePageContent, type PageContent, type SitePage } from "@/lib/site-pages";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

/**
 * A page as the site shows it: the shipped copy with what staff saved laid
 * over it. Any trouble reading the database leaves the shipped copy.
 */
export async function loadSitePage<T extends object>(page: SitePage, locale: Locale, shipped: T): Promise<T> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("v_public_site_pages").select("content").eq("page", page).eq("locale", locale).maybeSingle();
    return mergePageContent(shipped, (data?.content ?? null) as PageContent | null, page);
  } catch {
    return shipped;
  }
}
