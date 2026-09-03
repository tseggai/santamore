import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { calendarContent } from "@/content/site/calendar";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface EventRow {
  slug: string;
  name: string;
  starts_at: string;
  venue: string | null;
  kind: "race" | "challenge";
}

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

  let events: EventRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_events")
      .select("slug, name, starts_at, venue, kind")
      .order("starts_at", { ascending: true });
    events = (data ?? []) as EventRow[];
  } catch {
    events = [];
  }

  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const calendar = calendarContent[locale as Locale];

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("sub")}</p>

      <ul className="mt-7 space-y-3">
        {events.map((event) => (
          <li key={event.slug}>
            <Link
              href={`/dogadjaji/${event.slug}`}
              className="block rounded-brand border-[1.5px] border-line px-5 py-4 transition-colors hover:border-sea"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="type-display text-xl">{event.name}</span>
                <span className="font-mono text-[12px] tabular-nums text-ink/60">
                  {dateFormat.format(new Date(event.starts_at))}
                </span>
              </span>
              <span className="mt-1 block text-[13px] text-ink/60">
                {event.kind === "challenge" ? t("kindChallenge") : t("kindRace")}
                {event.venue ? <> · {event.venue}</> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* the full-size calendar, from the team guide */}
      <h2 className="type-display mt-12 text-2xl">{calendar.heading}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <tbody>
            {calendar.rows.map((row) => (
              <tr key={`${row.month}-${row.name}`} className="border-b border-line-soft">
                <td
                  className={`w-16 py-2.5 pr-3 font-mono text-[11px] ${
                    row.flagship ? "font-medium text-red" : "text-ink/50"
                  }`}
                >
                  {row.month}
                </td>
                <td className="py-2.5 pr-3 font-semibold">{row.name}</td>
                <td className="py-2.5 text-ink/60">{row.who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink/60">{calendar.note}</p>
    </div>
  );
}
