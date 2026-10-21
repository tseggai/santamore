import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalPackApp, type SavedRows } from "@/components/admin/LegalPackApp";
import { PageHeader } from "@/components/console/PageHeader";
import packJson from "@/content/legal-pack/pack.json";
import { currentRole } from "@/lib/current-role";
import { canReadLegalDoc, type LegalDocAudience } from "@/lib/legal-docs";
import { sectionOfDoc, type LegalPack } from "@/lib/legal-pack";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const pack = packJson as unknown as LegalPack;

/**
 * The registration forms and every draft, completed together, in both
 * languages. The role decides which drafts are handed to the editor at all
 * (the leadership documents reach the Executive Director and the
 * administrators only); the pack's saved rows follow the same rule in the
 * database.
 */
export default async function PackEditorPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ doc?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tDocs, role, { doc }] = await Promise.all([getTranslations("admin.legalPack"), getTranslations("admin.documents"), currentRole(), searchParams]);
  const visible: LegalPack = { ...pack, drafts: pack.drafts.filter((d) => canReadLegalDoc(role, { audience: d.audience as LegalDocAudience })) };
  const section = sectionOfDoc(visible, typeof doc === "string" ? doc : "");
  const supabase = await createClient();
  const { data, error } = await supabase.from("legal_pack").select("key, value, updated_at");
  const saved: SavedRows = Object.fromEntries((data ?? []).map((row) => [row.key, { value: row.value, updatedAt: row.updated_at }]));
  return (
    <div className="py-8">
      <p className="text-[14px]"><Link href={`/admin/dokumenti?tab=${section}`} className="font-semibold text-sea hover:underline">← {tDocs("title")} · {tDocs(section === "registration" ? "sectionRegistration" : section === "organisation" ? "sectionOrganisation" : "sectionPublished")}</Link></p>
      <div className="mt-4">
        <PageHeader title={t("title")} />
      </div>
      {error ? (
        <p className="mt-4 rounded-brand bg-red/5 px-4 py-3 text-[14px] text-red-dark">{t("loadFailed")}</p>
      ) : null}
      <div className="mt-8">
        <LegalPackApp pack={visible} saved={saved} locale={locale as Locale} initialDoc={typeof doc === "string" ? doc : undefined} />
      </div>
    </div>
  );
}
