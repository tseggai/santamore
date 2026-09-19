import { getTranslations, setRequestLocale } from "next-intl/server";

import { MembersManager, type MemberRow } from "@/components/admin/MembersManager";
import { loadPeople } from "@/lib/server/people";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * All: everyone at once. Every account, and every team record that has no
 * account, in one list with one filter across all kinds.
 */
export default async function AllPeoplePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const people = await loadPeople();
  // Team records without an account become rows of their own; opening one goes to the Team tab.
  const teamOnly: MemberRow[] = people.team
    .filter((r) => !r.user_id)
    .map((r) => ({
      id: r.id,
      full_name: r.full_name,
      role: "member",
      email: r.email,
      joined_at: null,
      pages: 0,
      live_pages: 0,
      raised_cents: 0,
      teams: 0,
      registrations: 0,
      rsvps: 0,
      strava: false,
      strava_last_sync: null,
      activities_30d: 0,
      awards: 0,
      donations: 0,
      given_cents: 0,
      avatar_url: null,
      team_kind: r.kind,
      team_id: r.id,
      team_only: true,
    }));
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("allPeopleHint")}</p>
      <MembersManager locale={locale as Locale} mode="all" members={[...people.accounts, ...teamOnly]} pages={people.pages} registrations={people.registrations} teams={people.teams} canManage={people.canManage} />
    </div>
  );
}
