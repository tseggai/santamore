"use client";

import { useTranslations } from "next-intl";
import { useState, type ChangeEvent } from "react";

import {
  approvePledge,
  createDonationFromStatement,
} from "@/app/[locale]/admin/(protected)/donacije/actions";
import { parseCsv } from "@/lib/csv";
import { formatCents } from "@/lib/money";
import {
  buildStatementRows,
  parseStatementDate,
  proposeMatches,
  type MatchProposal,
  type PendingPledge,
} from "@/lib/reconcile";
import type { Locale } from "@/i18n/routing";

type RowState = "idle" | "busy" | "done" | "error";

function guessColumn(header: string[], pattern: RegExp, fallback: number): number {
  const index = header.findIndex((cell) => pattern.test(cell));
  return index === -1 ? fallback : index;
}

/**
 * CSV reconciliation (brief §8): the statement is parsed entirely in the
 * browser — only rows the admin explicitly confirms are sent to the server.
 * The bank's export format is unknown, so columns are mapped by hand with
 * header-based guesses.
 */
export function ReconciliationTool({
  locale,
  pledges,
}: {
  locale: Locale;
  pledges: PendingPledge[];
}) {
  const t = useTranslations("admin");

  const [rawRows, setRawRows] = useState<string[][] | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [dateColumn, setDateColumn] = useState(0);
  const [amountColumn, setAmountColumn] = useState(1);
  const [descriptionColumns, setDescriptionColumns] = useState<number[]>([]);
  const [proposals, setProposals] = useState<MatchProposal[] | null>(null);
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});

  const header = rawRows && hasHeader ? rawRows[0] : null;
  const columnCount = rawRows?.[0]?.length ?? 0;
  const columnLabel = (index: number) =>
    header?.[index]?.trim() ? header[index].trim() : `#${index + 1}`;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows.length === 0) return;
    setRawRows(rows);
    setProposals(null);
    setRowStates({});
    const head = rows[0].map((cell) => cell.toLowerCase());
    const date = guessColumn(head, /datum|date|дата/, 0);
    const amount = guessColumn(head, /iznos|amount|credit|uplat|сумма/, 1);
    setDateColumn(date);
    setAmountColumn(amount);
    setDescriptionColumns(
      rows[0].map((_, index) => index).filter((index) => index !== date && index !== amount),
    );
  };

  const propose = () => {
    if (!rawRows) return;
    const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
    setRowStates({});
    setProposals(
      proposeMatches(
        buildStatementRows(dataRows, {
          dateColumn,
          amountColumn,
          descriptionColumns,
        }),
        pledges,
      ),
    );
  };

  const run = async (index: number, action: () => Promise<{ ok: boolean }>) => {
    setRowStates((state) => ({ ...state, [index]: "busy" }));
    const result = await action().catch(() => ({ ok: false }));
    setRowStates((state) => ({ ...state, [index]: result.ok ? "done" : "error" }));
  };

  const money = (cents: number) => formatCents(cents, locale);

  const selectClass =
    "mt-1 w-full rounded-[9px] border-[1.5px] border-line bg-paper px-2.5 py-2 text-[13.5px] outline-none focus:border-sea";

  return (
    <section className="mt-10 rounded-brand border-[1.5px] border-line px-4 py-4">
      <h2 className="text-[15px] font-bold">{t("uploadHeading")}</h2>
      <p className="mt-1 text-[13px] text-ink/60">{t("uploadHint")}</p>

      <label className="mt-3 inline-block">
        <span className="sr-only">{t("chooseFile")}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="text-[13.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-sea file:px-4 file:py-2 file:font-semibold file:text-paper"
        />
      </label>

      {rawRows ? (
        <>
          <p className="mt-2 font-mono text-[12px] text-ink/60">
            {t("statementRows", {
              count: hasHeader ? rawRows.length - 1 : rawRows.length,
            })}
          </p>
          <label className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(event) => setHasHeader(event.target.checked)}
              className="h-4 w-4 accent-sea"
            />
            {t("hasHeader")}
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-[13px] font-semibold">
              {t("colDate")}
              <select
                value={dateColumn}
                onChange={(event) => setDateColumn(Number(event.target.value))}
                className={selectClass}
              >
                {Array.from({ length: columnCount }, (_, index) => (
                  <option key={index} value={index}>
                    {columnLabel(index)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px] font-semibold">
              {t("colAmount")}
              <select
                value={amountColumn}
                onChange={(event) => setAmountColumn(Number(event.target.value))}
                className={selectClass}
              >
                {Array.from({ length: columnCount }, (_, index) => (
                  <option key={index} value={index}>
                    {columnLabel(index)}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-[13px] font-semibold">
              <legend>{t("colDescription")}</legend>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {Array.from({ length: columnCount }, (_, index) => (
                  <label key={index} className="flex items-center gap-1.5 font-normal">
                    <input
                      type="checkbox"
                      checked={descriptionColumns.includes(index)}
                      onChange={(event) =>
                        setDescriptionColumns((columns) =>
                          event.target.checked
                            ? [...columns, index].sort((a, b) => a - b)
                            : columns.filter((column) => column !== index),
                        )
                      }
                      className="h-4 w-4 accent-sea"
                    />
                    {columnLabel(index)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <button
            type="button"
            onClick={propose}
            className="mt-4 rounded-xl bg-sea px-5 py-2.5 text-[14px] font-bold text-paper transition-colors hover:bg-sea-2"
          >
            {t("propose")}
          </button>
        </>
      ) : null}

      {proposals ? (
        <ul className="mt-5 space-y-3">
          {proposals.map((proposal, index) => {
            const state = rowStates[index] ?? "idle";
            const row = proposal.row;
            const approvedAtIso = parseStatementDate(row.dateText) ?? undefined;
            return (
              <li
                key={index}
                className="rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[13.5px]"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono tabular-nums text-ink/60">{row.dateText}</span>
                  <span className="font-mono font-medium tabular-nums">
                    {row.amountCents !== null ? money(row.amountCents) : row.amountText}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink/60">{row.description}</span>
                </div>

                {proposal.kind === "matched" ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-mist px-2.5 py-0.5 font-mono text-[11px] text-sea">
                      {t("matchFound")}
                    </span>
                    <span>
                      {proposal.pledge.donorName ?? "—"} · {proposal.pledge.pageTitle} ·{" "}
                      <span className="font-mono tabular-nums">
                        {money(proposal.pledge.amountCents)}
                      </span>
                    </span>
                    {!proposal.amountMatches ? (
                      <span className="font-semibold text-red-dark">
                        {t("amountDiffers", { pledged: money(proposal.pledge.amountCents) })}
                      </span>
                    ) : null}
                    {state === "done" ? (
                      <span className="font-semibold text-sea">{t("approvedOk")}</span>
                    ) : (
                      <button
                        type="button"
                        disabled={state === "busy"}
                        onClick={() =>
                          run(index, () =>
                            approvePledge({
                              donationId: proposal.pledge.id,
                              approvedAtIso,
                              ...(proposal.amountMatches || row.amountCents === null
                                ? {}
                                : { amountCents: row.amountCents }),
                            }),
                          )
                        }
                        className="rounded-lg bg-red px-3.5 py-1.5 text-[12.5px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60"
                      >
                        {proposal.amountMatches || row.amountCents === null
                          ? t("approve")
                          : t("approveWithStatementAmount")}
                      </button>
                    )}
                  </div>
                ) : null}

                {proposal.kind === "unmatched-reference" ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span>
                      {t("refWithoutPledge", { reference: proposal.reference })}
                    </span>
                    {state === "done" ? (
                      <span className="font-semibold text-sea">{t("approvedOk")}</span>
                    ) : (
                      <button
                        type="button"
                        disabled={state === "busy" || row.amountCents === null}
                        onClick={() =>
                          run(index, () =>
                            createDonationFromStatement({
                              reference: proposal.reference,
                              amountCents: row.amountCents,
                              approvedAtIso,
                            }),
                          )
                        }
                        className="rounded-lg border-[1.5px] border-line px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors hover:border-sea hover:text-sea disabled:opacity-50"
                      >
                        {t("createRow")}
                      </button>
                    )}
                  </div>
                ) : null}

                {proposal.kind === "no-reference" ? (
                  <p className="mt-2 text-ink/50">{t("noReference")}</p>
                ) : null}

                {state === "error" ? (
                  <p role="alert" className="mt-2 font-semibold text-red-dark">
                    {t("actionError")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
