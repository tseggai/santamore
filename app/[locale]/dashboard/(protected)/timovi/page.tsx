import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  TeamsManager,
  type MyTeam,
  type TeamEventChoice,
} from "@/components/dashboard/TeamsManager";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: captained }, { data: pages }, { data: events }] = await Promise.all([
    supabase.from("teams").select("id").eq("captain_id", user.id),
    supabase.from("fundraisers").select("id, event_id").eq("user_id", user.id),
    supabase
      .from("v_public_events")
      .select("id, name, starts_at, ends_at")
      .order("starts_at", { ascending: true }),
  ]);

  const ids = (captained ?? []).map((row) => row.id);
  const { data: totals } = ids.length
    ? await supabase
        .from("v_team_totals")
        .select("id, slug, name, description, photo_path, event_id, event_name, member_count, raised_cents")
        .in("id", ids)
        .order("name")
    : { data: [] };

  const teams: MyTeam[] = ((totals ?? []) as {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    photo_path: string | null;
    event_id: string;
    event_name: string;
    member_count: number;
    raised_cents: number;
  }[]).map((team) => ({
    id: team.id,
    slug: team.slug,
    name: team.name,
    description: team.description,
    photoPath: team.photo_path,
    eventId: team.event_id,
    eventName: team.event_name,
    memberCount: team.member_count,
    raisedLabel: formatCents(team.raised_cents, locale as Locale, { trimWholeCents: true }),
  }));

  const now = Date.now();
  const pageByEvent = new Map((pages ?? []).map((page) => [page.event_id, page.id]));
  const choices: TeamEventChoice[] = ((events ?? []) as {
    id: string;
    name: string;
    starts_at: string | null;
    ends_at: string | null;
  }[])
    .filter((event) => {
      const end = event.ends_at ?? event.starts_at;
      return !end || new Date(end).getTime() >= now;
    })
    .map((event) => ({
      id: event.id,
      name: event.name,
      fundraiserId: pageByEvent.get(event.id) ?? null,
    }));

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("navTeams")}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink/65">{t("teamsSub")}</p>
      <TeamsManager teams={teams} events={choices} />
    </div>
  );
}
