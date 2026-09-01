import { getTranslations } from "next-intl/server";

import { ConfirmCashButton } from "@/components/admin/ConfirmCashButton";
import { DonationActions } from "@/components/admin/DonationActions";
import { ReconciliationTool } from "@/components/admin/ReconciliationTool";
import { formatCents, parseEurosToCents } from "@/lib/money";
import { PAYMENT_REFERENCE_PATTERN } from "@/lib/references";
import { createClient } from "@/lib/supabase/server";
import type { PendingTarget } from "@/lib/reconcile";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface DonationRow {
  id: string;
  amount_cents: number;
  donor_name: string | null;
  donor_email: string | null;
  is_recurring: boolean;
  rail: "sepa" | "cash";
  status: "pending" | "approved" | "declined" | "refunded";
  created_at: string;
  approved_at: string | null;
  campaign: { title: string; payment_reference: string } | null;
  fundraiser: { title: string; payment_reference: string } | null;
}

interface RegistrationQueueRow {
  id: string;
  amount_due_cents: number;
  payment_reference: string | null;
  waiver_signed_at: string | null;
  event: { name: string } | { name: string }[] | null;
  profile: { full_name: string | null } | { full_name: string | null }[] | null;
}

const SELECT =
  "id, amount_cents, donor_name, donor_email, is_recurring, rail, status, created_at, approved_at, campaign:campaigns(title, payment_reference), fundraiser:fundraisers(title, payment_reference)";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Search across donor name, email, exact reference and exact amount.
 * PostgREST or() syntax breaks on commas/parens, so those are stripped
 * from the ilike terms — they can't appear in a name or email anyway.
 */
async function searchDonations(q: string): Promise<DonationRow[]> {
  const supabase = await createClient();
  const byId = new Map<string, DonationRow>();

  const term = q.replace(/[,()]/g, " ").trim();
  if (term) {
    const { data } = await supabase
      .from("donations")
      .select(SELECT)
      .or(`donor_name.ilike.*${term}*,donor_email.ilike.*${term}*`)
      .order("created_at", { ascending: false })
      .limit(50);
    for (const row of (data ?? []) as unknown as DonationRow[]) byId.set(row.id, row);
  }

  const reference = q.trim().toUpperCase();
  if (PAYMENT_REFERENCE_PATTERN.test(reference)) {
    const [{ data: campaign }, { data: fundraiser }] = await Promise.all([
      supabase.from("campaigns").select("id").eq("payment_reference", reference).maybeSingle(),
      supabase.from("fundraisers").select("id").eq("payment_reference", reference).maybeSingle(),
    ]);
    const filters = [
      campaign ? { column: "campaign_id", id: campaign.id } : null,
      fundraiser ? { column: "fundraiser_id", id: fundraiser.id } : null,
    ].filter((f) => f !== null);
    for (const filter of filters) {
      const { data } = await supabase
        .from("donations")
        .select(SELECT)
        .eq(filter.column, filter.id)
        .order("created_at", { ascending: false })
        .limit(50);
      for (const row of (data ?? []) as unknown as DonationRow[]) byId.set(row.id, row);
    }
  }

  const amountCents = parseEurosToCents(q);
  if (amountCents !== null) {
    const { data } = await supabase
      .from("donations")
      .select(SELECT)
      .eq("amount_cents", amountCents)
      .order("created_at", { ascending: false })
      .limit(50);
    for (const row of (data ?? []) as unknown as DonationRow[]) byId.set(row.id, row);
  }

  return [...byId.values()];
}

export default async function AdminDonationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const query = (q ?? "").trim().slice(0, 120);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: pendingData }, { data: approvedData }, { data: regData }] =
    await Promise.all([
      supabase
        .from("donations")
        .select(SELECT)
        .in("rail", ["sepa", "cash"])
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("donations")
        .select(SELECT)
        .in("rail", ["sepa", "cash"])
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(10),
      // Registrations awaiting their entry fee join the SEPA queue.
      supabase
        .from("registrations")
        .select(
          "id, amount_due_cents, payment_reference, waiver_signed_at, event:events(name), profile:profiles(full_name)",
        )
        .eq("status", "pending")
        .gt("amount_due_cents", 0)
        .not("payment_reference", "is", null),
    ]);

  const pending = (pendingData ?? []) as unknown as DonationRow[];
  const approved = (approvedData ?? []) as unknown as DonationRow[];
  const feeQueue = (regData ?? []) as unknown as RegistrationQueueRow[];
  const results = query ? await searchDonations(query) : [];

  // Statement matching is for SEPA pledges only: a pending cash row shares
  // its page's reference and would otherwise claim a real bank credit.
  const targets: PendingTarget[] = [
    ...pending
      .filter((row) => row.rail === "sepa")
      .map((row): PendingTarget => {
        const page = row.campaign ?? row.fundraiser;
        return {
          target: "pledge",
          id: row.id,
          amountCents: row.amount_cents,
          reference: page?.payment_reference ?? "",
          donorName: row.donor_name,
          donorEmail: row.donor_email,
          isRecurring: row.is_recurring,
          createdAt: row.created_at,
          pageTitle: page?.title ?? "—",
        };
      }),
    ...feeQueue.map((row): PendingTarget => {
      return {
        target: "registration",
        id: row.id,
        amountCents: row.amount_due_cents,
        reference: row.payment_reference ?? "",
        donorName: one(row.profile)?.full_name ?? null,
        donorEmail: null,
        isRecurring: false,
        createdAt: row.waiver_signed_at ?? "1970-01-01T00:00:00Z",
        pageTitle: one(row.event)?.name ?? "—",
      };
    }),
  ];

  const money = (cents: number) => formatCents(cents, locale as Locale);
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

  const table = (rows: DonationRow[], mode: "pending" | "approved" | "search") => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-sea">
            <th className="py-2 pr-3">{t("table.date")}</th>
            <th className="py-2 pr-3">{t("table.amount")}</th>
            <th className="py-2 pr-3">{t("table.donor")}</th>
            <th className="py-2 pr-3">{t("table.page")}</th>
            <th className="py-2">{t("table.reference")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const page = row.campaign ?? row.fundraiser;
            return (
              <tr key={row.id} className="border-b border-line-soft align-top">
                <td className="py-2.5 pr-3 font-mono tabular-nums">
                  {day(mode === "pending" ? row.created_at : (row.approved_at ?? row.created_at))}
                </td>
                <td className="py-2.5 pr-3 font-mono tabular-nums">
                  {money(row.amount_cents)}
                  {row.is_recurring ? (
                    <span className="ml-1 text-[11px] text-ink/50">
                      {t("table.monthly")}
                    </span>
                  ) : null}
                  {row.rail === "cash" ? (
                    <span className="ml-1 text-[11px] text-ink/50">{t("railCash")}</span>
                  ) : null}
                  {mode === "search" ? (
                    <span
                      className={
                        row.status === "refunded"
                          ? "ml-1 text-[11px] font-semibold text-red-dark"
                          : "ml-1 text-[11px] text-ink/50"
                      }
                    >
                      {t(`status.${row.status}`)}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3">
                  {row.donor_name ?? "—"}
                  {row.donor_email ? (
                    <span className="block text-[12px] text-ink/50">{row.donor_email}</span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3">{page?.title ?? "—"}</td>
                <td className="py-2.5 font-mono">
                  {page?.payment_reference ?? "—"}
                  {mode === "pending" && row.rail === "cash" ? (
                    <span className="mt-1 block font-sans">
                      <ConfirmCashButton donationId={row.id} />
                    </span>
                  ) : null}
                  {mode !== "pending" && row.status === "approved" ? (
                    <span className="mt-1 block font-sans">
                      <DonationActions
                        donationId={row.id}
                        hasEmail={row.donor_email !== null}
                      />
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("donationsTitle")}</h1>

      {/* search across every status — refunds and receipt re-sends live here */}
      <form method="get" className="mt-5 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="donation-search">
          {t("searchLabel")}
        </label>
        <input
          id="donation-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm rounded-[10px] border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-sea"
        />
        <button
          type="submit"
          className="rounded-xl bg-sea px-4 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-sea-2"
        >
          {t("searchButton")}
        </button>
      </form>
      {query ? (
        results.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink/60">{t("searchEmpty")}</p>
        ) : (
          table(results, "search")
        )
      ) : null}

      <h2 className="mt-8 text-[15px] font-bold">{t("pendingHeading")}</h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-ink/60">{t("noPending")}</p>
      ) : (
        table(pending, "pending")
      )}

      <ReconciliationTool locale={locale as Locale} pledges={targets} />

      <h2 className="mt-12 text-[15px] font-bold">{t("approvedHeading")}</h2>
      {approved.length > 0 ? table(approved, "approved") : null}
    </div>
  );
}
