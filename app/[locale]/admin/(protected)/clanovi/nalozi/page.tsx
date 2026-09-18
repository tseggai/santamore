import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  MembersManager,
  type MemberPage,
  type MemberRegistration,
  type MemberRow,
  type MemberTeam,
} from "@/components/admin/MembersManager";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Members: every account, with what each person is doing — athlete,
 * fundraiser, participant, captain, donor — and the staff actions that
 * used to live on three screens (page moderation, registrations, Strava).
 */
export default async function AdminMembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: members }, { data: pages }, { data: registrations }, { data: teams }, { data: events }, { data: causeRows }] =
    await Promise.all([
      supabase.from("v_staff_members").select("*").order("joined_at", { ascending: false }).limit(2000),
      supabase.from("fundraisers").select("id, user_id, slug, title, status, goal_cents, campaign_id").limit(5000),
      supabase
        .from("registrations")
        .select("id, user_id, event_id, participant_name, distance, tier_label, shirt_size, bib_number, amount_due_cents, amount_paid_cents, payment_reference, status")
        .limit(10_000),
      supabase.from("teams").select("id, captain_id, name, slug, campaign_id").limit(5000),
      supabase.from("events").select("id, name").limit(1000),
      supabase.from("campaigns").select("id, title").limit(1000),
    ]);

  // Access levels and team profiles are an admin's to change.
  const { data: { user } } = await supabase.auth.getUser();
  const me = ((members ?? []) as MemberRow[]).find((m) => m.id === user?.id);
  const canManage = me?.role === "admin";

  const eventName = new Map(((events ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  const causeTitle = new Map(((causeRows ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));
  const memberPages: MemberPage[] = ((pages ?? []) as { id: string; user_id: string; slug: string; title: string; status: "draft" | "active" | "hidden"; goal_cents: number | null; campaign_id: string | null }[]).map((page) => ({
    ...page,
    event_name: (page.campaign_id && causeTitle.get(page.campaign_id)) || "—",
  }));
  const memberRegistrations: MemberRegistration[] = ((registrations ?? []) as Omit<MemberRegistration, "event_name">[]).map((row) => ({
    ...row,
    event_name: eventName.get(row.event_id) ?? "—",
  }));
  const memberTeams: MemberTeam[] = ((teams ?? []) as { id: string; captain_id: string | null; name: string; slug: string; campaign_id: string | null }[]).map((team) => ({
    ...team,
    event_name: (team.campaign_id && causeTitle.get(team.campaign_id)) || "—",
  }));

  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("membersHint")}</p>
      <MembersManager
        locale={locale as Locale}
        members={(members ?? []) as MemberRow[]}
        pages={memberPages}
        registrations={memberRegistrations}
        teams={memberTeams}
        canManage={canManage}
      />

    </div>
  );
}
