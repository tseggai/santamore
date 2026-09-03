import { getTranslations } from "next-intl/server";

import { OverviewChart, type DayPoint } from "@/components/admin/OverviewChart";
import { formatCents, formatSignedCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

async function fetchOverview() {
  const supabase = await createClient();
  const sinceIso = new Date(
    new Date().setUTCHours(0, 0, 0, 0) - 29 * DAY_MS,
  ).toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const [
    summary,
    ops,
    pendingDonations,
    recentDonations,
    regTotal,
    regConfirmed,
    feeQueue,
    fundraisers,
    inboundWeek,
  ] = await Promise.all([
    supabase
      .from("v_public_ledger_summary")
      .select("received_cents, disbursed_cents, approved_pending_cents, unallocated_cents")
      .single(),
    supabase.from("v_public_ops_total").select("operations_cents").single(),
    supabase
      .from("donations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("donations")
      .select("approved_at, amount_cents")
      .eq("status", "approved")
      .gte("approved_at", sinceIso)
      .limit(2000),
    supabase.from("registrations").select("id", { count: "exact", head: true }),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("amount_due_cents", 0)
      .not("payment_reference", "is", null),
    supabase.from("fundraisers").select("status").limit(1000),
    supabase
      .from("inbound_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgoIso),
  ]);

  // Bucket approved money-in per UTC day for the 30-day chart.
  const start = new Date(sinceIso).getTime();
  const days: DayPoint[] = Array.from({ length: 30 }, (_, index) => ({
    date: new Date(start + index * DAY_MS).toISOString().slice(0, 10),
    cents: 0,
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  let chartTotal = 0;
  for (const row of recentDonations.data ?? []) {
    if (!row.approved_at) continue;
    const bucket = byDate.get(row.approved_at.slice(0, 10));
    if (bucket) {
      bucket.cents += row.amount_cents;
      chartTotal += row.amount_cents;
    }
  }

  const pageCounts = { active: 0, draft: 0, hidden: 0 };
  for (const row of fundraisers.data ?? []) {
    if (row.status in pageCounts) pageCounts[row.status as keyof typeof pageCounts] += 1;
  }

  return {
    summary: summary.data,
    opsCents: ops.data?.operations_cents ?? 0,
    pendingDonations: pendingDonations.count ?? 0,
    days,
    chartTotal,
    regTotal: regTotal.count ?? 0,
    regConfirmed: regConfirmed.count ?? 0,
    feeQueue: feeQueue.count ?? 0,
    pageCounts,
    inboundWeek: inboundWeek.count ?? 0,
  };
}

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const data = await fetchOverview();

  const money = (cents: number) =>
    cents < 0
      ? formatSignedCents(cents, locale as Locale, { trimWholeCents: true })
      : formatCents(cents, locale as Locale, { trimWholeCents: true });

  const statTiles = [
    { label: t("dashReceived"), value: money(data.summary?.received_cents ?? 0), tone: "ink" },
    { label: t("dashDisbursed"), value: money(data.summary?.disbursed_cents ?? 0), tone: "ink" },
    {
      label: t("dashUnallocated"),
      value: money(data.summary?.unallocated_cents ?? 0),
      tone: "red",
    },
    { label: t("dashOps"), value: money(data.opsCents), tone: "sea" },
  ] as const;

  const queues = [
    {
      href: "/admin/donacije",
      label: t("queuePendingDonations"),
      count: data.pendingDonations,
    },
    { href: "/admin/donacije", label: t("queueFees"), count: data.feeQueue },
    { href: "/admin/poruke", label: t("queueMessages"), count: data.inboundWeek },
  ] as const;

  return (
    <div className="py-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("consoleBadge")}
      </p>
      <h1 className="type-display mt-2 text-3xl">{t("navOverview")}</h1>

      {/* headline figures — same numbers the public ledger shows */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-brand border-[1.5px] border-line-soft bg-mist/50 px-4 py-3.5"
          >
            <p className="text-[12px] font-semibold text-ink/60">{tile.label}</p>
            <p
              className={`mt-1 font-mono text-2xl tabular-nums ${
                tile.tone === "red"
                  ? "text-red-dark"
                  : tile.tone === "sea"
                    ? "text-sea"
                    : "text-ink"
              }`}
            >
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      {/* 30-day money-in */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-bold">{t("chartHeading")}</h2>
          <p className="font-mono text-[13px] tabular-nums text-ink/60">
            {t("chartTotal", { amount: money(data.chartTotal) })}
          </p>
        </div>
        <OverviewChart
          days={data.days}
          locale={locale as Locale}
          labels={{
            empty: t("chartEmpty"),
            peak: t("chartPeak"),
            table: t("chartTable"),
            dateCol: t("table.date"),
            amountCol: t("table.amount"),
          }}
        />
      </section>

      {/* work queues */}
      <section className="mt-8">
        <h2 className="text-[15px] font-bold">{t("queueHeading")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {queues.map((queue, index) => (
            <Link
              key={`${queue.href}-${index}`}
              href={queue.href}
              className="rounded-brand border-[1.5px] border-line px-4 py-3.5 transition-colors hover:border-sea"
            >
              <p
                className={`font-mono text-2xl tabular-nums ${
                  queue.count > 0 ? "text-red-dark" : "text-ink/40"
                }`}
              >
                {queue.count}
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-ink/70">{queue.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* platform state */}
      <section className="mt-8">
        <h2 className="text-[15px] font-bold">{t("stateHeading")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/prijave"
            className="rounded-brand border-[1.5px] border-line px-4 py-3.5 transition-colors hover:border-sea"
          >
            <p className="font-mono text-xl tabular-nums">
              {data.regConfirmed}
              <span className="text-ink/40"> / {data.regTotal}</span>
            </p>
            <p className="mt-1 text-[12.5px] font-semibold text-ink/70">
              {t("stateRegistrations")}
            </p>
          </Link>
          <Link
            href="/admin/prikupljaci"
            className="rounded-brand border-[1.5px] border-line px-4 py-3.5 transition-colors hover:border-sea"
          >
            <p className="font-mono text-xl tabular-nums">
              {data.pageCounts.active}
              <span className="text-ink/40">
                {" "}
                / {data.pageCounts.active + data.pageCounts.draft + data.pageCounts.hidden}
              </span>
            </p>
            <p className="mt-1 text-[12.5px] font-semibold text-ink/70">
              {t("statePages", {
                draft: data.pageCounts.draft,
                hidden: data.pageCounts.hidden,
              })}
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
