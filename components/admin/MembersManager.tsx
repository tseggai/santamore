"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

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

type Filter = "all" | "athletes" | "fundraisers" | "participants" | "captains" | "donors" | "staff";
const FILTERS: Filter[] = ["all", "athletes", "fundraisers", "participants", "captains", "donors", "staff"];

function matches(member: MemberRow, filter: Filter): boolean {
  switch (filter) {
    case "athletes": return member.strava;
    case "fundraisers": return member.pages > 0;
    case "participants": return member.registrations > 0 || member.rsvps > 0;
    case "captains": return member.teams > 0;
    case "donors": return member.donations > 0;
    case "staff": return member.role !== "member";
    default: return true;
  }
}

/** Everyone, filtered by what they do; a row opens into their pages, registrations and teams. */
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
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f, members.filter((m) => matches(m, f)).length])) as Record<Filter, number>,
    [members],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter(
      (m) => matches(m, filter) && (!needle || `${m.full_name ?? ""} ${m.email ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [members, filter, query]);

  const chip = (text: string, tone: "sea" | "red" | "paper" | "ink" = "paper") => (
    <span
      key={text}
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
        tone === "sea" ? "bg-sea text-paper" : tone === "red" ? "bg-red text-paper" : tone === "ink" ? "bg-ink text-paper" : "bg-paper text-black/60"
      }`}
    >
      {text}
    </span>
  );

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[14px] font-semibold transition-colors ${
              filter === f ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"
            }`}
          >
            {t(`memberFilter.${f}`)} <span className="font-mono tabular-nums opacity-70">{counts[f]}</span>
          </button>
        ))}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("memberSearch")}
          aria-label={t("memberSearch")}
          className="ml-auto w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2 text-[14.5px] outline-none focus:border-sea sm:w-64"
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-[14.5px] text-black/60">{t("membersEmpty")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((member) => {
            const myPages = pages.filter((p) => p.user_id === member.id);
            const myRegs = registrations.filter((r) => r.user_id === member.id);
            const myTeams = teams.filter((tm) => tm.captain_id === member.id);
            const isOpen = open === member.id;
            return (
              <li key={member.id} className="rounded-lg bg-mist px-4 py-3.5">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold">
                      {member.full_name?.trim() || member.email || member.id.slice(0, 8)}
                      {member.role !== "member" ? chip(t(`memberRole.${member.role}`), "ink") : null}
                      {member.strava ? chip(t("memberFilter.athletes"), "sea") : null}
                      {member.pages > 0 ? chip(t("memberFilter.fundraisers"), "sea") : null}
                      {member.registrations > 0 ? chip(t("memberFilter.participants")) : null}
                      {member.teams > 0 ? chip(t("memberChipCaptain")) : null}
                      {member.donations > 0 ? chip(t("memberChipDonor")) : null}
                    </p>
                    <p className="mt-0.5 text-[13.5px] text-black/60">
                      {member.full_name?.trim() && member.email ? <>{member.email} · </> : null}
                      {member.joined_at ? t("memberJoined", { date: member.joined_at.slice(0, 10) }) : null}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[13px] tabular-nums text-black/70">
                      {member.pages > 0 ? <span>{t("memberRaised", { amount: money(member.raised_cents), pages: member.pages })}</span> : null}
                      {member.strava ? <span>{t("memberRuns", { count: member.activities_30d })}{member.awards > 0 ? ` · ${t("memberAwards", { count: member.awards })}` : ""}</span> : null}
                      {member.donations > 0 ? <span>{t("memberGiven", { amount: money(member.given_cents), count: member.donations })}</span> : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : member.id)}
                    className="rounded-lg bg-paper px-3 py-1.5 text-[13.5px] font-semibold transition-colors hover:bg-mist-2"
                  >
                    {isOpen ? t("memberClose") : t("memberOpen")}
                  </button>
                </div>

                {isOpen ? (
                  <div className="mt-3 space-y-4 border-t-[0.5px] border-line pt-3">
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
