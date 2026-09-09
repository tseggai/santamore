import { getTranslations } from "next-intl/server";

import { CampaignsManager, type CampaignRow } from "@/components/admin/CampaignsManager";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Campaigns are the money side of an event: the SEPA reference donors pay
 * to, the suggested amounts on /podrzi, the goal and the beneficiary line.
 * Events hang off a campaign; several events can share one.
 */
export default async function AdminCampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: campaigns }, { data: chapters }, { data: events }, { data: donations }] =
    await Promise.all([
      supabase.from("campaigns").select("*").order("starts_at", { ascending: false }).limit(200),
      supabase.from("chapters").select("id, name").order("name"),
      supabase.from("events").select("campaign_id").limit(10_000),
      supabase
        .from("donations")
        .select("campaign_id, net_cents")
        .eq("status", "approved")
        .not("campaign_id", "is", null)
        .limit(10_000),
    ]);

  const eventCount = new Map<string, number>();
  for (const row of events ?? []) {
    if (row.campaign_id) eventCount.set(row.campaign_id, (eventCount.get(row.campaign_id) ?? 0) + 1);
  }
  const raised = new Map<string, number>();
  for (const row of donations ?? []) {
    if (row.campaign_id) raised.set(row.campaign_id, (raised.get(row.campaign_id) ?? 0) + row.net_cents);
  }

  const rows = ((campaigns ?? []) as Omit<CampaignRow, "raised_cents" | "events">[]).map(
    (campaign): CampaignRow => ({
      ...campaign,
      raised_cents: raised.get(campaign.id) ?? 0,
      events: eventCount.get(campaign.id) ?? 0,
    }),
  );

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("campaignsTitle")}</h1>
      <p className="mt-1 text-[13px] text-ink/60">{t("campaignsHint")}</p>
      <CampaignsManager
        locale={locale as Locale}
        campaigns={rows}
        chapters={(chapters ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
