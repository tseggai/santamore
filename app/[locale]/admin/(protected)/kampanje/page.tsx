
import { CampaignsManager, type CampaignRow } from "@/components/admin/CampaignsManager";
import type { GalleryAdminItem } from "@/components/admin/GalleryManager";
import { isAdmin } from "@/lib/server/access";
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ uredi?: string }>;
}) {
  const [{ locale }, { uredi }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  const [{ data: campaigns }, { data: chapters }, { data: events }, { data: totals }, { data: galleryRows }] =
    await Promise.all([
      supabase.from("campaigns").select("*").order("starts_at", { ascending: false }).limit(200),
      supabase.from("chapters").select("id, name").order("name"),
      supabase.from("events").select("campaign_id").limit(10_000),
      supabase.from("v_campaign_totals").select("id, raised_cents").limit(2000),
      supabase
        .from("gallery_items")
        .select("id, storage_path, caption, credit, is_published, event_id, campaign_id")
        .not("campaign_id", "is", null)
        .order("sort_order", { ascending: false })
        .limit(2000),
    ]);

  const eventCount = new Map<string, number>();
  for (const row of events ?? []) {
    if (row.campaign_id) eventCount.set(row.campaign_id, (eventCount.get(row.campaign_id) ?? 0) + 1);
  }
  // Raised per cause from the one money view (migration 0054): the same
  // figure the public cause page shows, for published and draft causes alike.
  const raised = new Map(((totals ?? []) as { id: string; raised_cents: number }[]).map((row) => [row.id, row.raised_cents]));
  const rows = ((campaigns ?? []) as Omit<CampaignRow, "raised_cents" | "events" | "gallery">[]).map(
    (campaign): CampaignRow => ({
      ...campaign,
      raised_cents: raised.get(campaign.id) ?? 0,
      events: eventCount.get(campaign.id) ?? 0,
      gallery: ((galleryRows ?? []) as GalleryAdminItem[]).filter((item) => item.campaign_id === campaign.id),
    }),
  );

  return (
    <div className="py-8">
      <CampaignsManager
        locale={locale as Locale}
        campaigns={rows}
        chapters={(chapters ?? []) as { id: string; name: string }[]}
        initialOpenId={uredi ?? ""}
        canManage={await isAdmin()}
      />
    </div>
  );
}
