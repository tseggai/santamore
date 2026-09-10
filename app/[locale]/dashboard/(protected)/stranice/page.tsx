import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Avatar } from "@/components/Avatar";
import { CreatePageForm, type EventChoice } from "@/components/dashboard/CreatePageForm";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "hidden";
  goal_cents: number | null;
  photo_path: string | null;
  event_id: string;
}

interface EventRow {
  id: string;
  slug: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * My pages: one per event. `?event=` preselects an event to create for,
 * `?team=` (from "Join this team") goes straight to the editor of the
 * runner's page on that team's event, or to creating one.
 */
export default async function PagesListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string; team?: string }>;
}) {
  const [{ locale }, { event: eventParam, team: teamParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: pageRows }, { data: eventRows }, { data: profile }] = await Promise.all([
    supabase
      .from("fundraisers")
      .select("id, slug, title, status, goal_cents, photo_path, event_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("v_public_events")
      .select("id, slug, name, starts_at, ends_at")
      .order("starts_at", { ascending: true }),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const pages = (pageRows ?? []) as PageRow[];
  const events = (eventRows ?? []) as EventRow[];

  // "Join this team": resolve the team's event and route to that page.
  let teamEventSlug: string | null = null;
  if (teamParam && UUID.test(teamParam)) {
    const { data: team } = await supabase
      .from("v_team_totals")
      .select("id, event_id")
      .eq("id", teamParam)
      .maybeSingle();
    if (team) {
      const existing = pages.find((page) => page.event_id === team.event_id);
      if (existing) {
        redirect(`/${locale}/dashboard/stranice/${existing.slug}?team=${teamParam}`);
      }
      teamEventSlug = events.find((event) => event.id === team.event_id)?.slug ?? null;
    }
  }

  const now = Date.now();
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const haveEvent = new Set(pages.map((page) => page.event_id));
  const choices = events
    .filter((event) => {
      const end = event.ends_at ?? event.starts_at;
      return (!end || new Date(end).getTime() >= now) && !haveEvent.has(event.id);
    })
    .map(
      (event): EventChoice => ({
        slug: event.slug,
        name: event.name,
        dateLabel: event.starts_at ? dateFormat.format(new Date(event.starts_at)) : "",
      }),
    );
  const eventById = new Map(events.map((event) => [event.id, event]));
  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("navPages")}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink/65">{t("pagesSub")}</p>

      {pages.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {pages.map((page) => {
            const event = eventById.get(page.event_id);
            return (
              <li key={page.id}>
                <Link
                  href={`/dashboard/stranice/${page.slug}`}
                  className="flex items-center gap-3 rounded-[11px] border-[1.5px] border-line px-4 py-3 transition-colors hover:border-sea"
                >
                  <Avatar src={fundraiserPhotoUrl(page.photo_path)} name={page.title} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                      {page.title}
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                          page.status === "active" ? "bg-sea text-paper" : "border border-line text-ink/60"
                        }`}
                      >
                        {page.status === "active" ? t("statusActiveShort") : t("statusDraftShort")}
                      </span>
                    </span>
                    <span className="block text-[12.5px] text-ink/60">
                      {event?.name ?? "—"}
                      {event?.starts_at ? ` · ${dateFormat.format(new Date(event.starts_at))}` : ""}
                      {page.goal_cents ? ` · ${t("goalChip", { amount: money(page.goal_cents) })}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-sea">{t("editPage")} →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      <section className="mt-8 rounded-brand border-[1.5px] border-line p-5">
        <h2 className="text-[15px] font-bold">{t("createHeading")}</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink/65">
          {choices.length === 0 ? t("createNoEvents") : t("createSub")}
        </p>
        {choices.length > 0 ? (
          <div className="mt-4">
            <CreatePageForm
              locale={locale}
              defaultName={profile?.full_name ?? ""}
              events={choices}
              defaultEventSlug={teamEventSlug ?? eventParam ?? null}
              joinTeamId={teamParam && UUID.test(teamParam) ? teamParam : null}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
