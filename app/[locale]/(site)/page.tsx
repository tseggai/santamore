import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { HeroSlides, type HeroSlide } from "@/components/home/HeroSlides";
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
    const [summary, events, board, chapters, gallery, causes, proposals] = await Promise.all([
      supabase.from("v_public_ledger_summary").select("received_cents, disbursed_cents").single(),
      supabase
        .from("v_public_events")
        .select("slug, name, starts_at, kind, venue, campaign_slug, cover_path")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(4),
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
        .select("slug, title, goal_cents, raised_cents, donor_count, cover_path, ends_at")
        .order("starts_at", { ascending: false })
        .limit(3),
      supabase
        .from("v_public_cause_proposals")
        .select("id, title, vote_count, vote_rank, status")
        .in("status", ["open", "shortlisted"])
        .order("vote_rank", { ascending: true })
        .limit(3),
    ]);
    return {
      receivedCents: summary.data?.received_cents ?? 0,
      disbursedCents: summary.data?.disbursed_cents ?? 0,
      events: (events.data ?? []) as { slug: string; name: string; starts_at: string; kind: "race" | "challenge" | "social"; venue: string | null; campaign_slug: string | null; cover_path: string | null }[],
      board: board.data ?? [],
      chapters: chapters.data ?? [],
      gallery: gallery.data ?? [],
      causes: (causes.data ?? []) as { slug: string; title: string; goal_cents: number | null; raised_cents: number; donor_count: number; cover_path: string | null; ends_at: string | null }[],
      proposals: (proposals.data ?? []) as { id: string; title: string; vote_count: number; vote_rank: number }[],
    };
  } catch {
    return {
      receivedCents: 0,
      disbursedCents: 0,
      events: [],
      board: [],
      chapters: [],
      gallery: [],
      causes: [],
      proposals: [],
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
  const { receivedCents, disbursedCents, events, board, chapters, gallery, causes, proposals } = await fetchLanding();

  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), { day: "numeric", month: "long", year: "numeric" });
  const shortDate = new Intl.DateTimeFormat(htmlLang(locale as Locale), { day: "numeric", month: "short" });
  const kindLabel = (kind: "race" | "challenge" | "social") =>
    kind === "challenge" ? tEvents("kindChallenge") : kind === "social" ? tEvents("kindSocial") : tEvents("kindRace");
  const eventCta = (kind: "race" | "challenge" | "social") =>
    kind === "challenge" ? tEvents("joinCta") : kind === "social" ? tEvents("goingCta") : tEvents("registerCta");
  const daysTo = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
  const now = Date.now();
  const openCauses = causes.filter((cause) => !cause.ends_at || new Date(cause.ends_at).getTime() >= now);

  // One slide per thing to act on: who we are, the next events, the open
  // causes, the vote. Six at most, the intro first.
  const slides: HeroSlide[] = [
    {
      id: "intro",
      eyebrow: t("slideIntroEyebrow"),
      title: t("title"),
      text: t("sub"),
      figure: money(receivedCents),
      figureLabel: t("liveTotal"),
      image: null,
      primary: { href: "/podrzi", label: t("ctaDonate"), donate: true },
      secondary: { href: "/dashboard/prikupljaj", label: t("ctaStartPage") },
    },
    ...events.slice(0, 2).map(
      (event): HeroSlide => ({
        id: `event-${event.slug}`,
        eyebrow: `${t("nextEvent")} · ${kindLabel(event.kind)}`,
        title: event.name,
        text: `${dateFormat.format(new Date(event.starts_at))}${event.venue && !event.venue.includes("[[") ? ` · ${event.venue}` : ""}`,
        figure: String(daysTo(event.starts_at)),
        figureLabel: t("countdown", { count: daysTo(event.starts_at) }).replace(/^\d+\s*/, ""),
        image: galleryImageUrl(event.cover_path),
        primary: { href: `/dogadjaji/${event.slug}`, label: eventCta(event.kind) },
        secondary: event.campaign_slug ? { href: `/dashboard/prikupljaj?cause=${event.campaign_slug}`, label: tEvents("wayRaise") } : undefined,
      }),
    ),
    ...openCauses.slice(0, 2).map(
      (cause): HeroSlide => ({
        id: `cause-${cause.slug}`,
        eyebrow: t("causesHeading"),
        title: cause.title,
        text: cause.goal_cents ? t("slideCauseText", { raised: money(cause.raised_cents), goal: money(cause.goal_cents) }) : t("slideCauseTextNoGoal", { raised: money(cause.raised_cents) }),
        image: galleryImageUrl(cause.cover_path),
        primary: { href: `/kampanje/${cause.slug}`, label: t("slideCauseCta") },
        secondary: { href: `/dashboard/prikupljaj?cause=${cause.slug}`, label: t("ctaStartPage") },
      }),
    ),
    {
      id: "vote",
      eyebrow: t("slideVoteEyebrow"),
      title: t("proposalsHeading"),
      text: proposals.length > 0 ? t("slideVoteText", { count: proposals.length }) : t("slideVoteTextEmpty"),
      image: null,
      primary: { href: "/kampanje?predlozi=1", label: t("proposalsCta") },
      secondary: { href: "/kampanje#prijedlozi", label: t("proposalsVoteCta") },
    },
  ].slice(0, 6);

  const eyebrowClass = "font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80";
  const card = "rounded-brand bg-mist px-5 py-5";
  const more = "mt-4 inline-block text-[14.5px] font-semibold text-sea underline decoration-black/30 underline-offset-2 hover:text-sea-2";

  return (
    <div className="pb-20">
      <HeroSlides slides={slides} />

      <div className="mx-auto max-w-6xl px-5">
        {/* row 1 — the promise, the mechanism, the vote */}
        <div className="grid gap-4 py-12 md:grid-cols-3">
          <section className={card}>
            <p className={eyebrowClass}>{t("proofHeading")}</p>
            <p className="mt-3 font-mono text-3xl font-extrabold tabular-nums">{money(receivedCents)}</p>
            <p className="text-[14px] text-black/65">{t("proofReceived")}</p>
            <p className="mt-3 font-mono text-3xl font-extrabold tabular-nums">{money(disbursedCents)}</p>
            <p className="text-[14px] text-black/65">{t("proofDisbursed")}</p>
            <ul className="mt-4 space-y-1.5 border-t-[0.5px] border-line pt-4">
              {content.funds.slice(0, 2).map((line) => (
                <li key={line} className="flex gap-2.5 text-[14px] leading-relaxed text-black/75">
                  <span aria-hidden className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-red" />
                  {line}
                </li>
              ))}
            </ul>
            <Link href="/transparentnost" className={more}>{content.fundsCta} →</Link>
          </section>

          <section className={card}>
            <p className={eyebrowClass}>{t("howHeading")}</p>
            <ol className="mt-3 space-y-3">
              {content.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="font-mono text-[12px] text-red">0{index + 1}</span>
                  <span>
                    <span className="block text-[15.5px] font-bold">{step.title}</span>
                    <span className="block text-[14px] leading-relaxed text-black/65">{step.desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className={card}>
            <p className={eyebrowClass}>{t("proposalsEyebrow")}</p>
            <h2 className="mt-2 text-[18px] font-bold leading-snug">{t("proposalsHeading")}</h2>
            {proposals.length > 0 ? (
              <ol className="mt-3 space-y-1.5">
                {proposals.map((proposal) => (
                  <li key={proposal.id} className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2">
                    <span className="font-mono text-[13px] font-bold tabular-nums text-red">▲ {proposal.vote_count}</span>
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{proposal.title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[14px] leading-relaxed text-black/65">{t("slideVoteTextEmpty")}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/kampanje?predlozi=1" className="inline-flex h-10 items-center rounded-lg bg-red px-4 text-[14.5px] font-bold text-paper hover:bg-red-dark">{t("proposalsCta")}</Link>
              <Link href="/kampanje#prijedlozi" className="inline-flex h-10 items-center rounded-lg bg-paper px-4 text-[14.5px] font-semibold hover:bg-mist-2">{t("proposalsVoteCta")} →</Link>
            </div>
          </section>
        </div>

        {/* row 2 — what is coming, what we raise for */}
        <div className="grid gap-4 border-t-[0.5px] border-line py-12 md:grid-cols-2">
          <section>
            <p className={eyebrowClass}>{t("eventsHeading")}</p>
            {events.length === 0 ? (
              <p className="mt-3 text-[14.5px] text-black/60">{tEvents("noUpcoming")}</p>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-brand bg-mist">
                {events.map((event) => (
                  <li key={event.slug} className="border-t-[0.5px] border-line first:border-t-0">
                    <Link href={`/dogadjaji/${event.slug}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mist-2">
                      <span className="w-14 shrink-0 font-mono text-[13px] tabular-nums text-black/60">{shortDate.format(new Date(event.starts_at))}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15.5px] font-bold">{event.name}</span>
                        <span className="block text-[13px] text-black/55">{kindLabel(event.kind)}{event.venue && !event.venue.includes("[[") ? ` · ${event.venue}` : ""}</span>
                      </span>
                      <span className="shrink-0 text-[14px] font-semibold text-sea">{eventCta(event.kind)} →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/dogadjaji" className={more}>{t("ctaEvents")} →</Link>
          </section>

          <section>
            <p className={eyebrowClass}>{t("causesHeading")}</p>
            {causes.length === 0 ? (
              <p className="mt-3 text-[14.5px] text-black/60">—</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {causes.map((cause) => {
                  const pct = cause.goal_cents && cause.goal_cents > 0 ? Math.min(100, Math.round((cause.raised_cents / cause.goal_cents) * 100)) : null;
                  return (
                    <li key={cause.slug}>
                      <Link href={`/kampanje/${cause.slug}`} className="block rounded-brand bg-mist px-5 py-3.5 transition-colors hover:bg-mist-2">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[15.5px] font-bold">{cause.title}</span>
                          <span className="font-mono text-[13.5px] tabular-nums text-black/70">
                            {money(cause.raised_cents)}
                            {cause.goal_cents ? <span className="text-black/45"> / {money(cause.goal_cents)}</span> : null}
                          </span>
                        </span>
                        {pct !== null ? (
                          <span className="mt-2 block h-[5px] overflow-hidden rounded-[3px] bg-mist-2">
                            <span className="block h-full rounded-[3px] bg-sea" style={{ width: `${Math.max(2, pct)}%` }} />
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/kampanje" className={more}>{t("causesCta")} →</Link>
          </section>
        </div>

        {/* row 3 — people: fundraisers, chapters, the record so far */}
        <div className="grid gap-4 border-t-[0.5px] border-line py-12 md:grid-cols-2">
          <section>
            <p className={eyebrowClass}>{t("fundraisersHeading")}</p>
            {board.length === 0 ? (
              <p className="mt-3 text-[14.5px] text-black/60">{tLb("emptyIndividuals")}</p>
            ) : (
              <div className="mt-3">
                <LeaderboardList
                  locale={locale as Locale}
                  entries={board.map(
                    (row): LeaderboardEntry => ({ slug: row.slug, title: row.title, raisedCents: row.raised_cents, href: `/f/${row.slug}` }),
                  )}
                />
              </div>
            )}
            <Link href="/prikupljaci" className={more}>{tLb("cta")} →</Link>
          </section>

          <section>
            <p className={eyebrowClass}>{t("triadHeading")}</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {content.triad.map((item) => (
                <div key={item.big} className="rounded-brand bg-mist px-4 py-4">
                  <p className="type-display text-3xl text-red">{item.big}</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-black/70">{item.label}</p>
                </div>
              ))}
            </div>
            {chapters.length > 0 ? (
              <>
                <p className={`${eyebrowClass} mt-8`}>{t("chaptersHeading")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {chapters.map((chapter) => (
                    <div key={chapter.slug} className="rounded-brand bg-mist px-4 py-3">
                      <p className="text-[15px] font-semibold">{chapter.name}</p>
                      <p className="font-mono text-[13.5px] tabular-nums text-sea">{money(chapter.raised_cents)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>

        {/* gallery strip (renders once photos with consent exist) */}
        {gallery.length > 0 ? (
          <section className="border-t-[0.5px] border-line py-12">
            <p className={eyebrowClass}>{t("galleryHeading")}</p>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {gallery.map((item) => {
                const src = galleryImageUrl(item.storage_path);
                if (!src) return null;
                return <Image key={item.id} src={src} alt={item.caption ?? ""} width={280} height={200} className="h-[180px] w-[250px] shrink-0 rounded-brand bg-mist object-cover" />;
              })}
            </div>
            <Link href="/galerija" className={more}>{t("galleryCta")} →</Link>
          </section>
        ) : null}

        {/* partners and the story — placeholders until consented material exists */}
        <div className="grid gap-4 border-t-[0.5px] border-line py-12 md:grid-cols-2">
          <section>
            <p className={eyebrowClass}>{t("partnersHeading")}</p>
            <p className="mt-3 rounded-brand bg-mist px-4 py-3 text-[13.5px] text-sea">{t("partnersNote")}</p>
            <Link href="/partneri" className={more}>{t("partnersCta")} →</Link>
          </section>
          <section>
            <p className={eyebrowClass}>{t("storyHeading")}</p>
            <p className="mt-3 rounded-brand bg-mist px-4 py-3 text-[13.5px] text-sea">{t("storyNote")}</p>
          </section>
        </div>

        {/* newsletter + monthly donor club */}
        <section className="border-t-[0.5px] border-line py-12">
          <div className="max-w-xl">
            <p className={eyebrowClass}>{t("newsletterHeading")}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-black/70">{t("newsletterSub")}</p>
            <div className="mt-4">
              <InboundForm kind="newsletter" compact />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
