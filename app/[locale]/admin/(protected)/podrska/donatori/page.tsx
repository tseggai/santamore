import { getTranslations, setRequestLocale } from "next-intl/server";

import { DonorsManager, type DonorGift, type DonorRow } from "@/components/admin/DonorsManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Donors: everyone a money-in row belongs to, from the ledger (v_donors, migration 0067), with their gifts. */
export default async function DonorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: donors }, { data: gifts }] = await Promise.all([
    supabase.from("v_donors").select("*").order("given_cents", { ascending: false }).limit(5000),
    supabase.from("v_donor_gifts").select("*").order("entry_date", { ascending: false }).limit(20_000),
  ]);
  return (
    <div className="pb-8">
      <p className="max-w-2xl text-[14px] leading-relaxed text-black/60">{t("donorsHint")}</p>
      <div className="mt-4">
        <DonorsManager donors={(donors ?? []) as DonorRow[]} gifts={(gifts ?? []) as DonorGift[]} />
      </div>
    </div>
  );
}
