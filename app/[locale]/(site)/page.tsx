import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { HeroSlides, type HeroSlide } from "@/components/home/HeroSlides";
import { ProposalsList, type PublicProposal } from "@/components/proposals/ProposalsList";
import { SponsorGrid, type PublicSponsor } from "@/components/partners/SponsorGrid";
import { landingContent } from "@/content/site/landing";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl, galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

async function fetchLanding() {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const [summary, events, board, gallery, causes, proposals, sponsors] = await Promise.all([
      supabase.from("v_public_ledger_summary").select("received_cents, disbursed_cents").single(),
      supabase
        .from("v_public_events")
        .select("slug, name, starts_at, kind, venue, campaign_slug, campaign_title, cover_path")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(12),
      supabase
        .from("v_leaderboard")
        .select("slug, title, raised_cents, donor_count, photo_path")
        .order("raised_cents", { ascending: false })
        .limit(6),
      supabase
        .from("v_public_gallery")
        .select("id, storage_path, caption, event_slug, campaign_slug")
        .order("sort_order", { ascending: true })
        .limit(60),
      supabase
        .from("v_public_campaigns")
        .select("slug, title, goal_cents, raised_cents, donor_count, cover_path, ends_at")
        .order("starts_at", { ascending: false })
        .limit(6),
      supabase
        .from("v_public_cause_proposals")
        .select("*")
        .in("status", ["open", "shortlisted"])
        .order("vote_rank", { ascending: true })
        .limit(5),
      // The most recent year with sponsors: what the site shows as "our partners".
      supabase
        .from("v_public_year_supporters")
        .select("year, id, name, slug, kind, logo_path, website, cash_cents, in_kind, tiers, offers")
        .eq("kind", "sponsor")
        .order("year", { ascending: false })
        .limit(60),
    ]);
    const sponsorRows = (sponsors.data ?? []) as (PublicSponsor & { year: number })[];
    const sponsorYear = sponsorRows[0]?.year ?? null;
    return {
      receivedCents: summary.data?.received_cents ?? 0,
      disbursedCents: summary.data?.disbursed_cents ?? 0,
      events: (events.data ?? []) as { slug: string; name: string; starts_at: string; kind: "race" | "challenge" | "social"; venue: string | null; campaign_slug: string | null; campaign_title: string | null; cover_path: string | null }[],
      board: (board.data ?? []) as { slug: string; title: string; raised_cents: number; donor_count: number; photo_path: string | null }[],
      gallery: (gallery.data ?? []) as { id: string; storage_path: string; caption: string | null; event_slug: string | null; campaign_slug: string | null }[],
      causes: (causes.data ?? []) as { slug: string; title: string; goal_cents: number | null; raised_cents: number; donor_count: number; cover_path: string | null; ends_at: string | null }[],
      proposals: (proposals.data ?? []) as PublicProposal[],
      sponsors: sponsorYear ? sponsorRows.filter((row) => row.year === sponsorYear) : [],
      sponsorYear,
    };
  } catch {
    return {
      receivedCents: 0,
      disbursedCents: 0,
      events: [] as { slug: string; name: string; starts_at: string; kind: "race" | "challenge" | "social"; venue: string | null; campaign_slug: string | null; campaign_title: string | null; cover_path: string | null }[],
      board: [] as { slug: string; title: string; raised_cents: number; donor_count: number; photo_path: string | null }[],
      gallery: [] as { id: string; storage_path: string; caption: string | null; event_slug: string | null; campaign_slug: string | null }[],
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
  const { receivedCents, disbursedCents, events, board, gallery, causes, proposals } = data;
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
  const primary = "inline-flex h-11 items-center rounded-lg bg-red px-5 text-[15px] font-bold text-paper transition-colors hover:bg-red-dark";
  const secondary = "inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea";
  // Upcoming events grouped by the cause they raise for (events without one
  // last), each group with the photos published on that cause or its events.
  const causeBySlug = new Map(causes.map((cause) => [cause.slug, cause]));
  const eventGroups = [...new Set(events.map((event) => event.campaign_slug ?? ""))]
    .sort((a, b) => Number(a === "") - Number(b === ""))
    .map((slug) => {
      const groupEvents = events.filter((event) => (event.campaign_slug ?? "") === slug);
      const eventSlugs = new Set(groupEvents.map((event) => event.slug));
      return {
        key: slug || "no-cause",
        cause: slug ? (causeBySlug.get(slug) ?? { slug, title: groupEvents[0]?.campaign_title ?? slug, goal_cents: null, raised_cents: 0, donor_count: 0, cover_path: null, ends_at: null }) : null,
        events: groupEvents,
        photos: gallery.filter((item) => (slug && item.campaign_slug === slug) || (item.event_slug != null && eventSlugs.has(item.event_slug))),
      };
    });
  const header = (eyebrow: string, title: string, lead: string) => (
    <header className="max-w-2xl">
      <p className={eyebrowClass}>{eyebrow}</p>
      <h2 className="type-display mt-3 text-3xl sm:text-4xl">{title}</h2>
      <p className="mt-4 text-[16.5px] leading-relaxed text-black/70">{lead}</p>
    </header>
  );

  return (
    <div>
      {/* the hero starts under the transparent header, full height */}
      {/* negative margin = header height incl. its hairline (py-3 + 40px logo; sm: py-4 + 44px) */}
      <div className="-mt-[65px] sm:-mt-[77px]">
        <HeroSlides slides={slides} />
      </div>

      <div className="mx-auto max-w-3xl px-5">
        {/* 1 · what we do: a cause is proposed, we raise for it, every euro is published */}
        <section className={section}>
          {header(t("chipIntro"), t("whatTitle"), t("whatLead"))}
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-black/70">{t("proposalsLead")}</p>
          {proposals.length > 0 ? (
            <div className="mt-6">
              <p className={eyebrowClass}>{t("proposalsShortlist")}</p>
              <div className="mt-2">
                <ProposalsList proposals={proposals} myVotes={[]} signedIn={false} />
              </div>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/kampanje?predlozi=1" className={primary}>{t("proposalsCta")}</Link>
            <Link href="/kampanje#prijedlozi" className={secondary}>{t("proposalsVoteCta")} →</Link>
          </div>
        </section>

        {/* 2 · how it works: every euro, in public */}
        <section className={section}>
          {header(t("howHeading"), t("proofTitle"), t("proofLead"))}
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
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/transparentnost" className={secondary}>{content.fundsCta} →</Link>
            <Link href="/kampanje?predlozi=1" className={primary}>{t("proposalsCta")}</Link>
          </div>
        </section>

        {/* 3 · events, grouped by the cause they raise for, with their photos */}
        <section className={section}>
          {header(t("nextEvent"), t("eventsByCauseTitle"), t("eventsByCauseLead"))}
          {eventGroups.length === 0 ? (
            <p className="mt-8 text-[15px] text-black/60">{tEvents("noUpcoming")}</p>
          ) : (
            <div className="mt-8 space-y-6">
              {eventGroups.map((group) => {
                const cause = group.cause;
                const pct = cause ? pctOf(cause.raised_cents, cause.goal_cents) : null;
                const photos = group.photos.slice(0, 4);
                return (
                  <div key={group.key} className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    {/* the cause */}
                    {cause ? (
                      <Link href={`/kampanje/${cause.slug}`} className="flex flex-col rounded-brand bg-sea px-5 py-5 text-paper transition-opacity hover:opacity-95">
                        <span className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-paper/70">{t("chipCause")}</span>
                        <span className="type-display mt-2 text-2xl leading-tight">{cause.title}</span>
                        <span className="mt-auto block pt-5">
                          <span className="block font-mono text-[15px] tabular-nums">
                            {money(cause.raised_cents)}
                            {cause.goal_cents ? <span className="text-paper/60"> / {money(cause.goal_cents)}</span> : null}
                          </span>
                          <span className="mt-0.5 block text-[13px] text-paper/70">
                            <span className="font-mono tabular-nums">{cause.donor_count}</span> {tRunner("donors")}
                            {pct !== null ? ` · ${pct}% ${t("goalReached")}` : ""}
                          </span>
                          {pct !== null ? (
                            <span className="mt-2.5 block h-[6px] overflow-hidden rounded-[3px] bg-paper/20">
                              <span className="block h-full rounded-[3px] bg-red" style={{ width: `${Math.max(2, pct)}%` }} />
                            </span>
                          ) : null}
                          <span className="mt-4 inline-flex h-10 items-center rounded-lg bg-red px-4 text-[14.5px] font-bold text-paper">{t("slideCauseCta")}</span>
                        </span>
                      </Link>
                    ) : (
                      <div className="flex flex-col rounded-brand bg-mist px-5 py-5">
                        <span className={eyebrowClass}>{t("chipEvent")}</span>
                        <span className="type-display mt-2 text-2xl leading-tight">{t("eventsNoCause")}</span>
                        <span className="mt-3 text-[14px] leading-relaxed text-black/60">{t("eventsNoCauseLead")}</span>
                      </div>
                    )}
                    {/* its events, and their photos */}
                    <div className="flex flex-col gap-3">
                      <ul className="overflow-hidden rounded-brand bg-mist">
                        {group.events.map((event) => (
                          <li key={event.slug} className="border-t-[0.5px] border-line first:border-t-0">
                            <Link href={`/dogadjaji/${event.slug}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-mist-2">
                              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-paper">
                                <span className="font-mono text-[18px] font-extrabold leading-none tabular-nums">{dayOf.format(new Date(event.starts_at))}</span>
                                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">{monthOf.format(new Date(event.starts_at)).replace(".", "")}</span>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15.5px] font-bold">{event.name}</span>
                                <span className="block text-[13.5px] text-black/55">{kindLabel(event.kind)}{cleanVenue(event.venue) ? ` · ${cleanVenue(event.venue)}` : ""} · {shortDate.format(new Date(event.starts_at))}</span>
                              </span>
                              <span className="hidden shrink-0 text-[14px] font-semibold text-sea sm:inline">{eventCta(event.kind)} →</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {photos.length > 0 ? (
                        <Link href="/galerija" className="group flex items-center gap-2 rounded-brand bg-mist p-2 transition-colors hover:bg-mist-2">
                          {photos.map((item) => {
                            const src = galleryImageUrl(item.storage_path);
                            return src ? <Image key={item.id} src={src} alt={item.caption ?? ""} width={120} height={90} className="h-[64px] w-[84px] shrink-0 rounded-lg bg-paper object-cover" /> : null;
                          })}
                          <span className="ml-auto pr-2 text-[14px] font-semibold text-sea">{t("viewGallery")} →</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dogadjaji" className={secondary}>{t("ctaEvents")} →</Link>
            <Link href="/kampanje" className={secondary}>{t("causesCta")} →</Link>
          </div>
        </section>

        {/* 4 · top fundraisers, as a grid */}
        <section className={section}>
          {header(tLb("title"), t("fundraisersTitle"), t("fundraisersLead"))}
          {board.length === 0 ? (
            <p className="mt-8 text-[15px] text-black/60">{tLb("emptyIndividuals")}</p>
          ) : (
            <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {board.map((row, index) => {
                const photo = fundraiserPhotoUrl(row.photo_path);
                return (
                  <li key={row.slug}>
                    <Link href={`/f/${row.slug}`} className="flex h-full flex-col rounded-brand bg-mist p-3 transition-colors hover:bg-mist-2">
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-paper">
                        {photo ? (
                          <Image src={photo} alt="" fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover" />
                        ) : (
                          <span aria-hidden className="type-display absolute inset-0 flex items-center justify-center text-[32px] text-sea">{row.title.charAt(0).toUpperCase()}</span>
                        )}
                        <span className="absolute left-2 top-2 rounded-md bg-paper/90 px-1.5 py-0.5 font-mono text-[12px] font-bold tabular-nums text-sea">#{index + 1}</span>
                      </span>
                      <span className="mt-3 block truncate text-[15px] font-bold">{row.title}</span>
                      <span className="mt-0.5 block font-mono text-[14px] font-bold tabular-nums text-sea">{money(row.raised_cents)}</span>
                      <span className="block text-[13px] text-black/55"><span className="font-mono tabular-nums">{row.donor_count}</span> {tRunner("donors")}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/prikupljaj" className={primary}>{tLb("cta")}</Link>
            <Link href="/prikupljaci" className={secondary}>{tLb("fundraisersTitle")} →</Link>
          </div>
        </section>

        {/* 5 · the partners: every sponsor of the latest year, with what they gave */}
        <section className={section}>
          {header(
            data.sponsorYear ? t("partnersOfYear", { year: data.sponsorYear }) : t("partnersHeading"),
            t("partnersTitle"),
            t("partnersLead"),
          )}
          {data.sponsors.length > 0 ? (
            <div className="mt-8">
              <SponsorGrid sponsors={data.sponsors} inKindLabel={tYears("inKind")} size="lg" />
            </div>
          ) : (
            <div className="mt-8 rounded-brand bg-mist px-5 py-5">
              <p className="text-[14px] text-sea">{t("partnersNote")}</p>
            </div>
          )}
          <div className="mt-6">
            <Link href="/partneri" className={secondary}>{t("partnersCta")} →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
