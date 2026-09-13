import { getTranslations, setRequestLocale } from "next-intl/server";

import { formatCents, formatSignedCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * The summary: the same figures the public ledger shows, the two funds
 * side by side, and what is waiting on staff.
 */
export default async function MoneyOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [summary, ops, pendingDonations, feeQueue, sponsorships, disbursements] = await Promise.all([
    supabase
      .from("v_public_ledger_summary")
      .select("received_cents, disbursed_cents, approved_pending_cents, unallocated_cents")
      .single(),
    supabase.from("v_public_ops_total").select("operations_cents").single(),
    supabase.from("donations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("amount_due_cents", 0)
      .not("payment_reference", "is", null),
    supabase.from("sponsors").select("amount_cents, is_in_kind, status").limit(1000),
    supabase.from("disbursements").select("id", { count: "exact", head: true }),
  ]);

  const money = (cents: number) =>
    cents < 0
      ? formatSignedCents(cents, locale as Locale, { trimWholeCents: true })
      : formatCents(cents, locale as Locale, { trimWholeCents: true });
  const sponsorCash = (sponsorships.data ?? [])
    .filter((s) => !s.is_in_kind && (s.status === "signed" || s.status === "active"))
    .reduce((sum, s) => sum + (s.amount_cents ?? 0), 0);

  const impact = [
    { label: t("dashReceived"), value: money(summary.data?.received_cents ?? 0) },
    { label: t("dashDisbursed"), value: money(summary.data?.disbursed_cents ?? 0) },
    { label: t("moneyApprovedPending"), value: money(summary.data?.approved_pending_cents ?? 0) },
    { label: t("dashUnallocated"), value: money(summary.data?.unallocated_cents ?? 0), tone: "red" as const },
  ];
  const operations = [
    { label: t("dashOps"), value: money(ops.data?.operations_cents ?? 0) },
    { label: t("moneySponsorCash"), value: money(sponsorCash) },
  ];
  const queues = [
    { href: "/admin/novac/priliv", label: t("queuePendingDonations"), count: pendingDonations.count ?? 0 },
    { href: "/admin/novac/priliv", label: t("queueFees"), count: feeQueue.count ?? 0 },
    { href: "/admin/novac/odliv", label: t("moneyDisbursementsCount"), count: disbursements.count ?? 0, quiet: true },
  ];

  const tile = (label: string, value: string, tone?: "red") => (
    <div key={label} className="rounded-lg bg-mist px-4 py-3.5">
      <p className="text-[13px] font-semibold text-black/60">{label}</p>
      <p className={`mt-1 font-mono text-2xl tabular-nums ${tone === "red" ? "text-red-dark" : "text-black"}`}>{value}</p>
    </div>
  );

  return (
    <div className="pb-8">
      <h2 className="type-eyebrow text-black/60">{t("moneyImpactFund")}</h2>
      <p className="mt-1 text-[14px] text-black/60">{t("moneyImpactNote")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{impact.map((x) => tile(x.label, x.value, x.tone))}</div>

      <h2 className="mt-8 type-eyebrow text-black/60">{t("moneyOpsFund")}</h2>
      <p className="mt-1 text-[14px] text-black/60">{t("moneyOpsNote")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{operations.map((x) => tile(x.label, x.value))}</div>

      <h2 className="mt-8 text-[16px] font-bold">{t("queueHeading")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {queues.map((queue, index) => (
          <Link key={`${queue.href}-${index}`} href={queue.href} className="rounded-lg bg-mist px-4 py-3.5 transition-colors hover:bg-mist-2">
            <p className={`font-mono text-2xl tabular-nums ${queue.count > 0 && !queue.quiet ? "text-red-dark" : "text-black/60"}`}>{queue.count}</p>
            <p className="mt-1 text-[13.5px] font-semibold text-black/70">{queue.label}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-[14px]">
        <Link href="/transparentnost" className="font-semibold text-sea underline underline-offset-2">
          {t("moneyLedgerLink")} ↗
        </Link>
      </p>
    </div>
  );
}
