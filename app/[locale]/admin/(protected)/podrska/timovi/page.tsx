import { getTranslations, setRequestLocale } from "next-intl/server";

import { TeamsManager } from "@/components/admin/TeamsManager";
import { loadPeople } from "@/lib/server/people";

export const dynamic = "force-dynamic";

/** Fundraising teams: the groups of pages raising together; `?dogadjaj=` narrows to one event's teams. */
export default async function TeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ dogadjaj?: string }>;
}) {
  const [{ locale }, { dogadjaj }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  const teams = dogadjaj ? people.teams.filter((team) => team.event_id === dogadjaj) : people.teams;
  const focus = dogadjaj && teams.length > 0 ? { label: t("focusTeamsFor", { name: teams[0].event_name }), clearHref: "/admin/podrska/timovi" } : null;
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("tmHint")}</p>
      <TeamsManager teams={teams} canManage={people.canManage} focus={focus} />
    </div>
  );
}
