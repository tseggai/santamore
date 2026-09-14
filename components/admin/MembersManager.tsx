"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable, Thumb, bulkButton, type Column } from "@/components/console/DataTable";
import { formatShortDate } from "@/lib/dates";
import { SidePanel } from "@/components/console/SidePanel";

import { FundraiserStatusButtons } from "@/components/admin/FundraiserModeration";
import { RegistrationRowActions } from "@/components/admin/RegistrationRowActions";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface MemberRow {
  id: string;
  full_name: string | null;
  role: "member" | "chapter_lead" | "admin";
  email: string | null;
  joined_at: string | null;
  pages: number;
  live_pages: number;
  raised_cents: number;
  teams: number;
  registrations: number;
  rsvps: number;
  strava: boolean;
  strava_last_sync: string | null;
  activities_30d: number;
  awards: number;
  donations: number;
  given_cents: number;
  avatar_url?: string | null;
}

export interface MemberPage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "hidden";
  goal_cents: number | null;
  event_name: string;
}

export interface MemberRegistration {
  id: string;
  user_id: string;
  event_id: string;
  event_name: string;
  participant_name: string | null;
  distance: string | null;
  tier_label: string | null;
  shirt_size: string | null;
  bib_number: string | null;
  amount_due_cents: number;
  amount_paid_cents: number;
  payment_reference: string | null;
  status: "pending" | "confirmed" | "cancelled";
}

export interface MemberTeam {
  id: string;
  captain_id: string | null;
  name: string;
  slug: string;
  event_name: string;
}

type Kind = "athletes" | "fundraisers" | "participants" | "captains" | "donors" | "staff";
const KINDS: Kind[] = ["staff", "athletes", "fundraisers", "participants", "captains", "donors"];
/** One fixed dot per role, brand tones; a tooltip names it. */
const KIND_DOT: Record<Kind, string> = {
  staff: "bg-ink",
  athletes: "bg-sea",
  fundraisers: "bg-red",
  participants: "bg-sea/45",
  captains: "bg-red-dark/70",
  donors: "bg-ink/40",
};

function isKind(member: MemberRow, kind: Kind): boolean {
  switch (kind) {
    case "athletes": return member.strava;
    case "fundraisers": return member.pages > 0;
    case "participants": return member.registrations > 0 || member.rsvps > 0;
    case "captains": return member.teams > 0;
    case "donors": return member.donations > 0;
    case "staff": return member.role !== "member";
  }
}

function displayName(member: MemberRow): string {
  return member.full_name?.trim() || member.email || member.id.slice(0, 8);
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Everyone, one row each; the row opens their pages, registrations and teams. */
export function MembersManager({
  locale,
  members,
  pages,
  registrations,
  teams,
}: {
  locale: Locale;
  members: MemberRow[];
  pages: MemberPage[];
  registrations: MemberRegistration[];
  teams: MemberTeam[];
}) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const member = members.find((m) => m.id === open) ?? null;
  const myPages = member ? pages.filter((p) => p.user_id === member.id) : [];
  const myRegs = member ? registrations.filter((r) => r.user_id === member.id) : [];
  const myTeams = member ? teams.filter((tm) => tm.captain_id === member.id) : [];

  const copyEmails = async (ids: string[]) => {
    const emails = members.filter((m) => ids.includes(m.id) && m.email).map((m) => m.email as string);
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing to do
    }
  };
  const exportCsv = (ids: string[]) => {
    const rows = members.filter((m) => ids.includes(m.id));
    const lines = [
      ["name", "email", "role", "joined", "pages", "raised_eur", "registrations", "teams", "strava", "donations"].join(","),
      ...rows.map((m) =>
        [
          csvCell(m.full_name), csvCell(m.email), m.role, csvCell(m.joined_at?.slice(0, 10) ?? null), m.pages,
          (m.raised_cents / 100).toFixed(2), m.registrations, m.teams, m.strava ? "yes" : "no", m.donations,
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<MemberRow>[] = [
    {
      key: "name",
      header: t("table.colName"),
      cell: (m) => <span className="block max-w-[220px] truncate font-semibold">{displayName(m)}</span>,
      sort: (m) => displayName(m),
    },
    {
      key: "email",
      header: t("table.colEmail"),
      cell: (m) => <span className="block max-w-[240px] truncate text-black/60">{m.email ?? "—"}</span>,
      sort: (m) => m.email,
    },
    {
      key: "kind",
      header: t("table.colRoles"),
      cell: (m) => (
        <span className="flex items-center gap-1.5">
          {KINDS.map((kind) => {
            const on = isKind(m, kind);
            const label = kind === "staff" && m.role !== "member" ? t(`memberRole.${m.role}`) : t(`memberFilter.${kind}`);
            return (
              <span
                key={kind}
                role="img"
                aria-label={on ? label : `${label}: —`}
                title={on ? label : `${label}: —`}
                className={`inline-block h-3 w-3 rounded-full ${on ? KIND_DOT[kind] : "bg-mist-2"}`}
              />
            );
          })}
        </span>
      ),
      filter: {
        options: KINDS.map((kind) => ({ value: kind, label: t(`memberFilter.${kind}`) })),
        match: (m, value) => isKind(m, value as Kind),
      },
    },
    {
      key: "raised",
      header: t("table.colRaised"),
      align: "right",
      cell: (m) => (m.pages > 0 ? money(m.raised_cents) : "—"),
      sort: (m) => m.raised_cents,
    },
    {
      key: "given",
      header: t("table.colGiven"),
      align: "right",
      cell: (m) => (m.donations > 0 ? money(m.given_cents) : "—"),
      sort: (m) => m.given_cents,
    },
    {
      key: "joined",
      header: t("table.colJoined"),
      cell: (m) => <span className="font-mono tabular-nums text-black/60">{formatShortDate(m.joined_at, locale)}</span>,
      sort: (m) => m.joined_at,
    },
    {
      key: "strava",
      header: "Strava",
      cell: (m) =>
        m.strava ? (
          <span className="font-mono tabular-nums text-black/60">
            {formatShortDate(m.strava_last_sync, locale)} · {t("memberRuns", { count: m.activities_30d })}
          </span>
        ) : (
          <span className="text-black/40">—</span>
        ),
      sort: (m) => m.strava_last_sync,
      filter: {
        options: [
          { value: "on", label: t("table.stravaOn") },
          { value: "off", label: t("table.stravaOff") },
        ],
        match: (m, value) => (value === "on" ? m.strava : !m.strava),
      },
    },
  ];

  return (
    <div className="mt-5">
      <DataTable
        rows={members}
        getId={(m) => m.id}
        columns={columns}
        leading={(m) => <Thumb src={m.avatar_url ?? null} initial={displayName(m).charAt(0).toUpperCase()} rounded />}
        onOpen={(m) => setOpen(m.id)}
        searchText={(m) => `${m.full_name ?? ""} ${m.email ?? ""}`}
        searchPlaceholder={t("memberSearch")}
        emptyLabel={t("membersEmpty")}
        bulkActions={(ids) => (
          <>
            <button type="button" onClick={() => copyEmails(ids)} className={bulkButton}>
              {copied ? t("table.emailsCopied") : t("table.copyEmails")}
            </button>
            <button type="button" onClick={() => exportCsv(ids)} className={bulkButton}>{t("table.exportCsv")}</button>
          </>
        )}
      />

      <SidePanel open={member !== null} title={member ? displayName(member) : ""} onClose={() => setOpen(null)}>
        {member ? (
      <div className="space-y-5">
        <section>
          <p className="type-eyebrow text-black/60">{t("memberPagesHeading")}</p>
          {myPages.length === 0 ? (
            <p className="mt-1 text-[14px] text-black/60">{t("pagesEmpty")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {myPages.map((page) => (
                <li key={page.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                  {page.status === "active" ? (
                    <Link href={`/f/${page.slug}`} className="font-semibold text-sea hover:underline">{page.title}</Link>
                  ) : (
                    <span className="font-semibold">{page.title}</span>
                  )}
                  <span className="text-black/60">{page.event_name}{page.goal_cents ? ` · ${money(page.goal_cents)}` : ""}</span>
                  <span className={page.status === "active" ? "font-semibold text-sea" : page.status === "hidden" ? "font-semibold text-red-dark" : "text-black/60"}>
                    {t(`pageStatusValue.${page.status}`)}
                  </span>
                  <span className="ml-auto"><FundraiserStatusButtons fundraiserId={page.id} status={page.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="type-eyebrow text-black/60">{t("memberRegsHeading")}</p>
          {myRegs.length === 0 ? (
            <p className="mt-1 text-[14px] text-black/60">{t("regEmpty")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {myRegs.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                  <span className="font-semibold">{row.event_name}</span>
                  {row.participant_name ? <span className="text-black/70">{row.participant_name}</span> : null}
                  <span className="text-black/60">{[row.distance, row.tier_label, row.shirt_size].filter(Boolean).join(" · ")}</span>
                  <span className="font-mono tabular-nums text-black/60">
                    {row.status === "confirmed" ? money(row.amount_paid_cents) : row.amount_due_cents > 0 ? money(row.amount_due_cents) : ""}
                    {row.payment_reference ? ` · ${row.payment_reference}` : ""}
                  </span>
                  <span className={row.status === "confirmed" ? "font-semibold text-sea" : row.status === "cancelled" ? "text-black/40 line-through" : "text-black/60"}>
                    {t(`regStatusValue.${row.status}`)}
                  </span>
                  <span className="ml-auto"><RegistrationRowActions registrationId={row.id} bib={row.bib_number} status={row.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {myTeams.length > 0 ? (
          <section>
            <p className="type-eyebrow text-black/60">{t("memberTeamsHeading")}</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-[14px]">
              {myTeams.map((team) => (
                <li key={team.id} className="rounded-lg bg-paper px-3 py-1.5">
                  <Link href={`/t/${team.slug}`} className="font-semibold hover:text-sea">{team.name}</Link>
                  <span className="text-black/55"> · {team.event_name}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {member.strava ? (
          <section>
            <p className="type-eyebrow text-black/60">Strava</p>
            <p className="mt-1 text-[14px] text-black/70">
              {member.strava_last_sync ? t("athLastSync") + ": " + member.strava_last_sync.slice(0, 16).replace("T", " ") : "—"}
              {" · "}
              {t("memberRuns", { count: member.activities_30d })}
              {member.awards > 0 ? ` · ${t("memberAwards", { count: member.awards })}` : ""}
            </p>
          </section>
        ) : null}
      </div>
        ) : null}
      </SidePanel>
    </div>
  );
}
