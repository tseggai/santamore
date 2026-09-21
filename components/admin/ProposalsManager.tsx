"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { chooseProposal, saveCriterion, setProposalStatus } from "@/app/[locale]/admin/(protected)/kampanje/prijedlozi/actions";
import { TestFlagButtons } from "@/components/admin/TestFlagButtons";
import { SidePanel } from "@/components/console/SidePanel";
import { formatShortDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { SHORTLIST_SIZE } from "@/lib/proposals";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface ProposalRow {
  id: string;
  proposer_id: string;
  proposer_name: string;
  title: string;
  summary: string;
  location: string | null;
  beneficiary: string | null;
  amount_cents: number | null;
  status: "open" | "rejected" | "shortlisted" | "chosen" | "declined";
  rejection_reasons: string[];
  staff_note: string | null;
  campaign_id: string | null;
  created_at: string;
  votes: number;
  is_test?: boolean;
}

export interface CriterionRow {
  id: string;
  sort_order: number;
  question_me: string;
  question_en: string;
  question_ru: string;
  disqualify_on: boolean;
  reason_me: string;
  reason_en: string;
  reason_ru: string;
  is_active: boolean;
}

type Filter = "all" | ProposalRow["status"];

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

/**
 * Proposals ranked by votes with the shortlist marked, a filter by state,
 * the review in a slide-over (shortlist, choose → cause, decline with a
 * note), and the screening questions editable in another.
 */
export function ProposalsManager({
  locale,
  lead,
  proposals,
  criteria,
  chapters,
  canManage = false,
}: {
  locale: Locale;
  lead: string;
  /** Admin: the test flag is theirs (set_record_test). */
  canManage?: boolean;
  proposals: ProposalRow[];
  criteria: CriterionRow[];
  chapters: { id: string; name: string }[];
}) {
  const t = useTranslations("admin");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [criterionOpen, setCriterionOpen] = useState<CriterionRow | "new" | null>(null);

  const ranked = [...proposals].sort((a, b) => b.votes - a.votes || a.created_at.localeCompare(b.created_at));
  const running = ranked.filter((p) => p.status === "open" || p.status === "shortlisted").map((p) => p.id);
  const shown = ranked.filter((p) => filter === "all" || p.status === filter);
  const current = proposals.find((p) => p.id === open) ?? null;
  const statusKey = (status: ProposalRow["status"]) =>
    ({ open: "prStatusOpen", rejected: "prStatusRejected", shortlisted: "prStatusShortlisted", chosen: "prStatusChosen", declined: "prStatusDeclined" })[status] as
      | "prStatusOpen"
      | "prStatusRejected"
      | "prStatusShortlisted"
      | "prStatusChosen"
      | "prStatusDeclined";
  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${active ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"}`;

  return (
    <div className="space-y-5">
      <p className="text-[14px] leading-relaxed text-black/60">{lead}</p>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("prFilter")}>
        {(["all", "open", "shortlisted", "chosen", "declined", "rejected"] as Filter[]).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={chip(filter === value)}>
            {value === "all" ? t("prAll") : t(statusKey(value))}
            <span className="ml-1.5 font-mono text-[12px] opacity-70">{value === "all" ? proposals.length : proposals.filter((p) => p.status === value).length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-[14.5px] text-black/55">—</p>
      ) : (
        <ul className="overflow-hidden rounded-lg bg-mist">
          {shown.map((p) => {
            const rank = running.indexOf(p.id);
            const shortlisted = rank > -1 && rank < SHORTLIST_SIZE;
            return (
              <li key={p.id} className="border-t-[0.5px] border-line first:border-t-0">
                <button type="button" onClick={() => setOpen(p.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-mist-2">
                  <span className="w-12 shrink-0 font-mono text-[15px] tabular-nums">▲ {p.votes}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{p.title}</span>
                    <span className="block truncate text-[13px] text-black/55">
                      {formatShortDate(p.created_at, locale)} · {t("prBy")} {p.proposer_name || "—"}
                      {p.location ? ` · ${p.location}` : ""}
                      {p.amount_cents ? ` · ~${formatCents(p.amount_cents, locale, { trimWholeCents: true })}` : ""}
                    </span>
                  </span>
                  {p.is_test ? <span className="rounded-full bg-red px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">{t("testChip")}</span> : null}
                  {shortlisted ? <span className="rounded-full bg-sea px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">{t("prStatusShortlisted")}</span> : null}
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${p.status === "chosen" ? "bg-red text-paper" : p.status === "rejected" || p.status === "declined" ? "bg-paper text-black/50" : "bg-paper text-black/70"}`}>
                    {t(statusKey(p.status))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <section className="border-t-[0.5px] border-line pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">{t("criteriaHeading")}</h2>
            <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("criteriaHint")}</p>
          </div>
          <button type="button" onClick={() => setCriterionOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
            + {t("criteriaAdd")}
          </button>
        </div>
        <ol className="mt-3 overflow-hidden rounded-lg bg-mist">
          {criteria.map((c, index) => (
            <li key={c.id} className="border-t-[0.5px] border-line first:border-t-0">
              <button type="button" onClick={() => setCriterionOpen(c)} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-mist-2 ${c.is_active ? "" : "opacity-50"}`}>
                <span className="font-mono text-[12px] text-red">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px]">{c.question_en}</span>
                  <span className="block text-[13px] text-black/55">
                    {t("criteriaDisqualifyOn")}: <span className="font-semibold">{c.disqualify_on ? t("yes") : t("no")}</span> · {c.reason_en}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <SidePanel open={current !== null} title={current?.title ?? ""} onClose={() => setOpen(null)}>
        {current ? <ProposalPanel proposal={current} chapters={chapters} locale={locale} canManage={canManage} onDone={() => setOpen(null)} /> : null}
      </SidePanel>
      <SidePanel open={criterionOpen !== null} title={t("criteriaEdit")} onClose={() => setCriterionOpen(null)}>
        {criterionOpen ? <CriterionForm criterion={criterionOpen === "new" ? null : criterionOpen} nextOrder={(criteria.at(-1)?.sort_order ?? 0) + 10} onDone={() => setCriterionOpen(null)} /> : null}
      </SidePanel>
    </div>
  );
}

function ProposalPanel({ proposal, chapters, locale, canManage, onDone }: { proposal: ProposalRow; chapters: { id: string; name: string }[]; locale: Locale; canManage: boolean; onDone: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [note, setNote] = useState(proposal.staff_note ?? "");
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const act = async (fn: () => Promise<{ ok: boolean }>) => {
    setState("busy");
    const result = await fn().catch(() => ({ ok: false }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState("error");
    }
  };
  const decided = proposal.status === "chosen";

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-black/60">
        {formatShortDate(proposal.created_at, locale)} · {t("prBy")} {proposal.proposer_name || "—"} · ▲ {proposal.votes} {t("prVotes")}
      </p>
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{proposal.summary}</p>
      <dl className="grid gap-x-4 gap-y-2 text-[14px] sm:grid-cols-2">
        {proposal.location ? (<><dt className="font-semibold">{t("cpLocation")}</dt><dd>{proposal.location}</dd></>) : null}
        {proposal.beneficiary ? (<><dt className="font-semibold">{t("campBeneficiary")}</dt><dd>{proposal.beneficiary}</dd></>) : null}
        {proposal.amount_cents ? (<><dt className="font-semibold">{t("campGoal")}</dt><dd className="font-mono tabular-nums">{formatCents(proposal.amount_cents, locale, { trimWholeCents: true })}</dd></>) : null}
      </dl>
      {proposal.rejection_reasons.length > 0 ? (
        <div className="rounded-lg bg-paper px-4 py-3 text-[14px]">
          <p className="font-semibold text-red-dark">{t("prReasons")}</p>
          <ul className="mt-1 list-disc pl-5 text-black/70">
            {proposal.rejection_reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ) : null}
      {proposal.campaign_id ? (
        <Link href="/admin/kampanje" className="inline-block text-[14.5px] font-semibold text-sea underline underline-offset-2">{t("prChosenCause")} →</Link>
      ) : null}
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <TestFlagButtons kind="proposal" ids={[proposal.id]} isTest={() => Boolean(proposal.is_test)} clear={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold hover:bg-mist-2 disabled:opacity-60" />
        </div>
      ) : null}

      {!decided ? (
        <>
          <div>
            <label htmlFor="prNote" className={labelClass}>{t("prNote")}</label>
            <textarea id="prNote" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
          {proposal.status !== "rejected" ? (
            <div>
              <label htmlFor="prChapter" className={labelClass}>{t("evChapter")}</label>
              <select id="prChapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={inputClass}>
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : null}
          {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {proposal.status !== "rejected" ? (
              <button type="button" disabled={state === "busy" || !chapterId} onClick={() => act(() => chooseProposal({ id: proposal.id, chapterId }))} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper hover:bg-red-dark disabled:opacity-60">
                {t("prChoose")}
              </button>
            ) : null}
            {proposal.status === "shortlisted" ? (
              <button type="button" disabled={state === "busy"} onClick={() => act(() => setProposalStatus({ id: proposal.id, status: "open", note: note.trim() || null }))} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold hover:bg-mist-2 disabled:opacity-60">
                {t("prUnshortlist")}
              </button>
            ) : proposal.status !== "rejected" ? (
              <button type="button" disabled={state === "busy"} onClick={() => act(() => setProposalStatus({ id: proposal.id, status: "shortlisted", note: note.trim() || null }))} className="rounded-lg bg-ink px-4 py-2.5 text-[14.5px] font-bold text-paper hover:opacity-90 disabled:opacity-60">
                {t("prShortlist")}
              </button>
            ) : null}
            {proposal.status !== "declined" ? (
              <button type="button" disabled={state === "busy"} onClick={() => act(() => setProposalStatus({ id: proposal.id, status: "declined", note: note.trim() || null }))} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold text-red-dark hover:bg-mist-2 disabled:opacity-60">
                {t("prDecline")}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function CriterionForm({ criterion, nextOrder, onDone }: { criterion: CriterionRow | null; nextOrder: number; onDone: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [form, setForm] = useState({
    sortOrder: String(criterion?.sort_order ?? nextOrder),
    questionMe: criterion?.question_me ?? "",
    questionEn: criterion?.question_en ?? "",
    questionRu: criterion?.question_ru ?? "",
    disqualifyOn: criterion?.disqualify_on ?? true,
    reasonMe: criterion?.reason_me ?? "",
    reasonEn: criterion?.reason_en ?? "",
    reasonRu: criterion?.reason_ru ?? "",
    isActive: criterion?.is_active ?? true,
  });
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");
  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await saveCriterion({
      id: criterion?.id,
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : "error");
    }
  };

  const text = (id: keyof typeof form, label: string, rows?: number) => (
    <div>
      <label htmlFor={`cr-${id}`} className={labelClass}>{label}</label>
      {rows ? (
        <textarea id={`cr-${id}`} rows={rows} required value={String(form[id])} onChange={(e) => set(id, e.target.value)} className={inputClass} />
      ) : (
        <input id={`cr-${id}`} type="text" required value={String(form[id])} onChange={(e) => set(id, e.target.value)} className={inputClass} />
      )}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {text("questionMe", `${t("criteriaQuestion")} · ME`, 2)}
      {text("questionEn", `${t("criteriaQuestion")} · EN`, 2)}
      {text("questionRu", `${t("criteriaQuestion")} · RU`, 2)}
      <div>
        <p className={labelClass}>{t("criteriaDisqualifyOn")}</p>
        <div className="mt-1 flex gap-1.5">
          {[true, false].map((value) => (
            <button key={String(value)} type="button" aria-pressed={form.disqualifyOn === value} onClick={() => set("disqualifyOn", value)} className={`rounded-lg px-4 py-2 text-[14px] font-semibold ${form.disqualifyOn === value ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`}>
              {value ? t("yes") : t("no")}
            </button>
          ))}
        </div>
      </div>
      {text("reasonMe", `${t("criteriaReason")} · ME`, 2)}
      {text("reasonEn", `${t("criteriaReason")} · EN`, 2)}
      {text("reasonRu", `${t("criteriaReason")} · RU`, 2)}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cr-order" className={labelClass}>{t("criteriaOrder")}</label>
          <input id="cr-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-[14.5px]">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-red" />
          {t("criteriaActive")}
        </label>
      </div>
      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper hover:opacity-90 disabled:opacity-60">{t("evSave")}</button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold hover:bg-mist-2">{t("cancel")}</button>
      </div>
    </form>
  );
}
