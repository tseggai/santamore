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

  const [{ data: members }, { data: pages }, { data: registrations }, { data: teams }, { data: events }] =
    await Promise.all([
      supabase.from("v_staff_members").select("*").order("joined_at", { ascending: false }).limit(2000),
      supabase.from("fundraisers").select("id, user_id, slug, title, status, goal_cents, event_id").limit(5000),
      supabase
        .from("registrations")
        .select("id, user_id, event_id, participant_name, distance, tier_label, shirt_size, bib_number, amount_due_cents, amount_paid_cents, payment_reference, status")
        .limit(10_000),
      supabase.from("teams").select("id, captain_id, name, slug, event_id").limit(5000),
      supabase.from("events").select("id, name").limit(1000),
    ]);

  const eventName = new Map(((events ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  const memberPages: MemberPage[] = ((pages ?? []) as { id: string; user_id: string; slug: string; title: string; status: "draft" | "active" | "hidden"; goal_cents: number | null; event_id: string }[]).map((page) => ({
    ...page,
    event_name: eventName.get(page.event_id) ?? "—",
  }));
  const memberRegistrations: MemberRegistration[] = ((registrations ?? []) as Omit<MemberRegistration, "event_name">[]).map((row) => ({
    ...row,
    event_name: eventName.get(row.event_id) ?? "—",
  }));
  const memberTeams: MemberTeam[] = ((teams ?? []) as { id: string; captain_id: string | null; name: string; slug: string; event_id: string }[]).map((team) => ({
    ...team,
    event_name: eventName.get(team.event_id) ?? "—",
  }));

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("membersTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("membersHint")}</p>
      <MembersManager
        locale={locale as Locale}
        members={(members ?? []) as MemberRow[]}
        pages={memberPages}
        registrations={memberRegistrations}
        teams={memberTeams}
      />

    </div>
  );
}
