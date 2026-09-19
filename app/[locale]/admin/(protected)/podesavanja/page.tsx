import { getTranslations, setRequestLocale } from "next-intl/server";

import { SitePagesManager, type PickOptions, type SitePageRow } from "@/components/admin/SitePagesManager";
import { aboutContent } from "@/content/site/about";
import { howContent } from "@/content/site/how";
import { sectionsFromAbout, sectionsFromHow, type Section } from "@/lib/site-sections";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** The editorial pages, field by field, in every language. */
export default async function SettingsPagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data }, { data: team }, { data: supporters }, { data: beneficiaries }] = await Promise.all([
    supabase.from("site_pages").select("page, locale, content, updated_at"),
    supabase.from("team_members").select("id, full_name, kind, is_public").order("sort_order").order("full_name").limit(1000),
    supabase.from("supporters").select("id, name").eq("kind", "sponsor").order("name").limit(1000),
    supabase.from("beneficiaries").select("id, name, is_published").order("sort_order").order("name").limit(500),
  ]);
  const options: PickOptions = {
    team: (team ?? []) as PickOptions["team"],
    supporters: (supporters ?? []) as PickOptions["supporters"],
    beneficiaries: (beneficiaries ?? []) as PickOptions["beneficiaries"],
  };
  const locales = ["me", "en", "ru"] as const;
  const shipped: { about: Record<Locale, Section[]>; how: Record<Locale, Section[]> } = {
    about: Object.fromEntries(locales.map((loc) => [loc, sectionsFromAbout(aboutContent[loc])])) as Record<Locale, Section[]>,
    how: Object.fromEntries(locales.map((loc) => [loc, sectionsFromHow(howContent[loc])])) as Record<Locale, Section[]>,
  };
  return (
    <div className="pb-8">
      <p className="text-[14px] leading-relaxed text-black/60">{t("sitePagesHint")}</p>
      <div className="mt-4">
        <SitePagesManager rows={(data ?? []) as SitePageRow[]} shipped={shipped} locale={locale as Locale} options={options} />
      </div>
    </div>
  );
}
