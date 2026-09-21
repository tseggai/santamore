import { getTranslations, setRequestLocale } from "next-intl/server";

import { DonorsManager, type DonorGift, type DonorRow } from "@/components/admin/DonorsManager";
import { YearSelect } from "@/components/console/YearSelect";
import { parseYear } from "@/lib/years";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Donors: everyone a gift belongs to, from the ledger (v_donors / v_donor_years,
 * migration 0068), all years or one, with their gifts. Sponsorships are the
 * Sponsors tab's; an individual supporter's cash counts here.
 */
export default async function DonorsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ godina?: string }> }) {
  const [{ locale }, { godina }] = await Promise.all([params, searchParams]);
  const year = parseYear(godina);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: donors }, { data: gifts }, { data: yearRows }] = await Promise.all([
    year === null
      ? supabase.from("v_donors").select("*").order("given_cents", { ascending: false }).limit(5000)
      : supabase.from("v_donor_years").select("*").eq("year", year).order("given_cents", { ascending: false }).limit(5000),
    supabase.from("v_donor_gifts").select("*").order("entry_date", { ascending: false }).limit(20_000),
    supabase.from("v_donor_years").select("year").limit(20_000),
  ]);
  const years = [...new Set(((yearRows ?? []) as { year: number }[]).map((r) => r.year))];
  const giftRows = ((gifts ?? []) as DonorGift[]).filter((g) => year === null || g.year === year);
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("donorsHint")}</p>
      <div className="mt-4"><YearSelect years={years} value={year} /></div>
      <div className="mt-4">
        <DonorsManager donors={(donors ?? []) as DonorRow[]} gifts={giftRows} />
      </div>
    </div>
  );
}
