import { getTranslations, setRequestLocale } from "next-intl/server";

import { TeamsManager } from "@/components/admin/TeamsManager";
import { YearSelect } from "@/components/console/YearSelect";
import { parseYear } from "@/lib/years";
import { loadPeople } from "@/lib/server/people";

export const dynamic = "force-dynamic";

/** Fundraising teams: the groups of pages raising together; `?dogadjaj=` narrows to one event's teams. */
export default async function TeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ dogadjaj?: string; godina?: string }>;
}) {
  const [{ locale }, { dogadjaj, godina }] = await Promise.all([params, searchParams]);
  const year = parseYear(godina);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  const teams = (dogadjaj ? people.teams.filter((team) => team.event_id === dogadjaj) : people.teams).filter((team) => year === null || team.year === year);
  const years = [...new Set(people.teams.map((x) => x.year).filter((y): y is number => y !== null))];
  const focus = dogadjaj && teams.length > 0 ? { label: t("focusTeamsFor", { name: teams[0].event_name }), clearHref: "/admin/podrska/timovi" } : null;
  return (
    <div className="pb-8">
      <div className="mb-4"><YearSelect years={years} value={year} /></div>
      <TeamsManager teams={teams} canManage={people.canManage} focus={focus} />
    </div>
  );
}
