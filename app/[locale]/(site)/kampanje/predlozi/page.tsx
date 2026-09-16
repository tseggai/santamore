import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/admin/SignInForm";
import { ProposeForm, type PublicCriterion } from "@/components/proposals/ProposeForm";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface CriterionRow {
  id: string;
  disqualify_on: boolean;
  question_me: string;
  question_en: string;
  question_ru: string;
  reason_me: string;
  reason_en: string;
  reason_ru: string;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "proposals" });
  return { title: `${t("title")} — Santamore` };
}

/** Propose a cause: sign in, answer the screening, describe the need. */
export default async function ProposeCausePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("proposals");
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: rows },
  ] = await Promise.all([supabase.auth.getUser(), supabase.from("v_public_cause_criteria").select("*")]);
  const lang = locale as Locale;
  const criteria: PublicCriterion[] = ((rows ?? []) as CriterionRow[]).map((row) => ({
    id: row.id,
    disqualify_on: row.disqualify_on,
    question: row[`question_${lang}`],
    reason: row[`reason_${lang}`],
  }));

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="text-[13.5px]">
        <Link href="/kampanje" className="font-semibold text-sea underline underline-offset-2">← {t("eyebrow")}</Link>
      </p>
      <h1 className="type-display mt-3 text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-black/70">{t("sub")}</p>
      <div className="mt-8">
        {user ? (
          <ProposeForm criteria={criteria} />
        ) : (
          <div className="max-w-md rounded-lg bg-mist px-5 py-6">
            <h2 className="type-display text-2xl">{t("signInTitle")}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-black/65">{t("signInSub")}</p>
            <div className="mt-5">
              <SignInForm locale={lang} nextPath={`/${locale}/kampanje/predlozi`} allowSignup />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
