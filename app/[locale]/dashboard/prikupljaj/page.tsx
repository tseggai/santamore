import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SignInForm } from "@/components/admin/SignInForm";
import { FundraiseWalkthrough } from "@/components/dashboard/FundraiseWalkthrough";
import { formatShortDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * "Raise money for this event" lands here. Signed out: sign in and come
 * straight back. First page ever: a three-step walkthrough, then the
 * form. Returning runner: the form, event preselected. Already raising
 * for this event, or the event is over: say so, with the way forward.
 */
export default async function FundraiseEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const [{ locale }, { event: eventSlug }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const here = `/${locale}/dashboard/prikupljaj${eventSlug ? `?event=${encodeURIComponent(eventSlug)}` : ""}`;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <p className="type-eyebrow text-sea/80">Santamore</p>
        <h1 className="type-display mt-3 text-3xl">{t("fundraiseSignIn")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("fundraiseSignInSub")}</p>
        <div className="mt-6">
          <SignInForm locale={locale as Locale} nextPath={here} allowSignup />
        </div>
      </div>
    );
  }

  const [{ data: event }, { data: pageRows }, { data: profile }] = await Promise.all([
    eventSlug
      ? supabase.from("v_public_events").select("id, slug, name, starts_at, ends_at").eq("slug", eventSlug).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("fundraisers").select("id, slug, title, status, event_id").eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const pages = (pageRows ?? []) as { id: string; slug: string; title: string; status: string; event_id: string }[];

  const shell = (children: ReactNode) => (
    <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
      <p className="flex flex-wrap gap-x-4 text-[14px] font-semibold text-sea">
        {event ? <Link href={`/dogadjaji/${event.slug}`} className="hover:text-sea-2">← {event.name}</Link> : null}
        <Link href="/dashboard" className="hover:text-sea-2">{t("consoleBadge")} →</Link>
      </p>
      {children}
    </div>
  );

  if (!event) {
    return shell(
      <>
        <h1 className="type-display mt-4 text-3xl">{t("fundraiseNoEvent")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("fundraiseNoEventSub")}</p>
        <Link href="/dashboard/stranice" className="mt-6 inline-flex h-12 items-center rounded-lg bg-ink px-6 text-[15.5px] font-bold text-paper hover:opacity-90">
          {t("navPages")}
        </Link>
      </>,
    );
  }

  const existing = pages.find((page) => page.event_id === event.id);
  if (existing) {
    return shell(
      <>
        <p className="type-eyebrow mt-4 text-sea/80">{event.name}</p>
        <h1 className="type-display mt-2 text-3xl">{t("fundraiseHave")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-black/65">
          {t("fundraiseHaveSub", { title: existing.title, status: existing.status === "active" ? t("statusActiveShort") : t("statusDraftShort") })}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/dashboard/stranice/${existing.slug}`} className="inline-flex h-12 items-center rounded-lg bg-red px-7 text-[16px] font-bold text-paper hover:bg-red-dark">
            {existing.status === "active" ? t("editPage") : t("finishPage")}
          </Link>
          {existing.status === "active" ? (
            <Link href={`/f/${existing.slug}`} className="inline-flex h-12 items-center rounded-lg bg-mist px-6 text-[15.5px] font-semibold hover:bg-mist-2">
              {t("viewPublic")}
            </Link>
          ) : null}
        </div>
      </>,
    );
  }

  const end = new Date(event.ends_at ?? event.starts_at ?? 0).getTime();
  if (end && end < Date.now()) {
    return shell(
      <>
        <p className="type-eyebrow mt-4 text-sea/80">{event.name}</p>
        <h1 className="type-display mt-2 text-3xl">{t("fundraiseFinished")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("fundraiseFinishedSub")}</p>
        <Link href="/dogadjaji" className="mt-6 inline-flex h-12 items-center rounded-lg bg-ink px-6 text-[15.5px] font-bold text-paper hover:opacity-90">
          {t("navEvents")}
        </Link>
      </>,
    );
  }

  return shell(
    <FundraiseWalkthrough
      locale={locale}
      firstTime={pages.length === 0}
      defaultName={profile?.full_name ?? ""}
      event={{ slug: event.slug, name: event.name, dateLabel: formatShortDate(event.starts_at, locale as Locale) }}
    />,
  );
}
