"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { toggleVote } from "@/app/[locale]/(site)/kampanje/predlozi/actions";
import { SidePanel } from "@/components/console/SidePanel";
import { ProposeForm } from "@/components/proposals/ProposeForm";
import { formatCents } from "@/lib/money";
import { SHORTLIST_SIZE } from "@/lib/proposals";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface PublicProposal {
  id: string;
  title: string;
  summary: string;
  location: string | null;
  beneficiary: string | null;
  amount_cents: number | null;
  status: "open" | "shortlisted" | "chosen";
  vote_count: number;
  vote_rank: number;
  proposer_first_name: string;
  campaign_slug: string | null;
  /** The reader proposed it (migration 0058). */
  is_mine?: boolean;
}

/**
 * Community proposals ranked by votes. The first five in the running wear
 * the shortlist mark; a chosen one links to the cause it became. Voting
 * is one tap for a signed-in member and a sign-in link for everyone else.
 */
export function ProposalsList({
  proposals,
  myVotes,
  signedIn,
  compact = false,
}: {
  proposals: PublicProposal[];
  myVotes: string[];
  signedIn: boolean;
  /** The sidebar form: name and the facts, no text. The full list keeps the proposer's own line breaks. */
  compact?: boolean;
}) {
  const t = useTranslations("proposals");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [voted, setVoted] = useState<Set<string>>(new Set(myVotes));
  const [busy, setBusy] = useState<string | null>(null);
  // The proposer may rewrite their proposal until the first vote lands.
  const [editing, setEditing] = useState<string | null>(null);
  // The full list shows one line of each proposal until it is opened.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [voteError, setVoteError] = useState<{ id: string; kind: "closed" | "server" } | null>(null);

  const vote = async (proposal: PublicProposal) => {
    const on = !voted.has(proposal.id);
    setBusy(proposal.id);
    setVoteError(null);
    const result = await toggleVote({ proposalId: proposal.id, on }).catch(() => ({ ok: false as const, error: "server" as const }));
    setBusy(null);
    if (!result.ok) {
      setVoteError({ id: proposal.id, kind: "error" in result && result.error === "closed" ? "closed" : "server" });
      return;
    }
    if (result.ok) {
      setVoted((set) => {
        const next = new Set(set);
        if (on) next.add(proposal.id);
        else next.delete(proposal.id);
        return next;
      });
      router.refresh();
    }
  };

  if (proposals.length === 0) return <p className="mt-4 text-[15px] text-black/60">{t("empty")}</p>;
  const editingProposal = proposals.find((proposal) => proposal.id === editing) ?? null;
  const voteBox = compact ? "h-12 w-12" : "h-14 w-14";

  return (
    <>
    <ul className={compact ? "mt-4 space-y-1.5" : "mt-4 space-y-2"}>
      {proposals.map((proposal) => {
        const inRunning = proposal.status !== "chosen";
        const shortlisted = inRunning && proposal.vote_rank <= SHORTLIST_SIZE;
        const mine = voted.has(proposal.id);
        const editable = Boolean(proposal.is_mine) && proposal.status === "open" && proposal.vote_count === 0;
        // The count shown follows the tap without waiting for the refresh.
        const count = proposal.vote_count + (mine && !myVotes.includes(proposal.id) ? 1 : !mine && myVotes.includes(proposal.id) ? -1 : 0);
        return (
          <li key={proposal.id} className={compact ? "flex gap-3 rounded-lg bg-mist px-4 py-3" : "flex gap-4 rounded-lg bg-mist px-5 py-4"}>
            <div className="shrink-0 text-center">
              {inRunning ? (
                signedIn ? (
                  <button
                    type="button"
                    aria-pressed={mine}
                    disabled={busy === proposal.id}
                    onClick={() => vote(proposal)}
                    className={`flex ${voteBox} flex-col items-center justify-center rounded-lg text-[12px] font-bold transition-colors disabled:opacity-60 ${mine ? "bg-sea text-paper" : "bg-paper hover:bg-mist-2"}`}
                  >
                    <span aria-hidden className="text-[16px] leading-none">▲</span>
                    <span className="mt-0.5 font-mono text-[14px] tabular-nums">{count}</span>
                  </button>
                ) : (
                  <Link href={`/dashboard/prijava`} title={t("signInToVote")} className={`flex ${voteBox} flex-col items-center justify-center rounded-lg bg-paper text-[12px] font-bold hover:bg-mist-2`}>
                    <span aria-hidden className="text-[16px] leading-none">▲</span>
                    <span className="mt-0.5 font-mono text-[14px] tabular-nums">{count}</span>
                  </Link>
                )
              ) : (
                <span className={`flex ${voteBox} flex-col items-center justify-center rounded-lg bg-paper font-mono text-[14px] tabular-nums text-black/60`}>{count}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className={compact ? "text-[15px] font-bold leading-snug" : "text-[16px] font-bold"}>{proposal.title}</span>
                {proposal.status === "chosen" ? (
                  <span className="rounded-full bg-red px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">{t("chosen")}</span>
                ) : shortlisted ? (
                  <span className="rounded-full bg-sea px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">{t("shortlist")}</span>
                ) : null}
              </p>
              {/* the facts first: where, who benefits, roughly how much */}
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13.5px] text-black/55">
                {proposal.location ? <span>{proposal.location}</span> : null}
                {proposal.beneficiary ? <span>· {proposal.beneficiary}</span> : null}
                {proposal.amount_cents ? <span className="font-mono tabular-nums">· ~{formatCents(proposal.amount_cents, locale, { trimWholeCents: true })}</span> : null}
              </p>
              {compact ? null : (
                <>
                  <p className={`mt-2 text-[14.5px] leading-relaxed text-black/75 ${expanded.has(proposal.id) ? "whitespace-pre-line" : "truncate"}`}>{proposal.summary}</p>
                  <button
                    type="button"
                    aria-expanded={expanded.has(proposal.id)}
                    onClick={() => setExpanded((set) => { const next = new Set(set); if (next.has(proposal.id)) next.delete(proposal.id); else next.add(proposal.id); return next; })}
                    className="mt-1 text-[13.5px] font-semibold text-sea underline underline-offset-2 hover:text-sea-2"
                  >
                    {expanded.has(proposal.id) ? t("readLess") : t("readMore")}
                  </button>
                </>
              )}
              {voteError?.id === proposal.id ? (
                <p role="alert" className="mt-2 text-[13.5px] font-semibold text-red-dark">{voteError.kind === "closed" ? t("voteClosed") : t("voteFailed")}</p>
              ) : null}
              <p className={`flex flex-wrap gap-x-3 gap-y-1 text-[13.5px] text-black/55 ${compact ? "mt-1" : "mt-2"}`}>
                {proposal.proposer_first_name && !compact ? <span>{t("byName", { name: proposal.proposer_first_name })}</span> : null}
                {proposal.campaign_slug ? (
                  <Link href={`/kampanje/${proposal.campaign_slug}`} className="font-semibold text-sea underline underline-offset-2 hover:text-sea-2">→ {t("chosen")}</Link>
                ) : null}
                {editable && editing !== proposal.id ? (
                  <button type="button" onClick={() => setEditing(proposal.id)} className="font-semibold text-sea underline underline-offset-2 hover:text-sea-2">
                    {t("edit")}
                  </button>
                ) : null}
                {proposal.is_mine && !editable && proposal.status === "open" && !compact ? <span>{t("editLockedShort")}</span> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
    {/* the proposer's edit, in the same slide-over every form on the site uses */}
    <SidePanel open={editingProposal !== null} title={editingProposal?.title ?? ""} onClose={() => setEditing(null)}>
      {editingProposal ? (
        <ProposeForm
          key={editingProposal.id}
          criteria={[]}
          edit={{ id: editingProposal.id, title: editingProposal.title, summary: editingProposal.summary, location: editingProposal.location, beneficiary: editingProposal.beneficiary, amountCents: editingProposal.amount_cents }}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
          onDeleted={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </SidePanel>
    </>
  );
}
