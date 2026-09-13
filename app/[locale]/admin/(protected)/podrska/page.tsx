import { getTranslations } from "next-intl/server";

import {
  SupportersManager,
  type SponsorshipRow,
  type SupporterRow,
} from "@/components/admin/SupportersManager";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Supporters: every organisation behind us, with its sponsorships and offers. */
export default async function AdminSupportersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: supporters }, { data: sponsorships }, { data: offers }, { data: chapters }, { data: campaigns }, { data: events }] =
    await Promise.all([
      supabase.from("supporters").select("*").order("name"),
      supabase.from("sponsors").select("id, supporter_id, tier, chapter_id, campaign_id, event_id, amount_cents, is_in_kind, status").limit(1000),
      supabase.from("perk_challenges").select("id, supporter_id, title, reward_label, is_active, event_id").limit(1000),
      supabase.from("chapters").select("id, name").order("name"),
      supabase.from("campaigns").select("id, title").order("title"),
      supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
    ]);

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("supportersTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("supportersHint")}</p>
      <SupportersManager
        locale={locale as Locale}
        supporters={(supporters ?? []) as SupporterRow[]}
        sponsorships={(sponsorships ?? []) as SponsorshipRow[]}
        offers={(offers ?? []) as { id: string; supporter_id: string | null; title: string; reward_label: string; is_active: boolean; event_id: string | null }[]}
        chapters={(chapters ?? []) as { id: string; name: string }[]}
        campaigns={((campaigns ?? []) as { id: string; title: string }[]).map((c) => ({ id: c.id, name: c.title }))}
        events={(events ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
