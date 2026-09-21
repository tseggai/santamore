"use client";

import { useLocale, useTranslations } from "next-intl";

import { Chip } from "@/components/console/DataTable";
import { SidePanel } from "@/components/console/SidePanel";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** The rows an event's counts stand for, loaded once with the list. */
export interface EventLinked {
  registrations: LinkedRegistration[];
  rsvps: LinkedRsvp[];
  pages: LinkedPage[];
  teams: LinkedTeam[];
}

export interface LinkedRegistration {
  id: string;
  event_id: string;
  user_id: string | null;
  participant_name: string | null;
  party_of: string | null;
  status: "pending" | "confirmed" | "cancelled";
  tier_label: string | null;
  distance: string | null;
  bib_number: string | null;
  amount_due_cents: number;
  amount_paid_cents: number;
}

export interface LinkedRsvp {
  event_id: string;
  user_id: string;
  name: string;
}

export interface LinkedPage {
  id: string;
  campaign_id: string | null;
  title: string;
  slug: string;
  status: "draft" | "active" | "hidden";
  owner_name: string;
}

export interface LinkedTeam {
  id: string;
  event_id: string;
  campaign_id: string | null;
  name: string;
  slug: string;
  captain_name: string;
  pages: number;
}

export type PeekKind = "going" | "pages" | "teams";

/** Heads coming: every uncancelled registration row (guests included) plus RSVPs from accounts with no registration. */
export function goingFor(linked: EventLinked, eventId: string) {
  const regs = linked.registrations.filter((r) => r.event_id === eventId && r.status !== "cancelled");
  const registered = new Set(regs.map((r) => r.user_id).filter(Boolean));
  const rsvpOnly = linked.rsvps.filter((r) => r.event_id === eventId && !registered.has(r.user_id));
  return { regs, rsvpOnly, count: regs.length + rsvpOnly.length };
}

export function pagesFor(linked: EventLinked, campaignId: string | null) {
  const pages = campaignId ? linked.pages.filter((p) => p.campaign_id === campaignId) : [];
  return { pages, active: pages.filter((p) => p.status === "active").length, drafts: pages.filter((p) => p.status !== "active").length };
}

const rowClass = "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-paper px-3.5 py-2.5 text-[14px]";

/**
 * A quick look at what a count in the events list stands for, in the
 * slide-over, so the list stays where it was. The full screens are one
 * link away for the actions that need room.
 */
export function EventPeekPanel({
  peek,
  linked,
  onClose,
}: {
  peek: { kind: PeekKind; eventId: string; eventName: string; campaignId: string | null } | null;
  linked: EventLinked;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const title = peek ? `${peek.eventName} · ${t(peek.kind === "going" ? "table.colGoing" : peek.kind === "pages" ? "table.colPages" : "table.colTeams")}` : "";
  const fullHref = !peek
    ? "/admin"
    : peek.kind === "going"
      ? `/admin/dogadjaji/prijave?event=${peek.eventId}`
      : peek.kind === "pages"
        ? `/admin/clanovi/prikupljaci?cilj=${peek.campaignId ?? ""}`
        : `/admin/clanovi/timovi?dogadjaj=${peek.eventId}`;

  let body: React.ReactNode = null;
  if (peek?.kind === "going") {
    const { regs, rsvpOnly } = goingFor(linked, peek.eventId);
    const nameOf = new Map(regs.map((r) => [r.id, r.participant_name ?? "—"]));
    body = regs.length + rsvpOnly.length === 0 ? (
      <p className="text-[14.5px] text-black/60">{t("peekEmpty")}</p>
    ) : (
      <>
        <ul className="space-y-1.5">
          {regs.map((r) => (
            <li key={r.id} className={rowClass}>
              <span className="font-semibold">{r.participant_name ?? "—"}</span>
              {r.party_of ? <span className="text-black/55">{t("peekGuestOf", { name: nameOf.get(r.party_of) ?? "—" })}</span> : null}
              {r.tier_label ? <span className="text-black/55">{r.tier_label}</span> : null}
              {r.distance ? <span className="text-black/55">{r.distance}</span> : null}
              {r.bib_number ? <span className="font-mono text-black/55">#{r.bib_number}</span> : null}
              <span className="ml-auto flex items-center gap-2">
                {r.amount_due_cents > 0 ? <span className="font-mono tabular-nums text-black/70">{money(r.status === "confirmed" ? r.amount_paid_cents : r.amount_due_cents)}</span> : null}
                <Chip tone={r.status === "confirmed" ? "sea" : "paper"}>{t(`regStatusValue.${r.status}`)}</Chip>
              </span>
            </li>
          ))}
        </ul>
        {rsvpOnly.length > 0 ? (
          <div className="mt-4">
            <p className="type-eyebrow text-black/60">{t("peekRsvpOnly")}</p>
            <ul className="mt-2 space-y-1.5">
              {rsvpOnly.map((r) => (
                <li key={r.user_id} className={rowClass}><span className="font-semibold">{r.name}</span></li>
              ))}
            </ul>
          </div>
        ) : null}
      </>
    );
  } else if (peek?.kind === "pages") {
    const { pages } = pagesFor(linked, peek.campaignId);
    body = pages.length === 0 ? (
      <p className="text-[14.5px] text-black/60">{t("peekEmpty")}</p>
    ) : (
      <ul className="space-y-1.5">
        {pages.map((p) => (
          <li key={p.id} className={rowClass}>
            {p.status === "active" ? <Link href={`/f/${p.slug}`} className="font-semibold text-sea hover:underline">{p.title}</Link> : <span className="font-semibold">{p.title}</span>}
            <span className="text-black/55">{p.owner_name}</span>
            <span className="ml-auto"><Chip tone={p.status === "active" ? "sea" : p.status === "hidden" ? "red" : "paper"}>{t(`pageStatusValue.${p.status}`)}</Chip></span>
          </li>
        ))}
      </ul>
    );
  } else if (peek?.kind === "teams") {
    const teams = linked.teams.filter((tm) => tm.event_id === peek.eventId);
    body = teams.length === 0 ? (
      <p className="text-[14.5px] text-black/60">{t("peekEmpty")}</p>
    ) : (
      <ul className="space-y-1.5">
        {teams.map((tm) => (
          <li key={tm.id} className={rowClass}>
            <Link href={`/t/${tm.slug}`} className="font-semibold text-sea hover:underline">{tm.name}</Link>
            <span className="text-black/55">{tm.captain_name}</span>
            <span className="ml-auto font-mono tabular-nums text-black/70">{tm.pages} {t("tmColPages").toLowerCase()}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <SidePanel open={peek !== null} title={title} onClose={onClose}>
      {body}
      <p className="mt-5 text-[14px]">
        <Link href={fullHref} className="font-semibold text-sea underline underline-offset-2 hover:text-sea-2">{t("peekOpenFull")} →</Link>
      </p>
    </SidePanel>
  );
}
