import { getTranslations, setRequestLocale } from "next-intl/server";

import { PagesManager } from "@/components/admin/PagesManager";
import { loadPeople } from "@/lib/server/people";

export const dynamic = "force-dynamic";

/** Pages: every fundraising page with its fundraiser, cause, team and state; `?cilj=` narrows to one cause. */
export default async function PagesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ cilj?: string }> }) {
  const [{ locale }, { cilj }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  const pages = cilj ? people.pages.filter((page) => page.campaign_id === cilj) : people.pages;
  const focus = cilj && pages.length > 0 ? { label: t("focusPagesFor", { name: pages[0].event_name }), clearHref: "/admin/stranice" } : null;
  return (
    <div className="pt-8 pb-8">
      <h1 className="type-display text-2xl">{t("navPages")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("pagesHint")}</p>
      <div className="mt-5">
        <PagesManager pages={pages} canManage={people.canManage} focus={focus} />
      </div>
    </div>
  );
}
