import { getTranslations, setRequestLocale } from "next-intl/server";

import { MembersManager } from "@/components/admin/MembersManager";
import { YearSelect, parseYear } from "@/components/console/YearSelect";
import { loadPeople } from "@/lib/server/people";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Participants: everyone registered for an event or who said they are coming, athletes with Strava on. */
export default async function ParticipantsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ godina?: string }> }) {
  const [{ locale }, { godina }] = await Promise.all([params, searchParams]);
  const year = parseYear(godina);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  // Who took part in the year: a registration or an RSVP on an event of that year; athletes only across all years.
  const inYear = (x: { year: number | null }) => year === null || x.year === year;
  const took = new Set([...people.registrations.filter((r) => r.status !== "cancelled" && inYear(r)).map((r) => r.user_id), ...people.rsvps.filter(inYear).map((r) => r.user_id)]);
  const years = [...new Set([...people.registrations, ...people.rsvps].map((x) => x.year).filter((y): y is number => y !== null))];
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("participantsHint")}</p>
      <div className="mt-4"><YearSelect years={years} value={year} /></div>
      <MembersManager
        locale={locale as Locale}
        mode="participants"
        members={people.accounts.filter((m) => took.has(m.id) || (year === null && m.strava))}
        pages={people.pages}
        registrations={people.registrations}
        teams={people.teams}
        canManage={people.canManage}
      />
    </div>
  );
}
