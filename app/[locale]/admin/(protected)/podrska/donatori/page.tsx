import { getTranslations, setRequestLocale } from "next-intl/server";

import { MembersManager } from "@/components/admin/MembersManager";
import { loadPeople } from "@/lib/server/people";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Donors: the accounts behind approved gifts, with what each gave. */
export default async function DonorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("donorsHint")}</p>
      <MembersManager
        locale={locale as Locale}
        mode="donors"
        members={people.accounts.filter((m) => m.donations > 0)}
        pages={people.pages}
        registrations={people.registrations}
        teams={people.teams}
        canManage={people.canManage}
      />
    </div>
  );
}
