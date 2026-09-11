import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ActivityLog, type ActivityEntry } from "@/components/dashboard/ActivityLog";
import { CashForm } from "@/components/dashboard/CashForm";
import { PageEditor } from "@/components/dashboard/PageEditor";
import type { TeamOption } from "@/components/dashboard/TeamPanel";
import { ShareButton } from "@/components/ShareButton";
import type { ChallengeMetric } from "@/lib/metrics";
import { formatCents } from "@/lib/money";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CashRow {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  donor_name: string | null;
  message: string | null;
}

/**
 * The runner's own cash log for this page. Donations carry donor PII and
 * stay staff-only under RLS, so this is read server-side with the service
 * role, restricted to the runner's page, the cash rail, and the fields
 * they typed in themselves.
 */
async function cashLog(fundraiserId: string): Promise<CashRow[]> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("donations")
      .select("id, amount_cents, status, created_at, donor_name, message")
      .eq("fundraiser_id", fundraiserId)
      .eq("rail", "cash")
      .order("created_at", { ascending: false })
      .limit(30);
    return (data ?? []) as CashRow[];
  } catch {
    return [];
  }
}

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const [{ locale, slug }, { team: teamParam }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [t, tDonate, tRunner] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("donate"),
    getTranslations("runner"),
  ]);

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
    cash,
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
    cashLog(mine.id),
  ]);
  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });

  return (
    <div className="py-8">
      <p className="text-[12.5px]">
        <Link href="/dashboard/stranice" className="font-semibold text-sea underline underline-offset-2">
          ← {t("navPages")}
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="type-display text-2xl">{t("editorTitle")}</h1>
        {mine.status === "active" ? (
          <div className="flex items-center gap-2">
            <ShareButton
              title={mine.title}
              path={`/${locale}/f/${mine.slug}`}
              text={t("shareMessageShort", { title: mine.title })}
              label={tRunner("share")}
              copiedLabel={tDonate("copied")}
              variant="icon"
            />
            <Link
              href={`/f/${mine.slug}`}
              className="rounded-xl border-[1.5px] border-line px-4 py-2.5 text-[13.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
            >
              {t("viewPublic")} ↗
            </Link>
          </div>
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

      <section id="gotovina" className="mt-10 scroll-mt-6 rounded-brand border-[1.5px] border-line p-5">
        <h2 className="text-[15px] font-bold">{t("logCash")}</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink/65">{t("cashSub")}</p>
        <div className="mt-4">
          <CashForm fundraiserId={mine.id} />
        </div>
        {cash.length > 0 ? (
          <ul className="mt-5">
            {cash.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-line-soft py-2.5 text-[13.5px]"
              >
                <span className="font-mono tabular-nums text-ink/60">{row.created_at.slice(0, 10)}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{row.donor_name ?? tRunner("anonymous")}</span>
                  {row.message ? <span className="text-ink/55"> · {row.message}</span> : null}
                </span>
                <span className={`text-[12.5px] ${row.status === "approved" ? "text-sea" : "text-ink/50"}`}>
                  {row.status === "approved" ? t("cashConfirmed") : t("cashAwaiting")}
                </span>
                <span className="font-mono font-medium tabular-nums">{money(row.amount_cents)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
