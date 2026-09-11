import { getTranslations } from "next-intl/server";

import { SponsorsManager, type SponsorRow } from "@/components/admin/SponsorsManager";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Brief §4: /admin/partneri — the sponsor pipeline, tied to campaigns and events. */
export default async function AdminSponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: sponsors }, { data: chapters }, { data: campaigns }, { data: events }] =
    await Promise.all([
      supabase.from("sponsors").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("chapters").select("id, name").order("name"),
      supabase.from("campaigns").select("id, title").order("title"),
      supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
    ]);

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("sponsorsTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink/60">{t("sponsorsHint")}</p>
      <SponsorsManager
        locale={locale as Locale}
        sponsors={(sponsors ?? []) as SponsorRow[]}
        chapters={(chapters ?? []) as { id: string; name: string }[]}
        campaigns={((campaigns ?? []) as { id: string; title: string }[]).map((c) => ({ id: c.id, name: c.title }))}
        events={(events ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
