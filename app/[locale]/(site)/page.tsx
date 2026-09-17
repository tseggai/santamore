import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { HeroSlides, type HeroSlide } from "@/components/home/HeroSlides";
import { ProposalsList, type PublicProposal } from "@/components/proposals/ProposalsList";
import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { SponsorGrid, type PublicSponsor } from "@/components/partners/SponsorGrid";
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
    const [summary, events, board, chapters, gallery, causes, proposals, sponsors] = await Promise.all([
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
        .select("*")
        .in("status", ["open", "shortlisted"])
        .order("vote_rank", { ascending: true })
        .limit(5),
      // The most recent year with sponsors: what the site shows as "our partners".
      supabase
        .from("v_public_year_supporters")
        .select("year, id, name, slug, logo_path, website, cash_cents, in_kind, tiers, offers")
        .order("year", { ascending: false })
        .limit(60),
    ]);
    const sponsorRows = (sponsors.data ?? []) as (PublicSponsor & { year: number })[];
    const sponsorYear = sponsorRows[0]?.year ?? null;
    return {
      receivedCents: summary.data?.received_cents ?? 0,
      disbursedCents: summary.data?.disbursed_cents ?? 0,
      events: (events.data ?? []) as { slug: string; name: string; starts_at: string; kind: "race" | "challenge" | "social"; venue: string | null; campaign_slug: string | null; cover_path: string | null }[],
      board: board.data ?? [],
      chapters: chapters.data ?? [],
      gallery: gallery.data ?? [],
      causes: (causes.data ?? []) as { slug: string; title: string; goal_cents: number | null; raised_cents: number; donor_count: number; cover_path: string | null; ends_at: string | null }[],
      proposals: (proposals.data ?? []) as PublicProposal[],
      sponsors: sponsorYear ? sponsorRows.filter((row) => row.year === sponsorYear) : [],
      sponsorYear,
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
      sponsors: [] as PublicSponsor[],
      sponsorYear: null,
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
  const [t, tLb, tEvents, tYears] = await Promise.all([
    getTranslations("home"),
    getTranslations("leaderboard"),
    getTranslations("events"),
    getTranslations("years"),
  ]);
  const content = landingContent[locale as Locale];
  const data = await fetchLanding();
  const { receivedCents, disbursedCents, events, board, chapters, gallery, causes, proposals } = data;
  const [tCampaigns, tRunner] = await Promise.all([getTranslations("campaigns"), getTranslations("runner")]);

  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });
  const lang = htmlLang(locale as Locale);
  const dateFormat = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" });
  const shortDate = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  const dayOf = new Intl.DateTimeFormat(lang, { day: "numeric" });
  const monthOf = new Intl.DateTimeFormat(lang, { month: "short" });
  const weekdayOf = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" });
  const kindLabel = (kind: "race" | "challenge" | "social") =>
    kind === "challenge" ? tEvents("kindChallenge") : kind === "social" ? tEvents("kindSocial") : tEvents("kindRace");
  const eventCta = (kind: "race" | "challenge" | "social") =>
    kind === "challenge" ? tEvents("joinCta") : kind === "social" ? tEvents("goingCta") : tEvents("registerCta");
  const now = Date.now();
  const openCauses = causes.filter((cause) => !cause.ends_at || new Date(cause.ends_at).getTime() >= now);
  const pctOf = (raised: number, goal: number | null) => (goal && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null);
  const cleanVenue = (venue: string | null) => (venue && !venue.includes("[[") ? venue : null);

  // One slide per thing to act on: who we are, the next events, the open
  // causes, the vote. Six at most, the intro first.
  const slides: HeroSlide[] = [
    {
      id: "intro",
      chip: t("chipIntro"),
      eyebrow: t("slideIntroEyebrow"),
      title: t("title"),
      text: t("sub"),
      image: null,
      card: { type: "total" as const, value: money(receivedCents), label: t("proofReceived") },
      primary: { href: "/podrzi", label: t("ctaDonate"), donate: true },
      secondary: { href: "/dashboard/prikupljaj", label: t("ctaStartPage") },
    },
    ...events.slice(0, 2).map((event): HeroSlide => {
      const starts = new Date(event.starts_at);
      return {
        id: `event-${event.slug}`,
        chip: `${t("chipEvent")} · ${kindLabel(event.kind)}`,
        eyebrow: t("nextEvent"),
        title: event.name,
        text: `${dateFormat.format(starts)}${cleanVenue(event.venue) ? ` · ${cleanVenue(event.venue)}` : ""}`,
        image: galleryImageUrl(event.cover_path),
        card: {
          type: "event",
          startsAt: event.starts_at,
          day: dayOf.format(starts),
          month: monthOf.format(starts).replace(".", ""),
          weekday: weekdayOf.format(starts),
          venue: cleanVenue(event.venue),
          kind: kindLabel(event.kind),
        },
        primary: { href: `/dogadjaji/${event.slug}`, label: eventCta(event.kind) },
        secondary: event.campaign_slug ? { href: `/dashboard/prikupljaj?cause=${event.campaign_slug}`, label: tEvents("wayRaise") } : undefined,
      };
    }),
    ...openCauses.slice(0, 2).map(
      (cause): HeroSlide => ({
        id: `cause-${cause.slug}`,
        chip: t("chipCause"),
        eyebrow: t("causesHeading"),
        title: cause.title,
        text: cause.goal_cents ? t("slideCauseText", { raised: money(cause.raised_cents), goal: money(cause.goal_cents) }) : t("slideCauseTextNoGoal", { raised: money(cause.raised_cents) }),
        image: galleryImageUrl(cause.cover_path),
        card: {
          type: "progress",
          raised: money(cause.raised_cents),
          goalLine: cause.goal_cents ? tCampaigns("ofGoal", { goal: money(cause.goal_cents) }) : null,
          pct: pctOf(cause.raised_cents, cause.goal_cents),
          donors: String(cause.donor_count),
        },
        primary: { href: `/kampanje/${cause.slug}`, label: t("slideCauseCta") },
        secondary: { href: `/dashboard/prikupljaj?cause=${cause.slug}`, label: t("ctaStartPage") },
      }),
    ),
    {
      id: "vote",
      chip: t("chipVote"),
      eyebrow: t("slideVoteEyebrow"),
      title: t("proposalsHeading"),
      text: proposals.length > 0 ? t("slideVoteText", { count: proposals.length }) : t("slideVoteTextEmpty"),
      image: null,
      card: { type: "list" as const, items: proposals.slice(0, 3).map((p) => ({ title: p.title, count: p.vote_count })), empty: t("slideVoteTextEmpty") },
      primary: { href: "/kampanje?predlozi=1", label: t("proposalsCta") },
      secondary: { href: "/kampanje#prijedlozi", label: t("proposalsVoteCta") },
    },
  ].slice(0, 6);

  // Every section below the slides: full height, one clear header, room to breathe.
  const section = "flex min-h-[calc(100dvh-72px)] flex-col justify-center border-t-[0.5px] border-line py-20";
  const eyebrowClass = "font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80";
  const more = "mt-6 inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea";
  const header = (eyebrow: string, title: string, lead: string) => (
    <header className="max-w-2xl">
      <p className={eyebrowClass}>{eyebrow}</p>
      <h2 className="type-display mt-3 text-3xl sm:text-4xl">{title}</h2>
      <p className="mt-4 text-[16.5px] leading-relaxed text-black/70">{lead}</p>
    </header>
  );

  return (
    <div>
      <HeroSlides slides={slides} />

      <div className="mx-auto max-w-3xl px-5">
        {/* the promise */}
        <section className={section}>
          {header(t("proofHeading"), t("proofTitle"), t("proofLead"))}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-brand bg-mist px-5 py-5">
              <p className="font-mono text-4xl font-extrabold tabular-nums">{money(receivedCents)}</p>
              <p className="mt-1 text-[14px] text-black/65">{t("proofReceived")}</p>
            </div>
            <div className="rounded-brand bg-mist px-5 py-5">
              <p className="font-mono text-4xl font-extrabold tabular-nums">{money(disbursedCents)}</p>
              <p className="mt-1 text-[14px] text-black/65">{t("proofDisbursed")}</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2">
            {content.funds.map((line) => (
              <li key={line} className="flex gap-2.5 text-[15px] leading-relaxed text-black/80">
                <span aria-hidden className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-red" />
                {line}
              </li>
            ))}
          </ul>
          <div>
            <Link href="/transparentnost" className={more}>{content.fundsCta} →</Link>
          </div>
        </section>

        {/* how it works */}
        <section className={section}>
          {header(t("howHeading"), t("howTitle"), t("howLead"))}
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {content.steps.map((step, index) => (
              <li key={step.title} className="rounded-brand bg-mist px-5 py-5">
                <span className="font-mono text-[12px] text-red">0{index + 1}</span>
                <p className="mt-2 text-[17px] font-bold leading-snug">{step.title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-black/65">{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* your say */}
        <section className={section}>
          {header(t("proposalsEyebrow"), t("proposalsHeading"), t("proposalsLead"))}
          <div className="mt-2">
            <ProposalsList proposals={proposals} myVotes={[]} signedIn={false} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/kampanje?predlozi=1" className="inline-flex h-11 items-center rounded-lg bg-red px-5 text-[15px] font-bold text-paper hover:bg-red-dark">{t("proposalsCta")}</Link>
            <Link href="/kampanje#prijedlozi" className="inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold hover:bg-mist-2 hover:text-sea">{t("proposalsVoteCta")} →</Link>
          </div>
        </section>

        {/* coming up */}
        <section className={section}>
          {header(t("nextEvent"), t("eventsTitle"), t("eventsLead"))}
          {events.length === 0 ? (
            <p className="mt-8 text-[15px] text-black/60">{tEvents("noUpcoming")}</p>
          ) : (
            <ul className="mt-8 overflow-hidden rounded-brand bg-mist">
              {events.map((event) => (
                <li key={event.slug} className="border-t-[0.5px] border-line first:border-t-0">
                  <Link href={`/dogadjaji/${event.slug}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-mist-2">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-paper">
                      <span className="font-mono text-[18px] font-extrabold leading-none tabular-nums">{dayOf.format(new Date(event.starts_at))}</span>
                      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">{monthOf.format(new Date(event.starts_at)).replace(".", "")}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-bold">{event.name}</span>
                      <span className="block text-[13.5px] text-black/55">{kindLabel(event.kind)}{cleanVenue(event.venue) ? ` · ${cleanVenue(event.venue)}` : ""} · {shortDate.format(new Date(event.starts_at))}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-sea">{eventCta(event.kind)} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Link href="/dogadjaji" className={more}>{t("ctaEvents")} →</Link>
          </div>
        </section>

        {/* causes */}
        <section className={section}>
          {header(t("causesHeading"), t("causesTitle"), t("causesLead"))}
          {causes.length === 0 ? (
            <p className="mt-8 text-[15px] text-black/60">{tCampaigns("empty")}</p>
          ) : (
            <ul className="mt-8 space-y-3">
              {causes.map((cause) => {
                const pct = pctOf(cause.raised_cents, cause.goal_cents);
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
                      <span className="mt-1 block text-[13.5px] text-black/55">
                        <span className="font-mono tabular-nums">{cause.donor_count}</span> {tRunner("donors")}
                      </span>
                      {pct !== null ? (
                        <span className="mt-2.5 block h-[6px] overflow-hidden rounded-[3px] bg-mist-2">
                          <span className="block h-full rounded-[3px] bg-sea" style={{ width: `${Math.max(2, pct)}%` }} />
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div>
            <Link href="/kampanje" className={more}>{t("causesCta")} →</Link>
          </div>
        </section>

        {/* fundraisers */}
        <section className={section}>
          {header(tLb("title"), t("fundraisersTitle"), t("fundraisersLead"))}
          {board.length === 0 ? (
            <p className="mt-8 text-[15px] text-black/60">{tLb("emptyIndividuals")}</p>
          ) : (
            <div className="mt-8">
              <LeaderboardList
                locale={locale as Locale}
                entries={board.map((row): LeaderboardEntry => ({ slug: row.slug, title: row.title, raisedCents: row.raised_cents, href: `/f/${row.slug}` }))}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/prikupljaj" className={`${more} bg-red text-paper hover:bg-red-dark hover:text-paper`}>{tLb("cta")}</Link>
            <Link href="/prikupljaci" className={more}>{tLb("fundraisersTitle")} →</Link>
          </div>
        </section>

        {/* the record so far, and where we work */}
        <section className={section}>
          {header(t("triadHeading"), t("recordTitle"), t("recordLead"))}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {content.triad.map((item) => (
              <div key={item.big} className="rounded-brand bg-mist px-4 py-5">
                <p className="type-display text-3xl text-red sm:text-4xl">{item.big}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-black/70">{item.label}</p>
              </div>
            ))}
          </div>
          {chapters.length > 0 ? (
            <>
              <p className={`${eyebrowClass} mt-10`}>{t("chaptersHeading")}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {chapters.map((chapter) => (
                  <div key={chapter.slug} className="rounded-brand bg-mist px-5 py-3.5">
                    <p className="text-[15.5px] font-semibold">{chapter.name}</p>
                    <p className="font-mono text-[13.5px] tabular-nums text-sea">{money(chapter.raised_cents)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>

        {/* gallery (renders once photos with consent exist) */}
        {gallery.length > 0 ? (
          <section className={section}>
            {header(t("galleryHeading"), t("galleryTitle"), t("galleryLead"))}
            <div className="mt-8 flex gap-3 overflow-x-auto pb-2">
              {gallery.map((item) => {
                const src = galleryImageUrl(item.storage_path);
                if (!src) return null;
                return <Image key={item.id} src={src} alt={item.caption ?? ""} width={280} height={200} className="h-[200px] w-[280px] shrink-0 rounded-brand bg-mist object-cover" />;
              })}
            </div>
            <div>
              <Link href="/galerija" className={more}>{t("galleryCta")} →</Link>
            </div>
          </section>
        ) : null}

        {/* the partners: every sponsor of the latest year, with what they gave */}
        <section className={section}>
          {header(
            data.sponsorYear ? t("partnersOfYear", { year: data.sponsorYear }) : t("partnersHeading"),
            t("partnersTitle"),
            t("partnersLead"),
          )}
          {data.sponsors.length > 0 ? (
            <div className="mt-8">
              <SponsorGrid sponsors={data.sponsors} locale={locale as Locale} inKindLabel={tYears("inKind")} size="lg" />
            </div>
          ) : (
            <div className="mt-8 rounded-brand bg-mist px-5 py-5">
              <p className="text-[14px] text-sea">{t("partnersNote")}</p>
            </div>
          )}
          <div>
            <Link href="/partneri" className={more}>{t("partnersCta")} →</Link>
          </div>
        </section>

        {/* newsletter + monthly donor club */}
        <section className={`${section} min-h-0 py-20`}>
          {header(t("newsletterHeading"), t("newsletterTitle"), t("newsletterSub"))}
          <div className="mt-6 max-w-xl">
            <InboundForm kind="newsletter" compact />
          </div>
        </section>
      </div>
    </div>
  );
}
