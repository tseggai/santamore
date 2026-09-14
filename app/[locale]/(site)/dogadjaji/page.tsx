import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EventsBrowser, type PublicEventCard } from "@/components/events/EventsBrowser";
import { calendarContent } from "@/content/site/calendar";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";



export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: `${t("events")} — Santamore` };
}

export default async function EventsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("events");

  let events: PublicEventCard[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_events")
      .select("slug, name, starts_at, ends_at, venue, kind, cover_path, description")
      .order("starts_at", { ascending: true });
    events = (data ?? []) as PublicEventCard[];
  } catch {
    events = [];
  }
  const calendar = calendarContent[locale as Locale];

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-black/70">{t("sub")}</p>

      <EventsBrowser events={events} />

      {/* the full-size calendar, from the team guide */}
      <h2 className="type-display mt-12 text-2xl">{calendar.heading}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[14px]">
          <tbody>
            {calendar.rows.map((row) => (
              <tr key={`${row.month}-${row.name}`} className="border-b-[0.5px] border-line">
                <td
                  className={`w-16 py-2.5 pr-3 font-mono text-[12px] ${
                    row.flagship ? "font-medium text-red" : "text-black/50"
                  }`}
                >
                  {row.month}
                </td>
                <td className="py-2.5 pr-3 font-semibold">{row.name}</td>
                <td className="py-2.5 text-black/60">{row.who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-black/60">{calendar.note}</p>
    </div>
  );
}
