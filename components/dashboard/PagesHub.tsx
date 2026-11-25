"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPageEditor, type PageEditorData } from "@/app/[locale]/dashboard/(protected)/actions";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/console/PageHeader";
import { SidePanel } from "@/components/console/SidePanel";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { CashForm } from "@/components/dashboard/CashForm";
import { CreatePageForm, type EventChoice } from "@/components/dashboard/CreatePageForm";
import { PageEditor } from "@/components/dashboard/PageEditor";
import { TeamsManager, type MyTeam, type TeamEventChoice } from "@/components/dashboard/TeamsManager";
import { ExternalIcon } from "@/components/Icons";
import type { ChallengeMetric } from "@/lib/metrics";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface HubPage {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "hidden";
  goalCents: number | null;
  photoPath: string | null;
  causeName: string;
  causeSlug: string | null;
  teamName: string | null;
  teamSlug: string | null;
  raisedCents: number;
  donorCount: number;
}

/**
 * Fundraising: "My pages" and, below it, "My teams", each with a + beside
 * its heading (owner decision 2026-11-25). A row opens its editor in the
 * slide-over; the create form opens in one too, and hands over to the
 * editor when done.
 */
export function PagesHub({
  pages,
  teams,
  teamEvents,
  choices,
  defaultName,
  initialOpen,
  havePage = null,
  openCreate,
  defaultEventSlug,
  joinTeamId = null,
  title,
}: {
  pages: HubPage[];
  teams: MyTeam[];
  teamEvents: TeamEventChoice[];
  choices: EventChoice[];
  defaultName: string;
  /** Page slug to open on load (deep link). */
  initialOpen?: string;
  /** "Raise money for this cause" when a page already exists: say so over the list. */
  havePage?: HubPage | null;
  openCreate?: boolean;
  defaultEventSlug?: string | null;
  /** "Join this team": the new page opens in the full editor with the team preselected. */
  joinTeamId?: string | null;
  title: string;
}) {
  const t = useTranslations("dashboard");
  const tRunner = useTranslations("runner");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>(openCreate ? "new" : (initialOpen ?? ""));
  const [editor, setEditor] = useState<PageEditorData | null>(null);
  const [have, setHave] = useState<HubPage | null>(havePage);
  const haveRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = haveRef.current;
    if (!dialog) return;
    if (have && !dialog.open) dialog.showModal();
    if (!have && dialog.open) dialog.close();
  }, [have]);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  const load = useCallback(async (slug: string) => {
    setEditor(null);
    const data = await fetchPageEditor(slug).catch(() => null);
    if (data) setEditor(data);
  }, []);

  useEffect(() => {
    if (open && open !== "new") void load(open);
  }, [open, load]);

  const openPage = pages.find((page) => page.slug === open) ?? null;
  const panelTitle = open === "new" ? t("createHeading") : (openPage?.title ?? editor?.fundraiser.title ?? "");

  return (
    <div className="space-y-5">
      <PageHeader title={title} />

      <dialog
        ref={haveRef}
        aria-labelledby="have-title"
        onClose={() => setHave(null)}
        onCancel={(event) => {
          event.preventDefault();
          setHave(null);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setHave(null);
        }}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-lg bg-paper p-0 ring-[100vmax] ring-ink/55"
      >
        {have ? (
          <div className="p-6">
            <p className="type-eyebrow text-sea/80">{have.causeName}</p>
            <h2 id="have-title" className="type-display mt-2 text-2xl">{t("fundraiseHave")}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-black/65">
              {t("fundraiseHaveSub", { title: have.title, status: have.status === "active" ? t("statusActiveShort") : t("statusDraftShort") })}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const slug = have.slug;
                  setHave(null);
                  setOpen(slug);
                }}
                className="inline-flex h-11 items-center rounded-lg bg-red px-6 text-[15.5px] font-bold text-paper transition-colors hover:bg-red-dark"
              >
                {have.status === "active" ? t("haveEditCta") : t("haveFinishCta")}
              </button>
              <button type="button" onClick={() => setHave(null)} className="inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2">
                {t("haveLater")}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>

      <SidePanel open={open !== ""} title={panelTitle} onClose={() => setOpen("")} wide bare={open !== "new"}>
        {open === "new" ? (
          <>
            <p className="text-[14.5px] leading-relaxed text-black/65">{t("createSub")}</p>
            <div className="mt-4">
              <CreatePageForm
                locale={locale}
                defaultName={defaultName}
                events={choices}
                defaultEventSlug={defaultEventSlug ?? null}
                joinTeamId={joinTeamId}
                onCreated={(slug) => {
                  router.refresh();
                  setOpen(slug);
                }}
              />
            </div>
          </>
        ) : editor ? (
          <div>
            <PageEditor
              key={editor.fundraiser.id}
              locale={locale}
              fundraiser={editor.fundraiser}
              causes={editor.causes}
              teams={editor.teams}
              captainOf={editor.captainOf}
              presetTeamId={joinTeamId}
              raisedCents={editor.raisedCents}
              donorCount={editor.donorCount}
              inPanel
            >
            {editor.event?.kind === "challenge" && editor.event.challenge_metric ? (
              <ActivityLog fundraiserId={editor.fundraiser.id} metric={editor.event.challenge_metric as ChallengeMetric} activities={editor.activities} surface="paper" />
            ) : null}
            <section id="gotovina" className="mt-8 rounded-lg bg-paper p-5">
              <h2 className="text-[16px] font-bold">{t("cashHeading")}</h2>
              <p className="mt-1 text-[14.5px] leading-relaxed text-black/65">{t("cashSub")}</p>
              <div className="mt-4">
                <CashForm fundraiserId={editor.fundraiser.id} />
              </div>
              {editor.cash.length > 0 ? (
                <ul className="mt-5">
                  {editor.cash.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t-[0.5px] border-line py-2.5 text-[14.5px]">
                      <span className="font-mono tabular-nums text-black/60">{row.created_at.slice(0, 10)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{row.donor_name ?? tRunner("anonymous")}</span>
                        {row.message ? <span className="text-black/55"> · {row.message}</span> : null}
                      </span>
                      <span className={`text-[13.5px] ${row.status === "approved" ? "text-sea" : "text-black/50"}`}>
                        {row.status === "approved" ? t("cashConfirmed") : t("cashAwaiting")}
                      </span>
                      <span className="font-mono font-medium tabular-nums">{money(row.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            </PageEditor>
          </div>
        ) : (
          <div aria-busy className="space-y-3">
            <div className="h-[68px] w-[68px] animate-pulse rounded-full bg-paper motion-reduce:animate-none" />
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-paper motion-reduce:animate-none" />
            <div className="h-40 animate-pulse rounded-lg bg-paper motion-reduce:animate-none" />
            <div className="h-24 animate-pulse rounded-lg bg-paper motion-reduce:animate-none" />
          </div>
        )}
      </SidePanel>

      <div className="max-w-3xl space-y-10">
        <section>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold">{t("pagesHeading")}</h2>
              <p className="mt-0.5 text-[14px] leading-relaxed text-black/60">{t("pagesSub")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen("new")}
              aria-label={t("newPage")}
              title={t("newPage")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red text-[22px] font-bold leading-none text-paper transition-colors hover:bg-red-dark"
            >
              +
            </button>
          </div>
          {pages.length === 0 ? (
            <div className="mt-3 rounded-lg bg-mist px-5 py-6">
              <h2 className="text-[17px] font-bold leading-snug">{t("hubEmptyHeading")}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-black/70">{t("hubEmptySub")}</p>
              <ol className="mt-4 space-y-2">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex gap-3 text-[15px] leading-relaxed text-black/75">
                    <span className="font-mono text-[13px] font-bold tabular-nums text-red">{n}</span>
                    <span>{t(`hubStep${n}`)}</span>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => setOpen("new")} className="mt-5 rounded-lg bg-red px-5 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
                + {t("newPage")}
              </button>
            </div>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg bg-mist">
              {pages.map((page) => {
                const live = page.status === "active";
                const pct = page.goalCents && page.goalCents > 0 ? Math.min(100, Math.round((page.raisedCents / page.goalCents) * 100)) : 0;
                return (
                  <li key={page.id} className="border-t-[0.5px] border-line first:border-t-0">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpen(page.slug)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpen(page.slug);
                        }
                      }}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-mist-2 focus:outline-none focus-visible:bg-mist-2 sm:gap-4"
                    >
                      <Avatar src={fundraiserPhotoUrl(page.photoPath)} name={page.title} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[15.5px] font-bold">{page.title}</span>
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${live ? "bg-sea text-paper" : "bg-paper text-black/60"}`}>
                            {live ? t("statusActiveShort") : t("statusDraftShort")}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-[13.5px] text-black/60">
                          {page.causeName}
                          {page.teamName ? ` · ${page.teamName}` : ""}
                        </p>
                        <span className="mt-2 block h-[5px] max-w-[280px] overflow-hidden rounded-[3px] bg-mist-2">
                          <span className="block h-full rounded-[3px] bg-sea" style={{ width: `${Math.max(2, pct)}%` }} />
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[15px] tabular-nums">
                          {money(page.raisedCents)}
                          {page.goalCents ? <span className="text-[12.5px] text-black/45"> / {money(page.goalCents)}</span> : null}
                        </p>
                        <p className="text-[12.5px] text-black/55">
                          {page.donorCount} {tRunner("donors")}
                          {page.goalCents ? ` · ${pct}%` : ""}
                        </p>
                      </div>
                      {live ? (
                        <Link
                          href={`/f/${page.slug}`}
                          target="_blank"
                          aria-label={t("viewPublic")}
                          title={t("viewPublic")}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-black/70 transition-colors hover:bg-mist-2 hover:text-sea"
                        >
                          <ExternalIcon />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <TeamsManager teams={teams} events={teamEvents} />
      </div>
    </div>
  );
}
