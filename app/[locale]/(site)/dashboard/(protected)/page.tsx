import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ActivityLog, type ActivityEntry } from "@/components/dashboard/ActivityLog";
import { CreatePageForm } from "@/components/dashboard/CreatePageForm";
import { Waterline } from "@/components/Waterline";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface MyFundraiser {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "hidden";
  goal_cents: number | null;
  event_id: string;
}

export default async function DashboardPage({
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

  const { data: mineData } = await supabase
    .from("fundraisers")
    .select("id, slug, title, status, goal_cents, event_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const mine = mineData as MyFundraiser | null;

  // Event registrations belong to the person, with or without a page.
  const { data: regRows } = await supabase
    .from("registrations")
    .select("id, event_id, status, amount_due_cents, payment_reference")
    .eq("user_id", user.id);
  const regEventIds = (regRows ?? []).map((row) => row.event_id);
  const { data: regEvents } = regEventIds.length
    ? await supabase
        .from("v_public_events")
        .select("id, slug, name")
        .in("id", regEventIds)
    : { data: [] };
  const registrationsCard =
    (regRows ?? []).length > 0 ? (
      <ul className="mt-6 space-y-2">
        {(regRows ?? []).map((registration) => {
          const regEvent = (regEvents ?? []).find(
            (candidate) => candidate.id === registration.event_id,
          );
          if (!regEvent) return null;
          return (
            <li key={registration.id}>
              <Link
                href={`/dogadjaji/${regEvent.slug}/prijava`}
                className="flex items-baseline justify-between gap-3 rounded-[11px] border-[1.5px] border-line px-4 py-3 text-[13.5px] transition-colors hover:border-sea"
              >
                <span className="font-semibold">{regEvent.name}</span>
                <span
                  className={
                    registration.status === "confirmed" ? "text-sea" : "text-ink/55"
                  }
                >
                  {registration.status === "confirmed"
                    ? t("regConfirmed")
                    : (registration.amount_due_cents ?? 0) > 0
                      ? t("regAwaitingFee")
                      : t("regPending")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    ) : null;

  if (!mine) {
    return (
      <div className="py-8">
        <h1 className="type-display text-2xl">{t("createHeading")}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/65">{t("createSub")}</p>
        <div className="mt-5">
          <CreatePageForm />
        </div>
        {registrationsCard}
      </div>
    );
  }

  // Public totals exist once the page is active; drafts are simply at zero.
  const [{ data: totals }, { data: event }, { data: activityRows }] =
    await Promise.all([
      supabase
        .from("v_fundraiser_totals")
        .select("raised_cents, donor_count")
        .eq("slug", mine.slug)
        .maybeSingle(),
      supabase
        .from("v_public_events")
        .select("starts_at, kind, challenge_metric")
        .eq("id", mine.event_id)
        .maybeSingle(),
      supabase
        .from("activities")
        .select("id, started_at, distance_m, moving_time_s, source")
        .eq("fundraiser_id", mine.id)
        .order("started_at", { ascending: false })
        .limit(100),
    ]);
  const raised = totals?.raised_cents ?? 0;
  const donors = totals?.donor_count ?? 0;
  const daysLeft = event?.starts_at
    ? Math.max(
        0,
        Math.ceil((new Date(event.starts_at).getTime() - Date.now()) / 86_400_000),
      )
    : null;

  const isDraft = mine.status !== "active";
  const nextAction = isDraft
    ? { text: t("nextActionPublish"), href: "/dashboard/stranica" }
    : raised === 0
      ? { text: t("nextActionSelf"), href: `/f/${mine.slug}/podrzi` }
      : { text: t("nudgeShare"), href: "/dashboard/alati" };

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{mine.title}</h1>
      <p className="mt-1 text-[13px] text-ink/60">
        {isDraft ? t("statusDraft") : t("statusActive")}
        {daysLeft !== null ? <> · {t("daysLeft", { count: daysLeft })}</> : null}
      </p>

      <div className="mt-4">
        <Waterline
          raisedCents={raised}
          goalCents={mine.goal_cents ?? 0}
          donorCount={donors}
          locale={locale as Locale}
        />
      </div>

      {event?.kind === "challenge" && event.challenge_metric ? (
        <ActivityLog
          metric={event.challenge_metric}
          activities={(activityRows ?? []) as ActivityEntry[]}
        />
      ) : null}

      {/* the one next action, prototype's nudge treatment */}
      <Link
        href={nextAction.href}
        className="mt-4 block rounded-xl bg-ink px-4 py-3.5 text-paper transition-opacity hover:opacity-90"
      >
        <span className="block text-[13px] font-bold">{t("nextHeading")}</span>
        <span className="mt-1 block text-[12px] leading-relaxed text-paper/70">
          {nextAction.text}
        </span>
      </Link>

      <ul className="mt-6 space-y-2">
        {[
          { href: "/dashboard/stranica", label: t("editPage") },
          { href: "/dashboard/alati", label: t("shareTools") },
          { href: "/dashboard/gotovina", label: t("logCash") },
          ...(isDraft ? [] : [{ href: `/f/${mine.slug}`, label: t("viewPublic") }]),
        ].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-[11px] border-[1.5px] border-line px-4 py-3 text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
