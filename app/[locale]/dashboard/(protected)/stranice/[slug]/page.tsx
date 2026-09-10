import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ActivityLog, type ActivityEntry } from "@/components/dashboard/ActivityLog";
import { PageEditor } from "@/components/dashboard/PageEditor";
import type { TeamOption } from "@/components/dashboard/TeamPanel";
import type { ChallengeMetric } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const [{ locale, slug }, { team: teamParam }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: mine } = await supabase
    .from("fundraisers")
    .select("id, slug, title, story, goal_cents, photo_path, status, team_id, event_id")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!mine) redirect(`/${locale}/dashboard/stranice`);

  const [
    { data: teams },
    { data: captained },
    { data: totals },
    { data: event },
    { data: activityRows },
  ] = await Promise.all([
    supabase
      .from("v_team_totals")
      .select("id, name, description, photo_path")
      .eq("event_id", mine.event_id)
      .order("name"),
    // teams_select_own: the rows this runner captains.
    supabase.from("teams").select("id").eq("captain_id", user.id),
    supabase
      .from("v_fundraiser_totals")
      .select("raised_cents, donor_count")
      .eq("slug", mine.slug)
      .maybeSingle(),
    supabase
      .from("v_public_events")
      .select("name, kind, challenge_metric")
      .eq("id", mine.event_id)
      .maybeSingle(),
    supabase
      .from("activities")
      .select("id, started_at, distance_m, moving_time_s, source")
      .eq("fundraiser_id", mine.id)
      .order("started_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="py-8">
      <p className="text-[12.5px]">
        <Link href="/dashboard/stranice" className="font-semibold text-sea underline underline-offset-2">
          ← {t("navPages")}
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="type-display text-2xl">{t("editorTitle")}</h1>
        {mine.status === "active" ? (
          <Link href={`/f/${mine.slug}`} className="text-[13px] font-semibold text-sea underline underline-offset-2">
            {t("viewPublic")} ↗
          </Link>
        ) : null}
      </div>
      <div className="mt-5">
        <PageEditor
          locale={locale as Locale}
          fundraiser={{
            id: mine.id,
            slug: mine.slug,
            title: mine.title,
            story: mine.story ?? "",
            goalCents: mine.goal_cents,
            photoPath: mine.photo_path,
            status: mine.status,
            teamId: mine.team_id,
            eventId: mine.event_id,
            eventName: event?.name ?? "Santamore",
          }}
          teams={((teams ?? []) as {
            id: string;
            name: string;
            description: string | null;
            photo_path: string | null;
          }[]).map(
            (team): TeamOption => ({
              id: team.id,
              name: team.name,
              description: team.description,
              photoPath: team.photo_path,
            }),
          )}
          captainOf={(captained ?? []).map((row) => row.id)}
          presetTeamId={teamParam && UUID.test(teamParam) ? teamParam : null}
          raisedCents={totals?.raised_cents ?? 0}
          donorCount={totals?.donor_count ?? 0}
        />
      </div>

      {event?.kind === "challenge" && event.challenge_metric ? (
        <ActivityLog
          fundraiserId={mine.id}
          metric={event.challenge_metric as ChallengeMetric}
          activities={(activityRows ?? []) as ActivityEntry[]}
        />
      ) : null}
    </div>
  );
}
