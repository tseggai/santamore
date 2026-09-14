import { getTranslations } from "next-intl/server";

import { EventsManager, type EventListRow } from "@/components/admin/EventsManager";
import type { GalleryAdminItem } from "@/components/admin/GalleryManager";
import type { PerkChallengeAdminRow } from "@/components/admin/OffersPanel";
import { localToday } from "@/lib/strava/sync";
import { createClient } from "@/lib/supabase/server";
import { stravaWebhookStatus } from "../izazovi/actions";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  name: string;
  slug: string;
  kind: "race" | "challenge" | "social";
  challenge_metric: string | null;
  chapter_id: string;
  campaign_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  capacity: number | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  distances: unknown;
  price_tiers: unknown;
  is_published: boolean;
  description: string | null;
  offers_shirts: boolean;
}

/** Brief §4: /admin/dogadjaji — create and edit events. Staff session; RLS enforces. */
export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [
    { data: events },
    { data: chapters },
    { data: campaigns },
    { data: regs },
    { data: pages },
    { data: rsvps },
    { data: supporters },
    { data: perks },
    { data: awards },
    webhook,
    { data: galleryRows },
  ] =
    await Promise.all([
      supabase.from("events").select("*").order("starts_at", { ascending: false }).limit(200),
      supabase.from("chapters").select("id, name").order("name"),
      supabase.from("campaigns").select("id, title").order("title"),
      supabase.from("registrations").select("event_id").limit(10_000),
      supabase.from("fundraisers").select("event_id").limit(10_000),
      supabase.from("event_rsvps").select("event_id").eq("status", "going").limit(10_000),
      supabase.from("supporters").select("id, name").eq("is_active", true).order("name"),
      supabase.from("perk_challenges").select("*").order("created_at", { ascending: false }),
      supabase.from("perk_awards").select("challenge_id, status, awarded_on").limit(20_000),
      stravaWebhookStatus(),
      supabase.from("gallery_items").select("id, storage_path, caption, credit, is_published, event_id").not("event_id", "is", null).order("sort_order", { ascending: false }).limit(2000),
    ]);

  // Offers, with their award counts, grouped by event.
  const today = localToday();
  const stats = new Map<string, { issued: number; redeemed: number; today: number }>();
  for (const award of awards ?? []) {
    const entry = stats.get(award.challenge_id) ?? { issued: 0, redeemed: 0, today: 0 };
    if (award.status !== "revoked") entry.issued += 1;
    if (award.status === "redeemed") entry.redeemed += 1;
    if (award.awarded_on === today && award.status !== "revoked") entry.today += 1;
    stats.set(award.challenge_id, entry);
  }
  const offersByEvent = new Map<string, PerkChallengeAdminRow[]>();
  for (const perk of (perks ?? []) as (Omit<PerkChallengeAdminRow, "has_pin" | "issued" | "redeemed" | "issued_today"> & { redeem_pin_hash: string | null })[]) {
    const { redeem_pin_hash, ...rest } = perk;
    const row: PerkChallengeAdminRow = {
      ...rest,
      has_pin: redeem_pin_hash !== null,
      issued: stats.get(perk.id)?.issued ?? 0,
      redeemed: stats.get(perk.id)?.redeemed ?? 0,
      issued_today: stats.get(perk.id)?.today ?? 0,
    };
    if (perk.event_id) offersByEvent.set(perk.event_id, [...(offersByEvent.get(perk.event_id) ?? []), row]);
  }

  const regCount = new Map<string, number>();
  for (const row of regs ?? []) regCount.set(row.event_id, (regCount.get(row.event_id) ?? 0) + 1);
  const pageCount = new Map<string, number>();
  for (const row of pages ?? []) {
    pageCount.set(row.event_id, (pageCount.get(row.event_id) ?? 0) + 1);
  }
  const goingCount = new Map<string, number>();
  for (const row of rsvps ?? []) goingCount.set(row.event_id, (goingCount.get(row.event_id) ?? 0) + 1);

  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rows = ((events ?? []) as EventRow[]).map(
    (event): EventListRow => ({
      ...event,
      registrations: regCount.get(event.id) ?? 0,
      pages: pageCount.get(event.id) ?? 0,
      going: goingCount.get(event.id) ?? 0,
      offers: offersByEvent.get(event.id) ?? [],
      gallery: ((galleryRows ?? []) as GalleryAdminItem[]).filter((item) => item.event_id === event.id),
    }),
  );
  const dateLabels = Object.fromEntries(
    rows.map((event) => [event.id, event.starts_at ? dateFormat.format(new Date(event.starts_at)) : "—"]),
  );

  return (
    <div className="py-8">
      <EventsManager
        title={t("eventsTitle")}
        lead={t("eventsHint")}
        events={rows}
        chapters={(chapters ?? []) as { id: string; name: string }[]}
        campaigns={((campaigns ?? []) as { id: string; title: string }[]).map((campaign) => ({
          id: campaign.id,
          name: campaign.title,
        }))}
        supporters={(supporters ?? []) as { id: string; name: string }[]}
        webhook={webhook}
        dateLabels={dateLabels}
      />
    </div>
  );
}
