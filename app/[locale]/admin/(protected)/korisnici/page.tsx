import { getTranslations, setRequestLocale } from "next-intl/server";

import { BeneficiariesManager, type BeneficiaryRow } from "@/components/admin/BeneficiariesManager";
import { isAdmin } from "@/lib/server/access";
import { SectionHeader } from "@/components/console/SectionHeader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Who the money reached: their stories, photos and the cause that reached them. */
export default async function BeneficiariesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: rows }, { data: causes }] = await Promise.all([
    supabase.from("beneficiaries").select("*").order("sort_order").order("name").limit(500),
    supabase.from("campaigns").select("id, title").order("starts_at", { ascending: false }).limit(300),
  ]);
  return (
    <div className="pb-8">
      <SectionHeader title={t("bnHeading")} />
      <div className="mt-6">
        <BeneficiariesManager rows={(rows ?? []) as BeneficiaryRow[]} causes={((causes ?? []) as { id: string; title: string }[]).map((c) => ({ id: c.id, title: c.title }))} canManage={await isAdmin()} />
      </div>
    </div>
  );
}
