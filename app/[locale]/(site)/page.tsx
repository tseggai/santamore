import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DonateButton } from "@/components/donate/DonateButton";
import { InboundForm } from "@/components/forms/InboundForm";
import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { landingContent } from "@/content/site/landing";
import { formatCents } from "@/lib/money";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

async function fetchLanding() {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const [summary, events, board, chapters, gallery, causes] = await Promise.all([
      supabase.from("v_public_ledger_summary").select("received_cents, disbursed_cents").single(),
      supabase
        .from("v_public_events")
        .select("slug, name, starts_at, kind, venue, campaign_slug")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(1),
      supabase
        .from("v_leaderboard")
        .select("slug, title, raised_cents")
        .order("rank", { ascending: true })
        .limit(5),
      supabase.from("v_chapter_totals").select("name, slug, raised_cents"),
      supabase
        .from("v_public_gallery")
        .select("id, storage_path, caption")
        .order("sort_order", { ascending: true })
        .limit(8),
      supabase
        .from("v_public_campaigns")
        .select("slug, title, goal_cents, raised_cents, donor_count")
        .order("starts_at", { ascending: false })
        .limit(3),
    ]);
    return {
      receivedCents: summary.data?.received_cents ?? 0,
      disbursedCents: summary.data?.disbursed_cents ?? 0,
      nextEvent: (events.data?.[0] ?? null) as { slug: string; name: string; starts_at: string; kind: "race" | "challenge" | "social"; venue: string | null; campaign_slug: string | null } | null,
      board: board.data ?? [],
      chapters: chapters.data ?? [],
      gallery: gallery.data ?? [],
      causes: (causes.data ?? []) as { slug: string; title: string; goal_cents: number | null; raised_cents: number; donor_count: number }[],
    };
  } catch {
    return {
      receivedCents: 0,
      disbursedCents: 0,
      nextEvent: null,
      board: [],
      chapters: [],
      gallery: [],
      causes: [],
    };
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tLb, tEvents] = await Promise.all([
    getTranslations("home"),
    getTranslations("leaderboard"),
    getTranslations("events"),
  ]);
  const content = landingContent[locale as Locale];
  const { receivedCents, disbursedCents, nextEvent, board, chapters, gallery, causes } = await fetchLanding();

  const money = (cents: number) =>
    formatCents(cents, locale as Locale, { trimWholeCents: true });
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const daysToEvent = nextEvent
    ? Math.max(
        0,
        Math.ceil((new Date(nextEvent.starts_at).getTime() - Date.now()) / 86_400_000),
      )
    : null;

  const eyebrowClass = "font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80";

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      {/* 1 — hero with the live total */}
      <section className="py-16 sm:py-24">
        <p className={eyebrowClass}>{t("eyebrow")}</p>
        <h1 className="type-display mt-3 max-w-3xl text-4xl leading-[1.08] sm:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-black/70">
          {t("sub")}
        </p>
        <p className="mt-6 font-mono text-[14px] text-sea">
          <span className="font-mono text-3xl font-extrabold tabular-nums">{money(receivedCents)}</span>{" "}
          {t("liveTotal")}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <DonateButton
            request={{ kind: "campaign" }}
            href="/podrzi"
            className="rounded-lg bg-red px-6 py-3.5 text-[16.5px] font-bold text-paper transition-colors hover:bg-red-dark"
          >
            {t("ctaDonate")}
          </DonateButton>
          <Link
            href="/dashboard/prikupljaj"
            className="rounded-lg bg-mist px-6 py-3.5 text-[15.5px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea"
          >
            {t("ctaStartPage")}
          </Link>
          <Link
            href="/dogadjaji"
            className="rounded-lg px-4 py-3.5 text-[15.5px] font-semibold text-sea underline decoration-black/30 underline-offset-2 hover:text-sea-2"
          >
            {t("ctaEvents")} →
          </Link>
        </div>
        <p className="mt-8 max-w-xl rounded-brand bg-mist px-4 py-3 text-[13px] text-sea">
          {t("heroPhotoNote")}
        </p>
      </section>

      {/* 2 — the next thing to do: the next event, with both ways in */}
      {nextEvent ? (
        <section className="border-t-[0.5px] border-line py-12">
          <div className="rounded-brand bg-sea px-6 py-6 text-paper">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-paper/70">
              {t("nextEvent")} · {nextEvent.kind === "challenge" ? tEvents("kindChallenge") : nextEvent.kind === "social" ? tEvents("kindSocial") : tEvents("kindRace")}
            </p>
            <p className="type-display mt-1 text-3xl">{nextEvent.name}</p>
            <p className="mt-1 text-[14.5px] text-paper/75">
              {dateFormat.format(new Date(nextEvent.starts_at))}
              {nextEvent.venue && !nextEvent.venue.includes("[[") ? ` · ${nextEvent.venue}` : ""}
              {daysToEvent !== null ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-mono tabular-nums">
                    {t("countdown", { count: daysToEvent })}
                  </span>
                </>
              ) : null}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/dogadjaji/${nextEvent.slug}`}
                className="rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark"
              >
                {nextEvent.kind === "challenge" ? tEvents("joinCta") : nextEvent.kind === "social" ? tEvents("goingCta") : tEvents("registerCta")}
              </Link>
              {nextEvent.campaign_slug ? (
                <Link
                  href={`/dashboard/prikupljaj?cause=${nextEvent.campaign_slug}`}
                  className="rounded-lg bg-paper/15 px-6 py-3.5 text-[15.5px] font-semibold text-paper transition-colors hover:bg-paper/25"
                >
                  {tEvents("wayRaise")}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 3 — what we are raising for right now */}
      {causes.length > 0 ? (
        <section className="border-t-[0.5px] border-line py-12">
          <p className={eyebrowClass}>{t("causesHeading")}</p>
          <ul className="mt-4 space-y-3">
            {causes.map((cause) => {
              const pct = cause.goal_cents && cause.goal_cents > 0 ? Math.min(100, Math.round((cause.raised_cents / cause.goal_cents) * 100)) : null;
              return (
                <li key={cause.slug}>
                  <Link href={`/kampanje/${cause.slug}`} className="block rounded-brand bg-mist px-5 py-4 transition-colors hover:bg-mist-2">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="type-display text-xl">{cause.title}</span>
                      <span className="font-mono text-[14px] tabular-nums text-black/70">
                        {money(cause.raised_cents)}
                        {cause.goal_cents ? <span className="text-black/45"> / {money(cause.goal_cents)}</span> : null}
                        {pct !== null ? <span className="text-sea"> · {pct}%</span> : null}
                      </span>
                    </span>
                    {pct !== null ? (
                      <span className="mt-2 block h-[6px] overflow-hidden rounded-[3px] bg-mist-2">
                        <span className="block h-full rounded-[3px] bg-sea" style={{ width: `${Math.max(2, pct)}%` }} />
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/kampanje"
            className="mt-4 inline-block text-[14.5px] font-semibold text-sea underline decoration-black/30 underline-offset-2 hover:text-sea-2"
          >
            {t("causesCta")} →
          </Link>
        </section>
      ) : null}

      {/* 3 — how it works */}
      <section className="border-t-[0.5px] border-line py-12">
        <p className={eyebrowClass}>{t("howHeading")}</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          {content.steps.map((step, index) => (
            <div key={step.title} className="rounded-brand bg-mist px-5 py-4">
              <span className="font-mono text-[12px] text-red">0{index + 1}</span>
              <p className="type-display mt-1 text-xl">{step.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-black/65">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 — the proof: last year, the two funds, the live ledger */}
      <section className="border-t-[0.5px] border-line py-12">
        <p className={eyebrowClass}>{t("proofHeading")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-brand bg-mist px-5 py-4">
            <p className="font-mono text-3xl font-extrabold tabular-nums">{money(receivedCents)}</p>
            <p className="mt-1 text-[14px] text-black/65">{t("proofReceived")}</p>
          </div>
          <div className="rounded-brand bg-mist px-5 py-4">
            <p className="font-mono text-3xl font-extrabold tabular-nums">{money(disbursedCents)}</p>
            <p className="mt-1 text-[14px] text-black/65">{t("proofDisbursed")}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {content.triad.map((item) => (
            <div key={item.big}>
              <p className="type-display text-4xl text-red">{item.big}</p>
              <p className="mt-1.5 max-w-xs text-[14px] leading-relaxed text-black/70">{item.label}</p>
            </div>
          ))}
        </div>
        <ul className="mt-6 max-w-2xl space-y-2">
          {content.funds.map((line) => (
            <li key={line} className="flex gap-2.5 text-[15px] leading-relaxed">
              <span aria-hidden className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-red" />
              {line}
            </li>
          ))}
        </ul>
        <Link
          href="/transparentnost"
          className="mt-5 inline-block rounded-lg bg-mist px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea"
        >
          {content.fundsCta}
        </Link>
      </section>
      {/* 6 — live leaderboard preview */}
      {board.length > 0 ? (
        <section className="border-t-[0.5px] border-line py-12">
          <p className={eyebrowClass}>{tLb("title")}</p>
          <div className="max-w-xl">
            <LeaderboardList
              locale={locale as Locale}
              entries={board.map(
                (row): LeaderboardEntry => ({
                  slug: row.slug,
                  title: row.title,
                  raisedCents: row.raised_cents,
                  href: `/f/${row.slug}`,
                }),
              )}
            />
          </div>
          <Link
            href="/dashboard/prikupljaj"
            className="mt-4 inline-block rounded-lg bg-mist px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea"
          >
            {tLb("cta")}
          </Link>
        </section>
      ) : null}

      {/* 7 — gallery strip (renders once photos with consent exist) */}
      {gallery.length > 0 ? (
        <section className="border-t-[0.5px] border-line py-12">
          <p className={eyebrowClass}>{t("galleryHeading")}</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {gallery.map((item) => {
              const src = galleryImageUrl(item.storage_path);
              if (!src) return null;
              return (
                <Image
                  key={item.id}
                  src={src}
                  alt={item.caption ?? ""}
                  width={280}
                  height={200}
                  className="h-[180px] w-[250px] shrink-0 rounded-brand bg-mist object-cover"
                />
              );
            })}
          </div>
          <Link
            href="/galerija"
            className="mt-3 inline-block text-[14.5px] font-semibold text-sea underline decoration-black/30 underline-offset-2 hover:text-sea-2"
          >
            {t("galleryCta")}
          </Link>
        </section>
      ) : null}

      {/* 8 — chapters */}
      {chapters.length > 0 ? (
        <section className="border-t-[0.5px] border-line py-12">
          <p className={eyebrowClass}>{t("chaptersHeading")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {chapters.map((chapter) => (
              <div
                key={chapter.slug}
                className="rounded-brand bg-mist px-5 py-3.5"
              >
                <p className="text-[15.5px] font-semibold">{chapter.name}</p>
                <p className="mt-0.5 font-mono text-[13.5px] tabular-nums text-sea">
                  {money(chapter.raised_cents)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 9 — partner wall (placeholder until real, consented logos exist) */}
      <section className="border-t-[0.5px] border-line py-12">
        <p className={eyebrowClass}>{t("partnersHeading")}</p>
        <p className="mt-4 max-w-xl rounded-brand bg-mist px-4 py-3 text-[13.5px] text-sea">
          {t("partnersNote")}
        </p>
        <Link
          href="/partneri"
          className="mt-3 inline-block text-[14.5px] font-semibold text-sea underline decoration-black/30 underline-offset-2 hover:text-sea-2"
        >
          {t("partnersCta")}
        </Link>
      </section>

      {/* 10 — beneficiary story (needs a real story with consent) */}
      <section className="border-t-[0.5px] border-line py-12">
        <p className={eyebrowClass}>{t("storyHeading")}</p>
        <p className="mt-4 max-w-xl rounded-brand bg-mist px-4 py-3 text-[13.5px] text-sea">
          {t("storyNote")}
        </p>
      </section>

      {/* 11 — newsletter + monthly donor club */}
      <section className="border-t-[0.5px] border-line py-12">
        <p className={eyebrowClass}>{t("newsletterHeading")}</p>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-black/70">
          {t("newsletterSub")}
        </p>
        <div className="mt-4">
          <InboundForm kind="newsletter" compact />
        </div>
      </section>
    </div>
  );
}
