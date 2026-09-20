import "server-only";

import type { MemberPage, MemberRegistration, MemberRow, MemberTeam } from "@/components/admin/MembersManager";
import type { TeamRow } from "@/components/admin/TeamManager";
import { createClient } from "@/lib/supabase/server";

/**
 * Everything the People screens show about accounts: the staff view of
 * every account, their pages, registrations and teams, the team records,
 * and whether the signed-in staff member may change access levels.
 */
export async function loadPeople() {
  const supabase = await createClient();
  const [{ data: members }, { data: pages }, { data: registrations }, { data: teams }, { data: events }, { data: causeRows }, { data: teamRows }] =
    await Promise.all([
      supabase.from("v_staff_members").select("*").order("joined_at", { ascending: false }).limit(2000),
      supabase.from("fundraisers").select("id, user_id, slug, title, status, goal_cents, campaign_id, team_id, is_test").limit(5000),
      supabase
        .from("registrations")
        .select("id, user_id, event_id, participant_name, distance, tier_label, shirt_size, bib_number, amount_due_cents, amount_paid_cents, payment_reference, status")
        .limit(10_000),
      supabase.from("teams").select("id, captain_id, name, slug, campaign_id, event_id, is_test").limit(5000),
      supabase.from("events").select("id, name").limit(1000),
      supabase.from("campaigns").select("id, title").limit(1000),
      supabase.from("team_members").select("*").order("sort_order").order("full_name").limit(1000),
    ]);

  const { data: { user } } = await supabase.auth.getUser();
  const accounts = (members ?? []) as MemberRow[];
  const me = accounts.find((m) => m.id === user?.id);
  const canManage = me?.role === "admin";

  const eventName = new Map(((events ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  const causeTitle = new Map(((causeRows ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));
  const memberPages: MemberPage[] = ((pages ?? []) as { id: string; user_id: string; slug: string; title: string; status: "draft" | "active" | "hidden"; goal_cents: number | null; campaign_id: string | null; team_id: string | null; is_test: boolean }[]).map((page) => ({
    ...page,
    event_name: (page.campaign_id && causeTitle.get(page.campaign_id)) || "—",
  }));
  const memberRegistrations: MemberRegistration[] = ((registrations ?? []) as Omit<MemberRegistration, "event_name">[]).map((row) => ({
    ...row,
    event_name: eventName.get(row.event_id) ?? "—",
  }));
  const accountName = new Map(accounts.map((m) => [m.id, m.full_name?.trim() || m.email || m.id.slice(0, 8)]));
  const pagesByTeam = new Map<string, number>();
  for (const page of memberPages) if (page.team_id) pagesByTeam.set(page.team_id, (pagesByTeam.get(page.team_id) ?? 0) + 1);
  const memberTeams: MemberTeam[] = ((teams ?? []) as { id: string; captain_id: string | null; name: string; slug: string; campaign_id: string | null; event_id: string; is_test: boolean }[]).map((team) => ({
    ...team,
    event_name: eventName.get(team.event_id) ?? "—",
    cause_title: (team.campaign_id && causeTitle.get(team.campaign_id)) || null,
    captain_name: team.captain_id ? (accountName.get(team.captain_id) ?? "—") : "—",
    pages: pagesByTeam.get(team.id) ?? 0,
  }));
  const team = (teamRows ?? []) as TeamRow[];
  // An account with a team record carries the record's role.
  const teamByUser = new Map(team.filter((r) => r.user_id).map((r) => [r.user_id as string, r]));
  const withTeam = accounts.map((m) => {
    const record = teamByUser.get(m.id);
    return record ? { ...m, team_kind: record.kind, team_id: record.id } : m;
  });

  return { accounts: withTeam, pages: memberPages, registrations: memberRegistrations, teams: memberTeams, team, canManage };
}
