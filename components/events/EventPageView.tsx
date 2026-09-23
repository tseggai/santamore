"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { ChallengeJoin, type ChallengeJoinState } from "@/components/events/ChallengeJoin";
import { RegisterDialog } from "@/components/events/RegisterDialog";
import { PerkRule, type PerkChallengeFields } from "@/components/perks/PerkRule";
import type { GalleryImage } from "@/components/gallery/GalleryGrid";
import { PublicGallery } from "@/components/gallery/PublicGallery";
import { galleryImageUrl } from "@/lib/storage";
import { activeTiers, tiersFor, type EventDistance, type EventTier } from "@/lib/events";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export type { EventTier };

export interface EventPerk extends PerkChallengeFields {
  slug: string;
  partner_name: string;
  partner_url?: string | null;
  reward_label: string;
  title: string;
  description?: string | null;
  issued_today?: number;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface EventSponsor {
  id: string;
  name: string;
  website: string | null;
}

export interface EventView {
  slug: string;
  name: string;
  kind: "race" | "challenge" | "social";
  description?: string | null;
  /** Partner rewards attached to this challenge (public view). */
  perks?: EventPerk[];
  sponsors?: EventSponsor[];
  cover_path?: string | null;
  /** Published photos of this event. */
  gallery?: GalleryImage[];
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  distances: EventDistance[];
  tiers: EventTier[];
  offers_shirts?: boolean;
  going_count?: number;
  /** Public cause the event raises for; without one there are no fundraising pages. */
  campaign_slug?: string | null;
  campaign_title?: string | null;
  /** For challenges: whether the visitor is signed in and has Strava connected. */
  join?: ChallengeJoinState;
  /** A race someone else organises ("Run for Santamore"). */
  hosting?: "own" | "external";
  external_url?: string | null;
  /** External race: people register with the organiser (default) or we register the team here. */
  registration_mode?: "organizer" | "here";
  organizer_name?: string | null;
  bib_policy?: "none" | "we_buy";
  bib_capacity?: number | null;
  bibs_claimed?: number;
  /** A gathering: guests a member may bring. */
  max_guests?: number;
}

const primary =
  "inline-flex h-12 items-center justify-center rounded-lg bg-red px-7 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark";
const secondary =
  "inline-flex h-12 items-center justify-center rounded-lg bg-paper px-6 text-[15.5px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea";

/**
 * The public event page — shared with the admin preview so what staff see
 * while editing is exactly what visitors get. The page walks a visitor
 * from what the event is, to the facts, to the two ways in (take part,
 * raise money), then the details. `preview` renders links inert.
 */
export function EventPageView({
  event,
  challengeEntries = [],
  preview = false,
  now = Date.now(),
}: {
  event: EventView;
  challengeEntries?: LeaderboardEntry[];
  preview?: boolean;
  now?: number;
}) {
  const t = useTranslations("events");
  const tPerks = useTranslations("perks");
  const locale = useLocale() as Locale;
  const lang = htmlLang(locale);
  const dateFormat = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" });
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });
  const weekdayFormat = new Intl.DateTimeFormat(lang, { weekday: "long" });
  const fmt = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : "—");

  const opensAt = event.registration_opens_at ? new Date(event.registration_opens_at).getTime() : null;
  const closesAt = event.registration_closes_at ? new Date(event.registration_closes_at).getTime() : null;
  const endsAt = new Date(event.ends_at ?? event.starts_at ?? now).getTime();
  const finished = endsAt < now;
  const registrationState = finished ? "after" : opensAt && now < opensAt ? "before" : closesAt && now > closesAt ? "after" : "open";
  const cover = galleryImageUrl(event.cover_path ?? null);
  const kindLabel = event.kind === "challenge" ? t("kindChallenge") : event.kind === "social" ? t("kindSocial") : t("kindRace");
  const starts = event.starts_at ? new Date(event.starts_at) : null;
  const sameDay = starts && event.ends_at ? fmt(event.starts_at) === fmt(event.ends_at) : true;
  const daysLeft = starts ? Math.ceil((starts.getTime() - now) / 86_400_000) : null;

  const tierList = (rows: EventTier[]) => (
    <ul className="mt-2">
      {rows.map((tier) => (
        <li key={`${tier.distance ?? ""}:${tier.label}`} className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-line py-2.5 text-[15px] last:border-b-0">
          <span>
            {tier.label}
            {tier.until ? <span className="ml-2 text-[13px] text-black/55">{t("tierUntil", { date: fmt(tier.until) })}</span> : null}
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {tier.amount_cents === 0 ? t("free") : formatCents(tier.amount_cents, locale, { trimWholeCents: true })}
          </span>
        </li>
      ))}
    </ul>
  );

  const fact = (label: string, value: ReactNode) => (
    <div className="rounded-lg bg-mist px-4 py-3">
      <p className="type-eyebrow text-black/55">{label}</p>
      <p className="mt-1 text-[15.5px] font-semibold leading-snug">{value}</p>
    </div>
  );

  const rewards =
    event.kind === "challenge" && event.perks && event.perks.length > 0 ? (
      <section className="mt-8">
        <h2 className="text-[17px] font-bold">{t("rewardsHeading")}</h2>
        <ul className="mt-3 space-y-2">
          {event.perks.map((perk) => {
            const left = perk.daily_cap !== null && perk.issued_today !== undefined ? Math.max(0, perk.daily_cap - perk.issued_today) : null;
            return (
              <li key={perk.slug} className="rounded-lg bg-mist px-5 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/60">
                  {perk.partner_url && !preview ? (
                    <a href={perk.partner_url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-sea">{perk.partner_name} ↗</a>
                  ) : (
                    perk.partner_name
                  )}
                </p>
                <p className="type-display mt-1 text-2xl">{perk.reward_label}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-black/80">
                  <PerkRule challenge={perk} />
                </p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
                  {left !== null ? <span className="font-mono tabular-nums text-sea">{tPerks("leftToday", { count: left })}</span> : null}
                  {perk.starts_at || perk.ends_at ? (
                    <span className="text-black/60">{fmt(perk.starts_at ?? null)} — {fmt(perk.ends_at ?? null)}</span>
                  ) : null}
                  {preview ? null : (
                    <Link href={`/izazovi/${perk.slug}`} className="font-semibold text-sea underline underline-offset-2 hover:text-sea-2">{tPerks("share")}</Link>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
</section>
    ) : null;

  const dark = event.kind === "challenge";
  const external = event.kind === "race" && event.hosting === "external";
  // With the organiser: they take the registration and the money; here
  // people only say they run for Santamore. Otherwise we register the team.
  const withOrganizer = external && (event.registration_mode ?? "organizer") === "organizer";
  const organizer = event.organizer_name?.trim() || null;
  const bibsLeft = external && !withOrganizer && event.bib_policy === "we_buy" ? Math.max(0, (event.bib_capacity ?? 0) - (event.bibs_claimed ?? 0)) : null;
  // Only tiers still on offer today; early-bird deadlines shown beside the price.
  // Prices still on offer today. With the organiser taking registrations they are shown for information only, not offered here.
  const tiersShown = activeTiers(event.tiers);
  const tiersToday = withOrganizer ? [] : tiersShown;
  const raceCta = external ? (withOrganizer ? t("runForUsCta") : t("registerCta")) : t("registerCta");
  const organizerCta = organizer ? t("registerWithCta", { name: organizer }) : t("organizerLink");

  const registerButton =
    registrationState === "open" ? (
      preview ? (
        <span className={withOrganizer ? secondary : primary}>{event.kind === "social" ? t("goingCta") : event.kind === "challenge" ? t("joinCta") : raceCta}</span>
      ) : event.kind === "challenge" ? (
        <ChallengeJoin eventSlug={event.slug} eventName={event.name} state={event.join ?? { signedIn: false, stravaConnected: false }} className={primary} />
      ) : (
        <RegisterDialog
          event={{
            slug: event.slug,
            name: event.name,
            kind: event.kind,
            distances: event.distances.map((d) => d.name),
            tiers: tiersToday.map((tier) => ({ label: tier.label, amountCents: tier.amount_cents, until: tier.until ?? null, distance: tier.distance ?? null })),
            offersShirts: Boolean(event.offers_shirts),
            hosting: external ? "external" : "own",
            externalUrl: event.external_url ?? null,
            bibsLeft,
            maxGuests: event.max_guests ?? 0,
          }}
          label={event.kind === "social" ? t("goingCta") : raceCta}
          className={withOrganizer ? secondary : primary}
        />
      )
    ) : null;

  return (
    <div className={`mx-auto max-w-3xl px-5 py-12 sm:py-14 ${preview ? "pointer-events-none select-none" : ""}`}>
      {/* 1 — what it is */}
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">
        {kindLabel}
        {daysLeft !== null && daysLeft > 0 && daysLeft <= 60 ? <> · {t("daysLeft", { count: daysLeft })}</> : null}
        {finished ? <> · {t("finished")}</> : null}
      </p>
      <h1 className="type-display mt-2 text-4xl leading-[1.05] sm:text-5xl">{event.name || "…"}</h1>
      {event.description ? (
        <p className="mt-4 max-w-2xl whitespace-pre-line text-[17px] leading-relaxed text-black/80">{event.description}</p>
      ) : null}
      {cover ? (
        <Image src={cover} alt="" width={1200} height={675} priority className="mt-6 aspect-[16/9] w-full rounded-lg bg-mist object-cover" />
      ) : null}

      {/* 2 — the facts */}
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {event.kind === "challenge" && event.ends_at && !sameDay
          ? fact(t("factPeriod"), <>{fmt(event.starts_at)} — {fmt(event.ends_at)}</>)
          : fact(
              t("factWhen"),
              starts ? (
                <>
                  <span className="capitalize">{weekdayFormat.format(starts)}</span>, {fmt(event.starts_at)}
                  {event.kind !== "challenge" ? <span className="block font-mono text-[14px] tabular-nums text-black/60">{timeFormat.format(starts)}</span> : null}
                </>
              ) : (
                "—"
              ),
            )}
        {event.venue ? fact(t("factWhere"), event.venue) : null}
        {event.kind === "race" && event.distances.length > 0
          ? fact(t("factDistances"), <a href="#distances" className="underline-offset-2 hover:underline">{t("distancesCount", { count: event.distances.length })}</a>)
          : null}
        {event.kind === "social" && (event.going_count ?? 0) > 0 ? fact(t("factGoing"), t("goingCount", { count: event.going_count ?? 0 })) : null}
        {external && organizer ? fact(t("factOrganizer"), organizer) : null}
        {event.kind === "challenge" && event.perks && event.perks.length > 0
          ? fact(t("factRewards"), t("rewardsCount", { count: event.perks.length }))
          : null}
      </div>

      {rewards}

      {/* 3 — the two ways in. A challenge's way in is an action (sign in,
          connect Strava), so it sits on a dark surface, apart from the facts. */}
      <div className={`mt-6 rounded-lg p-5 sm:p-6 ${dark ? "bg-sea text-paper" : "bg-mist"}`}>
        <div className={`grid gap-4 ${event.campaign_slug ? "sm:grid-cols-2" : ""}`}>
          <div>
            <p className={`type-eyebrow ${dark ? "text-paper/70" : "text-sea/80"}`}>{event.campaign_slug ? t("waysInHeading") : t("wayInHeading")}</p>
            <p className="mt-3 text-[16px] font-bold">
              {event.kind === "social" ? t("wayGoing") : event.kind === "challenge" ? t("wayJoin") : withOrganizer ? t("wayRunOrganizer") : external ? t("wayRunTeam") : t("wayRun")}
            </p>
            <p className={`mt-1 text-[14.5px] leading-relaxed ${dark ? "text-paper/75" : "text-black/65"}`}>
              {event.kind === "social"
                ? t("wayGoingSub")
                : event.kind === "challenge"
                  ? t("wayJoinSub")
                  : withOrganizer
                    ? t("wayRunOrganizerSub", { name: organizer ?? t("theOrganizer") })
                    : external
                      ? t("wayRunTeamSub", { name: organizer ?? t("theOrganizer") })
                      : t("wayRunSub")}
            </p>
            {external && !withOrganizer && event.external_url && !preview ? (
              <a href={event.external_url} target="_blank" rel="noopener" className="mt-2 inline-block text-[14px] font-semibold text-sea underline underline-offset-2 hover:text-sea-2">
                {t("organizerSite", { name: organizer ?? t("theOrganizer") })} ↗
              </a>
            ) : null}
            {bibsLeft !== null ? (
              <p className="mt-2 text-[13.5px] text-black/60">{bibsLeft > 0 ? t("bibsLeft", { count: bibsLeft }) : t("bibsGone")}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {withOrganizer && registrationState === "open" && event.external_url ? (
                preview ? (
                  <span className={primary}>{organizerCta}</span>
                ) : (
                  <a href={event.external_url} target="_blank" rel="noopener" className={primary}>{organizerCta} ↗</a>
                )
              ) : null}
              {registerButton ?? (
                <p className="rounded-lg bg-paper px-4 py-3 text-[14.5px] text-sea">
                  {registrationState === "before" ? t("registrationOpens", { date: fmt(event.registration_opens_at) }) : finished ? t("finishedNote") : t("registrationClosed")}
                </p>
              )}
            </div>
          </div>
          {event.campaign_slug ? (
            <div>
              <p className={`type-eyebrow ${dark ? "text-paper/70" : "text-sea/80"}`}>{t("causeEyebrow")}</p>
              {finished ? (
                <>
                  <p className="mt-3 text-[16px] font-bold">{event.campaign_title ? t("wayMoneyWentFor", { cause: event.campaign_title }) : t("wayMoneyWent")}</p>
                  <p className={`mt-1 text-[14.5px] leading-relaxed ${dark ? "text-paper/75" : "text-black/65"}`}>{t("wayMoneyWentSub")}</p>
                  <div className="mt-3">
                    {preview || !starts ? (
                      <span className={secondary}>{t("moneyWentCta")}</span>
                    ) : (
                      <Link href={`/transparentnost?godina=${starts.getFullYear()}`} className={secondary}>{t("moneyWentCta")}</Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-[16px] font-bold">{event.campaign_title ? t("wayRaiseFor", { cause: event.campaign_title }) : t("wayRaise")}</p>
                  <p className={`mt-1 text-[14.5px] leading-relaxed ${dark ? "text-paper/75" : "text-black/65"}`}>{t("wayRaiseSub")}</p>
                  <div className="mt-3">
                    {preview ? (
                      <span className={secondary}>{t("fundraiseCta")}</span>
                    ) : (
                      <Link href={`/dashboard/prikupljaj?cause=${event.campaign_slug}`} className={secondary}>{t("fundraiseCta")}</Link>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* 4 — the details, by kind */}
      {event.kind === "race" && event.distances.length > 0 ? (
        // Each distance is a card: its name, its places, and the prices that apply to it (its own and the general ones).
        <section id="distances" className="mt-10 scroll-mt-24">
          <h2 className="type-display text-2xl">{t("distancesHeading")}</h2>
          {withOrganizer && tiersShown.length > 0 ? <p className="mt-2 text-[14px] text-black/60">{t("tiersOrganizerNote", { organizer: organizer || t("theOrganizer") })}</p> : null}
          <div className="mt-4 grid items-start gap-3 sm:grid-cols-2">
            {event.distances.map((d) => {
              const rows = tiersFor(tiersShown, d.name);
              return (
                <div key={d.name} className="rounded-lg bg-mist px-5 py-4">
                  <h3 className="text-[16px] font-bold leading-snug">{d.name}</h3>
                  {d.capacity != null ? <p className="mt-0.5 text-[13px] text-black/55">{t("placesOnDistance", { count: d.capacity })}</p> : null}
                  {rows.length > 0 ? (
                    <ul className="mt-3">
                      {rows.map((tier) => (
                        <li key={`${tier.distance ?? ""}:${tier.label}`} className="flex items-baseline justify-between gap-3 border-t-[0.5px] border-black/15 py-2 text-[14.5px]">
                          <span>
                            {tier.label}
                            {tier.until ? <span className="ml-2 text-[13px] text-black/55">{t("tierUntil", { date: fmt(tier.until) })}</span> : null}
                          </span>
                          <span className="font-mono font-semibold tabular-nums">{tier.amount_cents === 0 ? t("free") : formatCents(tier.amount_cents, locale, { trimWholeCents: true })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
          {event.offers_shirts ? <p className="mt-3 text-[14px] text-black/60">{t("shirtsNote")}</p> : null}
        </section>
      ) : event.kind !== "challenge" && tiersShown.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-display text-2xl">{event.kind === "social" ? t("ticketsHeading") : t("tiersHeading")}</h2>
          {withOrganizer ? <p className="mt-2 text-[14px] text-black/60">{t("tiersOrganizerNote", { organizer: organizer || t("theOrganizer") })}</p> : null}
          <div className="max-w-md">{tierList(tiersShown)}</div>
          {event.offers_shirts ? <p className="mt-3 text-[14px] text-black/60">{t("shirtsNote")}</p> : null}
        </section>
      ) : null}

      {event.kind === "challenge" ? (
        <section className="mt-10">
          <h2 className="type-display text-2xl">{t("howHeading")}</h2>
          <p className="mt-2 text-[14.5px] text-black/65">{tPerks("noPageNeeded")}</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["howStep1", "howStep2", "howStep3"] as const).map((key, index) => (
              <li key={key} className="rounded-lg bg-mist px-4 py-4">
                <span className="font-mono text-[12px] text-red">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-1.5 text-[15px] leading-relaxed">{t(key)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[13px] text-black/50">{tPerks("poweredBy")}</p>
        </section>
      ) : null}

      {event.kind === "challenge" && challengeEntries.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-display text-2xl">{t("challengeBoard")}</h2>
          <LeaderboardList locale={locale} entries={challengeEntries} />
        </section>
      ) : null}

      {event.sponsors && event.sponsors.length > 0 ? (
        <section className="mt-10">
          <p className="type-eyebrow text-sea/80">{t("sponsorsHeading")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {event.sponsors.map((sponsor) => (
              <li key={sponsor.id} className="rounded-lg bg-mist px-4 py-2 text-[15px] font-semibold">
                {sponsor.website ? (
                  <a href={sponsor.website} target="_blank" rel="noopener" className="hover:text-sea">{sponsor.name}</a>
                ) : (
                  sponsor.name
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {event.gallery && event.gallery.length > 0 ? <PublicGallery images={event.gallery} heading={t("galleryHeading")} /> : null}

      <p className="mt-10 border-t-[0.5px] border-line pt-5 text-[14.5px]">
        <Link href="/prikupljaci" className="font-semibold text-sea underline decoration-black/30 underline-offset-2 hover:text-sea-2">
          {t("moneyBoardLink")}
        </Link>
        {" · "}
        <Link href="/uslovi-ucesca" className="font-semibold text-sea underline decoration-black/30 underline-offset-2 hover:text-sea-2">
          {t("termsLink")}
        </Link>
      </p>
    </div>
  );
}
