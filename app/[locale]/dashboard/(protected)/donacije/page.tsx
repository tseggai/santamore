import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GivingList, type MyDonation } from "@/components/dashboard/GivingList";
import { DonateButton } from "@/components/donate/DonateButton";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface SubscriptionRow {
  id: string;
  amount_cents: number;
  status: "active" | "paused" | "past_due" | "canceled";
  next_charge_on: string | null;
}

/**
 * The donor hat: every donation made with the signed-in email, totals,
 * open bank-transfer pledges with their reference, receipts on demand,
 * and the monthly plan once the card rail exists.
 */
export default async function GivingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("giving");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: rows }, { data: subs }] = await Promise.all([
    supabase.from("v_my_donations").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("v_my_subscriptions").select("id, amount_cents, status, next_charge_on"),
  ]);
  const donations = (rows ?? []) as MyDonation[];
  const subscriptions = (subs ?? []) as SubscriptionRow[];

  const approved = donations.filter((d) => d.status === "approved");
  const given = approved.reduce((sum, d) => sum + d.amount_cents, 0);
  const fees = approved.reduce((sum, d) => sum + d.fee_covered_cents, 0);
  const pending = donations.filter((d) => d.status === "pending");
  const supported = new Set(
    approved.map((d) => d.fundraiser_slug ?? d.campaign_slug ?? "santamore"),
  ).size;
  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });

  const tiles = [
    { label: t("statGiven"), value: money(given), tone: "ink" },
    { label: t("statDonations"), value: String(approved.length), tone: "ink" },
    { label: t("statSupported"), value: String(supported), tone: "sea" },
    { label: t("statPending"), value: String(pending.length), tone: pending.length ? "red" : "ink" },
  ] as const;

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("title")}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-black/65">
        {t("sub", { email: user.email ?? "" })}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-brand bg-mist px-4 py-3.5">
            <p className="text-[13px] font-semibold text-black/60">{tile.label}</p>
            <p
              className={`mt-1 font-mono text-2xl tabular-nums ${
                tile.tone === "red" ? "text-red-dark" : tile.tone === "sea" ? "text-sea" : "text-black"
              }`}
            >
              {tile.value}
            </p>
          </div>
        ))}
      </div>
      {fees > 0 ? (
        <p className="mt-2 text-[13.5px] text-black/60">{t("feesNote", { amount: money(fees) })}</p>
      ) : null}

      {subscriptions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[16px] font-bold">{t("monthlyHeading")}</h2>
          <ul className="mt-3 space-y-2">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-mist px-4 py-3 text-[14.5px]">
                <span className="font-mono text-[15px] font-medium tabular-nums">{money(sub.amount_cents)} / {t("month")}</span>
                <span className={sub.status === "active" ? "text-sea" : "text-black/55"}>
                  {t(`subscriptionStatus.${sub.status}`)}
                  {sub.next_charge_on ? ` · ${t("nextCharge", { date: sub.next_charge_on })}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13.5px] text-black/55">{t("monthlyManageNote")}</p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[16px] font-bold">{t("historyHeading")}</h2>
        {donations.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-black/60">
            {t("empty")}{" "}
            <DonateButton
              request={{ kind: "campaign" }}
              href="/podrzi"
              className="font-semibold text-sea underline underline-offset-2"
            >
              {t("giveCta")}
            </DonateButton>
          </p>
        ) : (
          <GivingList donations={donations} />
        )}
      </section>

      <p className="mt-8 text-[13.5px] leading-relaxed text-black/55">{t("privacyNote")}</p>
    </div>
  );
}
