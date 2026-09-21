import { setRequestLocale } from "next-intl/server";

import { MembersManager } from "@/components/admin/MembersManager";
import { loadPeople } from "@/lib/server/people";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Members: every account, with what each person does and may do. */
export default async function MembersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const people = await loadPeople();
  return (
    <div className="pb-8">
      <MembersManager locale={locale as Locale} mode="members" members={people.accounts} pages={people.pages} registrations={people.registrations} teams={people.teams} canManage={people.canManage} />
    </div>
  );
}
