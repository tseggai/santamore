import { getTranslations } from "next-intl/server";

import { EventsManager, type EventListRow } from "@/components/admin/EventsManager";
import { createClient } from "@/lib/supabase/server";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  name: string;
  slug: string;
  kind: "race" | "challenge";
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
  ] =
    await Promise.all([
      supabase.from("events").select("*").order("starts_at", { ascending: false }).limit(200),
      supabase.from("chapters").select("id, name").order("name"),
      supabase.from("campaigns").select("id, title").order("title"),
      supabase.from("registrations").select("event_id").limit(10_000),
      supabase.from("fundraisers").select("event_id").limit(10_000),
      supabase.from("event_rsvps").select("event_id").eq("status", "going").limit(10_000),
    ]);

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
    }),
  );
  const dateLabels = Object.fromEntries(
    rows.map((event) => [event.id, event.starts_at ? dateFormat.format(new Date(event.starts_at)) : "—"]),
  );

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("eventsTitle")}</h1>
      <p className="mt-1 text-[14px] text-black/60">{t("eventsHint")}</p>
      <EventsManager
        events={rows}
        chapters={(chapters ?? []) as { id: string; name: string }[]}
        campaigns={((campaigns ?? []) as { id: string; title: string }[]).map((campaign) => ({
          id: campaign.id,
          name: campaign.title,
        }))}
        dateLabels={dateLabels}
      />
    </div>
  );
}
