import { getTranslations, setRequestLocale } from "next-intl/server";

import { MembersManager } from "@/components/admin/MembersManager";
import { loadPeople } from "@/lib/server/people";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Fundraisers: the accounts that hold a fundraising page; `?cilj=` narrows to one cause's pages. */
export default async function FundraisersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cilj?: string }>;
}) {
  const [{ locale }, { cilj }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  const causePages = cilj ? people.pages.filter((page) => page.campaign_id === cilj) : null;
  const holders = causePages ? new Set(causePages.map((page) => page.user_id)) : null;
  const members = people.accounts.filter((m) => (holders ? holders.has(m.id) : m.pages > 0));
  const focus = causePages && causePages.length > 0 ? { label: t("focusPagesFor", { name: causePages[0].event_name }), clearHref: "/admin/clanovi/prikupljaci" } : null;
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("fundraisersPeopleHint")}</p>
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
