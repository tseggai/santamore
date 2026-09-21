import { getTranslations, setRequestLocale } from "next-intl/server";

import { MembersManager } from "@/components/admin/MembersManager";
import { loadPeople } from "@/lib/server/people";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Participants: everyone registered for an event or who said they are coming, athletes with Strava on. */
export default async function ParticipantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("participantsHint")}</p>
      <MembersManager
        locale={locale as Locale}
        mode="participants"
        members={people.accounts.filter((m) => m.registrations > 0 || m.rsvps > 0 || m.strava)}
        pages={people.pages}
        registrations={people.registrations}
        teams={people.teams}
        canManage={people.canManage}
      />
    </div>
  );
}
