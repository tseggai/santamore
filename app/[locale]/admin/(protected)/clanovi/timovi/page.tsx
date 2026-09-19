import { getTranslations, setRequestLocale } from "next-intl/server";

import { TeamsManager } from "@/components/admin/TeamsManager";
import { loadPeople } from "@/lib/server/people";

export const dynamic = "force-dynamic";

/** Fundraising teams: the groups of pages raising together for an event. */
export default async function TeamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("tmHint")}</p>
      <TeamsManager teams={people.teams} canManage={people.canManage} />
    </div>
  );
}
