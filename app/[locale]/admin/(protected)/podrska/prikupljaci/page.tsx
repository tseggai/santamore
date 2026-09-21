import { getTranslations, setRequestLocale } from "next-intl/server";

import { MembersManager } from "@/components/admin/MembersManager";
import { YearSelect } from "@/components/console/YearSelect";
import { parseYear } from "@/lib/years";
import { loadPeople } from "@/lib/server/people";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Fundraisers: the accounts that hold a fundraising page; `?cilj=` narrows to one cause's pages. */
export default async function FundraisersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cilj?: string; godina?: string }>;
}) {
  const [{ locale }, { cilj, godina }] = await Promise.all([params, searchParams]);
  const year = parseYear(godina);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  // The pages in view: one cause's, or one year's, or all; the people are their holders.
  const inYear = (page: { year: number | null }) => year === null || page.year === year;
  const causePages = cilj ? people.pages.filter((page) => page.campaign_id === cilj) : null;
  const holders = new Set((causePages ?? people.pages).filter(inYear).map((page) => page.user_id));
  const members = people.accounts.filter((m) => holders.has(m.id));
  const years = [...new Set(people.pages.map((x) => x.year).filter((y): y is number => y !== null))];
  const focus = causePages && causePages.length > 0 ? { label: t("focusPagesFor", { name: causePages[0].event_name }), clearHref: "/admin/podrska/prikupljaci" } : null;
  return (
    <div className="pb-8">
      <div><YearSelect years={years} value={year} /></div>
      <MembersManager
        locale={locale as Locale}
        mode="fundraisers"
        members={members}
        pages={people.pages}
        registrations={people.registrations}
        teams={people.teams}
        canManage={people.canManage}
        focus={focus}
      />
    </div>
  );
}
