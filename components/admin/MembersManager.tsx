"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { deleteFundraiser, saveMemberProfile } from "@/app/[locale]/admin/(protected)/clanovi/actions";

import { DataTable, Thumb, bulkButton, type Column } from "@/components/console/DataTable";
import { formatShortDate } from "@/lib/dates";
import { SidePanel } from "@/components/console/SidePanel";
import { useDialog } from "@/components/console/useDialog";

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
  /** The role on the person's team record, when they have one. */
  team_kind?: string;
  team_id?: string;
  /** A team record with no account: opens on the Team tab. */
  team_only?: boolean;
}

export interface MemberPage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "hidden";
  goal_cents: number | null;
  event_name: string;
  team_id: string | null;
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
  event_id: string;
  campaign_id: string | null;
  event_name: string;
  cause_title: string | null;
  captain_name: string;
  /** Pages in the team. */
  pages: number;
}

type Kind = "team" | "fundraisers" | "athletes" | "participants" | "captains" | "donors";
const KINDS: Kind[] = ["team", "fundraisers", "athletes", "participants", "captains", "donors"];
/** Which kinds each People tab filters by. */
const KINDS_BY_MODE: Record<"all" | "fundraisers" | "members", Kind[]> = {
  all: KINDS,
  fundraisers: [],
  members: ["athletes", "participants", "captains", "donors"],
};
/** One fixed dot per role, brand tones; a tooltip names it. */
const KIND_DOT: Record<Kind, string> = {
  team: "bg-ink",
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
    case "team": return Boolean(member.team_kind);
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
  canManage = false,
  mode = "members",
}: {
  locale: Locale;
  /** Which People tab this list is: sets the kinds the filter offers. */
  mode?: "all" | "fundraisers" | "members";
  members: MemberRow[];
  pages: MemberPage[];
  registrations: MemberRegistration[];
  teams: MemberTeam[];
  /** The signed-in staff member is an admin: profile and access level are editable. */
  canManage?: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const kinds = KINDS_BY_MODE[mode];
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const member = members.find((m) => m.id === open) ?? null;
  const myPages = member ? pages.filter((p) => p.user_id === member.id) : [];
  const myRegs = member ? registrations.filter((r) => r.user_id === member.id) : [];
  const myTeams = member ? teams.filter((tm) => tm.captain_id === member.id) : [];
  // Deleting a page is for one added by mistake; the database refuses a
  // page that took donations and says so.
  const dialog = useDialog();
  const removePage = async (page: MemberPage) => {
    if (!(await dialog.confirm(t("pageDeleteConfirm", { title: page.title })))) return;
    const result = await deleteFundraiser({ id: page.id }).catch(() => null);
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail);
      return;
    }
    const refused = result.blocked[0];
    if (refused) {
      await dialog.alert(t("pageDeleteBlocked", { title: refused.name, count: refused.count }));
      return;
    }
    router.refresh();
  };

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
          {kinds.map((kind) => {
            const on = isKind(m, kind);
            const label = kind === "team" && m.team_kind ? t(`teamKindValue.${m.team_kind}`) : t(`memberFilter.${kind}`);
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
        options: kinds.map((kind) => ({ value: kind, label: t(`memberFilter.${kind}`) })),
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
        onOpen={(m) => (m.team_only ? router.push(`/${locale}/admin/clanovi/tim?uredi=${m.team_id ?? m.id}`) : setOpen(m.id))}
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

      {dialog.element}
      <SidePanel open={member !== null} title={member ? displayName(member) : ""} onClose={() => setOpen(null)}>
        {member ? (
      <div className="space-y-5">
        <ProfileForm key={member.id} member={member} canManage={canManage} />
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
                  <span className="ml-auto flex items-center gap-1.5">
                    <FundraiserStatusButtons fundraiserId={page.id} status={page.status} />
                    {canManage ? (
                      <button type="button" onClick={() => void removePage(page)} className="rounded-lg px-2.5 py-1 text-[13px] font-semibold text-red-dark transition-colors hover:bg-mist-2">
                        {t("evDelete")}
                      </button>
                    ) : null}
                  </span>
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

const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";
const labelClass = "text-[13.5px] font-semibold";

/**
 * The account's name and access level. What the person shows on /o-nama
 * lives on their team record (People → Team). Read-only for anyone but an admin.
 */
function ProfileForm({ member, canManage }: { member: MemberRow; canManage: boolean }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [fullName, setFullName] = useState(member.full_name ?? "");
  const [role, setRole] = useState<MemberRow["role"]>(member.role);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error" | "forbidden">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy") return;
    setState("busy");
    const result = await saveMemberProfile({
      id: member.id,
      fullName,
      title: null,
      quote: null,
      photoPath: null,
      isTeam: false,
      teamOrder: 0,
      role,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      setState("saved");
      router.refresh();
    } else {
      setState(result.error === "forbidden" ? "forbidden" : "error");
    }
  };

  const disabled = !canManage;
  return (
    <form onSubmit={submit} className="rounded-lg bg-mist p-4">
      <p className="type-eyebrow text-black/60">{t("memberProfileHeading")}</p>
      <p className="mt-1 text-[13.5px] text-black/60">
        {canManage ? t("memberProfileHint") : t("memberProfileReadOnly")}{" "}
        <Link href="/admin/clanovi/tim" className="font-semibold text-sea underline underline-offset-2">{t("memberTeamLink")}</Link>
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mpName" className={labelClass}>{t("memberName")}</label>
          <input id="mpName" type="text" required minLength={2} maxLength={120} disabled={disabled} value={fullName} onChange={(e) => setFullName(e.target.value)} className={`${inputClass} disabled:opacity-60`} />
        </div>
        <div>
          <label htmlFor="mpRole" className={labelClass}>{t("memberAccess")}</label>
          <select id="mpRole" disabled={disabled} value={role} onChange={(e) => setRole(e.target.value as MemberRow["role"])} className={`${inputClass} disabled:opacity-60`}>
            {(["member", "chapter_lead", "admin"] as const).map((value) => (
              <option key={value} value={value}>{t(`memberRole.${value}`)}</option>
            ))}
          </select>
          <p className="mt-1 text-[13px] text-black/50">{t(`memberAccessHint.${role}`)}</p>
        </div>
      </div>
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "forbidden" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("memberForbidden")}</p> : null}
      {state === "saved" ? <p role="status" className="mt-3 text-[14px] font-semibold text-sea">{t("memberSaved")}</p> : null}
      {canManage ? (
        <div className="mt-4">
          <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
            {t("evSave")}
          </button>
        </div>
      ) : null}
    </form>
  );
}
