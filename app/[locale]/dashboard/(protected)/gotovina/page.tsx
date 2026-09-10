import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CashForm } from "@/components/dashboard/CashForm";
import { formatCents } from "@/lib/money";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface CashRow {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

export default async function CashPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: mine } = await supabase
    .from("fundraisers")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mine) redirect(`/${locale}/dashboard`);

  // Donations carry donor PII and stay staff-only under RLS; the runner's
  // own cash log is read server-side with the service role, restricted to
  // their page, the cash rail, and these money-only columns.
  let rows: CashRow[] = [];
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("donations")
      .select("id, amount_cents, status, created_at")
      .eq("fundraiser_id", mine.id)
      .eq("rail", "cash")
      .order("created_at", { ascending: false })
      .limit(30);
    rows = (data ?? []) as CashRow[];
  } catch {
    rows = [];
  }

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("logCash")}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink/65">{t("cashSub")}</p>
      <div className="mt-5">
        <CashForm />
      </div>

      {rows.length > 0 ? (
        <ul className="mt-6">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2.5 text-[13.5px] last:border-b-0"
            >
              <span className="font-mono tabular-nums text-ink/60">
                {row.created_at.slice(0, 10)}
              </span>
              <span
                className={`flex-1 ${row.status === "approved" ? "text-sea" : "text-ink/50"}`}
              >
                {row.status === "approved" ? t("cashConfirmed") : t("cashAwaiting")}
              </span>
              <span className="font-mono font-medium tabular-nums">
                {formatCents(row.amount_cents, locale as Locale, { trimWholeCents: true })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
