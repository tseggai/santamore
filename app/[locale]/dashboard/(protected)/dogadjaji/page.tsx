import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RsvpButtons } from "@/components/dashboard/RsvpButtons";
import { DonateButton } from "@/components/donate/DonateButton";
import { ExternalIcon } from "@/components/Icons";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  slug: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  kind: "race" | "challenge";
  campaign_slug: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  going_count: number;
}

interface CampaignRow {
  slug: string;
  title: string;
  goal_cents: number | null;
  raised_cents: number;
  donor_count: number;
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * Events and campaigns as the member relates to them: going, registered,
 * raising on it, supported it — with RSVP here and the paid registration
 * on the public page (it collects the entry fee).
 */
export default async function ConsoleEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tDonate] = await Promise.all([getTranslations("dashboard"), getTranslations("donate")]);
  const loc = locale as Locale;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [
    { data: eventRows },
    { data: campaignRows },
    { data: regRows },
    { data: rsvpRows },
    { data: pageRows },
    { data: teamRows },
    { data: donationRows },
  ] = await Promise.all([
    supabase
      .from("v_public_events")
      .select("id, slug, name, starts_at, ends_at, venue, kind, campaign_slug, registration_opens_at, registration_closes_at, going_count")
      .order("starts_at", { ascending: true }),
    supabase
      .from("v_public_campaigns")
      .select("slug, title, goal_cents, raised_cents, donor_count, starts_at, ends_at")
      .order("starts_at", { ascending: false }),
    supabase.from("registrations").select("event_id, status").eq("user_id", user.id),
    supabase.from("event_rsvps").select("event_id, status").eq("user_id", user.id),
    supabase.from("fundraisers").select("slug, event_id, status").eq("user_id", user.id),
    supabase.from("teams").select("name, slug, event_id").eq("captain_id", user.id),
    supabase.from("v_my_donations").select("event_id, campaign_id, campaign_slug, status").eq("status", "approved"),
  ]);

  const events = (eventRows ?? []) as EventRow[];
  const campaigns = (campaignRows ?? []) as CampaignRow[];
  const regByEvent = new Map((regRows ?? []).map((r) => [r.event_id, r.status as string]));
  const rsvpByEvent = new Map((rsvpRows ?? []).map((r) => [r.event_id, r.status as "going" | "interested"]));
  const pageByEvent = new Map((pageRows ?? []).map((p) => [p.event_id, p]));
  const teamByEvent = new Map((teamRows ?? []).map((tm) => [tm.event_id, tm]));
  const supportedEvents = new Set((donationRows ?? []).flatMap((d) => (d.event_id ? [d.event_id] : [])));
  const supportedCampaigns = new Set((donationRows ?? []).flatMap((d) => (d.campaign_slug ? [d.campaign_slug] : [])));
  // Raising on an event of the campaign counts as supporting the campaign.
  const campaignsRaising = new Set(
    events.filter((e) => pageByEvent.has(e.id) && e.campaign_slug).map((e) => e.campaign_slug as string),
  );
  for (const e of events) if (supportedEvents.has(e.id) && e.campaign_slug) supportedCampaigns.add(e.campaign_slug);

  const now = Date.now();
  const isPast = (e: EventRow) => {
    const end = e.ends_at ?? e.starts_at;
    return !!end && new Date(end).getTime() < now;
  };
  const upcoming = events.filter((e) => !isPast(e));
  const past = events.filter(isPast).reverse();

  const dateFormat = new Intl.DateTimeFormat(htmlLang(loc), { day: "numeric", month: "long", year: "numeric" });
  const fmt = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : "");
  const money = (cents: number) => formatCents(cents, loc, { trimWholeCents: true });
  const chip = (text: string, tone: "sea" | "paper" | "red" = "paper") => (
    <span
      key={text}
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
        tone === "sea" ? "bg-sea text-paper" : tone === "red" ? "bg-red text-paper" : "bg-paper text-black/60"
      }`}
    >
      {text}
    </span>
  );
  const iconBtn =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper text-black transition-colors hover:bg-mist-2 hover:text-sea";
  const ghost = "rounded-lg bg-paper px-3.5 py-2 text-[14px] font-semibold transition-colors hover:bg-mist-2";

  const eventCard = (event: EventRow, live: boolean) => {
    const reg = regByEvent.get(event.id);
    const rsvp = rsvpByEvent.get(event.id) ?? null;
    const page = pageByEvent.get(event.id);
    const team = teamByEvent.get(event.id);
    const regOpen =
      live &&
      (!event.registration_opens_at || new Date(event.registration_opens_at).getTime() <= now) &&
      (!event.registration_closes_at || new Date(event.registration_closes_at).getTime() >= now);
    const chips = [
      reg === "confirmed" ? chip(t("regConfirmed"), "sea") : reg ? chip(t("regAwaitingFee"), "red") : null,
      rsvp === "going" && !reg ? chip(t("evGoing"), "sea") : rsvp === "interested" ? chip(t("evInterested")) : null,
      page ? chip(t("evRaising"), "sea") : null,
      team ? chip(team.name) : null,
      supportedEvents.has(event.id) ? chip(t("evSupported")) : null,
    ].filter(Boolean);
    return (
      <li key={event.id} className="rounded-lg bg-mist p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[16px] font-bold">{event.name}</p>
            <p className="mt-0.5 text-[14px] text-black/60">
              {fmt(event.starts_at)}
              {event.venue && !event.venue.includes("[[") ? ` · ${event.venue}` : ""}
              {event.going_count > 0 ? ` · ${t("rsvpGoingCount", { count: event.going_count })}` : ""}
            </p>
            {chips.length > 0 ? <div className="mt-2 flex flex-wrap gap-1.5">{chips}</div> : null}
          </div>
          <Link href={`/dogadjaji/${event.slug}`} aria-label={t("evView")} title={t("evView")} className={iconBtn}>
            <ExternalIcon />
          </Link>
        </div>
        {live ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!reg ? <RsvpButtons eventId={event.id} status={rsvp} /> : null}
            {!reg && regOpen ? (
              <Link href={`/dogadjaji/${event.slug}/prijava`} className={ghost}>
                {t("evRegister")}
              </Link>
            ) : null}
            {page ? (
              <Link href={`/dashboard/stranice/${page.slug}`} className={ghost}>
                {page.status === "active" ? t("editPage") : t("finishPage")}
              </Link>
            ) : (
              <Link href={`/dashboard/stranice?event=${event.slug}`} className={ghost}>
                {t("evStartPage")}
              </Link>
            )}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("navEvents")}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-black/65">{t("evSub")}</p>

      <section className="mt-6">
        <h2 className="type-eyebrow text-black/60">{t("evUpcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-black/60">{t("evNoUpcoming")}</p>
        ) : (
          <ul className="mt-3 space-y-3">{upcoming.map((event) => eventCard(event, true))}</ul>
        )}
      </section>

      {past.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-[14.5px] font-semibold text-black/60 hover:text-sea">
            {t("evPast", { count: past.length })}
          </summary>
          <ul className="mt-3 space-y-3">{past.map((event) => eventCard(event, false))}</ul>
        </details>
      ) : null}

      <section className="mt-8 border-t-[0.5px] border-line pt-6">
        <h2 className="type-eyebrow text-black/60">{t("evCampaigns")}</h2>
        {campaigns.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-black/60">{t("evNoCampaigns")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {campaigns.map((campaign) => {
              const pct =
                campaign.goal_cents && campaign.goal_cents > 0
                  ? Math.min(100, Math.round((campaign.raised_cents / campaign.goal_cents) * 100))
                  : 0;
              const chips = [
                campaignsRaising.has(campaign.slug) ? chip(t("evRaising"), "sea") : null,
                supportedCampaigns.has(campaign.slug) ? chip(t("evSupported")) : null,
              ].filter(Boolean);
              return (
                <li key={campaign.slug} className="rounded-lg bg-mist p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-bold">{campaign.title}</p>
                      <p className="mt-0.5 text-[14px] text-black/60">
                        {campaign.starts_at ? fmt(campaign.starts_at) : ""}
                        {campaign.ends_at ? ` — ${fmt(campaign.ends_at)}` : ""}
                      </p>
                      {chips.length > 0 ? <div className="mt-2 flex flex-wrap gap-1.5">{chips}</div> : null}
                      <div className="mt-3 flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[15px] tabular-nums">
                          {money(campaign.raised_cents)}
                          {campaign.goal_cents ? (
                            <span className="text-[13px] font-medium text-black/50"> / {money(campaign.goal_cents)}</span>
                          ) : null}
                        </span>
                        <span className="text-[13px] text-black/55">
                          {campaign.donor_count} {t("evDonors")}
                          {campaign.goal_cents ? ` · ${pct}%` : ""}
                        </span>
                      </div>
                      <span className="mt-1.5 block h-[6px] overflow-hidden rounded-[3px] bg-mist-2">
                        <span className="block h-full rounded-[3px] bg-sea" style={{ width: `${Math.max(2, pct)}%` }} />
                      </span>
                    </div>
                    <Link href={`/kampanje/${campaign.slug}`} aria-label={t("evView")} title={t("evView")} className={iconBtn}>
                      <ExternalIcon />
                    </Link>
                  </div>
                  <div className="mt-4">
                    <DonateButton
                      request={{ kind: "campaign", slug: campaign.slug }}
                      href={`/podrzi?kampanja=${campaign.slug}`}
                      className="inline-flex rounded-lg bg-red px-4 py-2 text-[14px] font-bold text-paper transition-colors hover:bg-red-dark"
                    >
                      {tDonate("payVerb")}
                    </DonateButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
