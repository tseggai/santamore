import { getTranslations, setRequestLocale } from "next-intl/server";

import { SitePagesManager, type SitePageRow } from "@/components/admin/SitePagesManager";
import { aboutContent } from "@/content/site/about";
import { howContent } from "@/content/site/how";
import type { PageContent } from "@/lib/site-pages";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** The editorial pages, field by field, in every language. */
export default async function SettingsPagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("site_pages").select("page, locale, content, updated_at");
  const shipped = {
    about: aboutContent as unknown as Record<Locale, PageContent>,
    how: howContent as unknown as Record<Locale, PageContent>,
  };
  return (
    <div className="pb-8">
      <p className="text-[14px] leading-relaxed text-black/60">{t("sitePagesHint")}</p>
      <div className="mt-4">
        <SitePagesManager rows={(data ?? []) as SitePageRow[]} shipped={shipped} locale={locale as Locale} />
      </div>
    </div>
  );
}
