import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalPackApp, type SavedRows } from "@/components/admin/LegalPackApp";
import { PageHeader } from "@/components/console/PageHeader";
import packJson from "@/content/legal-pack/pack.json";
import type { LegalPack } from "@/lib/legal-pack";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const pack = packJson as unknown as LegalPack;

/** The registration forms and policy drafts, completed together, in both languages. */
export default async function RegistrationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.legalPack");
  const supabase = await createClient();
  const { data, error } = await supabase.from("legal_pack").select("key, value, updated_at");
  const saved: SavedRows = Object.fromEntries((data ?? []).map((row) => [row.key, { value: row.value, updatedAt: row.updated_at }]));
  return (
    <div className="py-8">
      <PageHeader title={t("title")} />
      {error ? (
        <p className="mt-4 rounded-brand bg-red/5 px-4 py-3 text-[14px] text-red-dark">{t("loadFailed")}</p>
      ) : null}
      <div className="mt-8">
        <LegalPackApp pack={pack} saved={saved} locale={locale as Locale} />
      </div>
    </div>
  );
}
