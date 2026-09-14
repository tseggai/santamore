import { notFound, redirect } from "next/navigation";
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
  searchParams: Promise<{ event?: string; cause?: string }>;
}) {
  const [{ locale }, { event: eventSlug, cause: causeSlugParam }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const here = `/${locale}/dashboard/prikupljaj${causeSlugParam ? `?cause=${encodeURIComponent(causeSlugParam)}` : eventSlug ? `?event=${encodeURIComponent(eventSlug)}` : ""}`;

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
      ? supabase.from("v_public_events").select("id, slug, name, campaign_slug").eq("slug", eventSlug).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("fundraisers").select("id, slug, title, status, campaign_id").eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const pages = (pageRows ?? []) as { id: string; slug: string; title: string; status: string; campaign_id: string | null }[];
  const causeSlug = causeSlugParam ?? event?.campaign_slug ?? null;
  const { data: cause } = causeSlug
    ? await supabase.from("v_public_campaigns").select("id, slug, title, starts_at, ends_at").eq("slug", causeSlug).maybeSingle()
    : { data: null };

  const shell = (children: ReactNode) => (
    <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
      <p className="flex flex-wrap gap-x-4 text-[14px] font-semibold text-sea">
        {event ? <Link href={`/dogadjaji/${event.slug}`} className="hover:text-sea-2">← {event.name}</Link> : cause ? <Link href={`/kampanje/${cause.slug}`} className="hover:text-sea-2">← {cause.title}</Link> : null}
        <Link href="/dashboard" className="hover:text-sea-2">{t("consoleBadge")} →</Link>
      </p>
      {children}
    </div>
  );

  if (event && !event.campaign_slug) {
    return shell(
      <>
        <p className="type-eyebrow mt-4 text-sea/80">{event.name}</p>
        <h1 className="type-display mt-2 text-3xl">{t("fundraiseNoCause")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("fundraiseNoCauseSub")}</p>
        <Link href="/kampanje" className="mt-6 inline-flex h-12 items-center rounded-lg bg-ink px-6 text-[15.5px] font-bold text-paper hover:opacity-90">
          {t("evCampaigns")}
        </Link>
      </>,
    );
  }

  if (!cause) {
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

  // Already raising for this cause: the console says so, over the list,
  // and its button opens the page in the slide-over.
  const existing = pages.find((page) => page.campaign_id === cause.id);
  if (existing) redirect(`/${locale}/dashboard/stranice?have=${encodeURIComponent(existing.slug)}`);

  const end = cause.ends_at ? new Date(cause.ends_at).getTime() : 0;
  if (end && end < Date.now()) {
    return shell(
      <>
        <p className="type-eyebrow mt-4 text-sea/80">{cause.title}</p>
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
      event={{ slug: cause.slug, name: cause.title, dateLabel: cause.ends_at ? formatShortDate(cause.ends_at, locale as Locale) : "" }}
    />,
  );
}
