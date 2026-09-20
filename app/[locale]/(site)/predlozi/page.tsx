import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/admin/SignInForm";
import { ShareButton } from "@/components/ShareButton";
import { ProposeForm, type PublicCriterion } from "@/components/proposals/ProposeForm";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "proposals" });
  return { title: `${t("title")} — Santamore`, description: t("sub") };
}

/**
 * "Propose a cause" as a page to send around: what happens to a proposal,
 * the questions it must pass, and the form. The same form opens as a pane
 * on the causes page; this is the link you share.
 */
export default async function ProposePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("proposals");
  const tDonate = await getTranslations("donate");

  let signedIn = false;
  let criteria: PublicCriterion[] = [];
  try {
    const supabase = await createClient();
    const [{ data: auth }, { data: criteriaRows }] = await Promise.all([supabase.auth.getUser(), supabase.from("v_public_cause_criteria").select("*")]);
    const lang = locale as Locale;
    signedIn = Boolean(auth.user);
    criteria = ((criteriaRows ?? []) as { id: string; disqualify_on: boolean; question_me: string; question_en: string; question_ru: string; reason_me: string; reason_en: string; reason_ru: string }[]).map((row) => ({
      id: row.id,
      disqualify_on: row.disqualify_on,
      question: row[`question_${lang}`],
      reason: row[`reason_${lang}`],
    }));
  } catch {
    criteria = [];
  }

  const steps = ["pageStep1", "pageStep2", "pageStep3"] as const;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">{t("eyebrow")}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="type-display text-4xl">{t("title")}</h1>
        <ShareButton title={t("title")} path={`/${locale}/predlozi`} label={t("sharePage")} copiedLabel={tDonate("copied")} variant="ghost" text={t("shareText")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-mist px-4 text-[14.5px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea" />
      </div>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-black/70">{t("sub")}</p>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {steps.map((key, index) => (
          <li key={key} className="rounded-lg bg-mist px-4 py-4">
            <span className="font-mono text-[12px] text-red">{String(index + 1).padStart(2, "0")}</span>
            <p className="mt-1.5 text-[15px] leading-relaxed">{t(key)}</p>
          </li>
        ))}
      </ol>

      {criteria.length > 0 ? (
        <section className="mt-8">
          <h2 className="type-eyebrow text-sea/80">{t("pageCriteriaHeading")}</h2>
          <p className="mt-1 text-[14.5px] leading-relaxed text-black/65">{t("pageCriteriaSub")}</p>
          <ul className="mt-3 overflow-hidden rounded-lg bg-mist">
            {criteria.map((criterion) => (
              <li key={criterion.id} className="border-t-[0.5px] border-line px-4 py-2.5 text-[14.5px] first:border-t-0">{criterion.question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="type-display text-2xl">{t("detailsHeading")}</h2>
        <div className="mt-4">
          {signedIn ? (
            <ProposeForm criteria={criteria} />
          ) : (
            <div className="rounded-lg bg-mist px-5 py-5">
              <h3 className="text-[16px] font-bold">{t("signInTitle")}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-black/65">{t("signInSub")}</p>
              <div className="mt-4">
                <SignInForm locale={locale} nextPath={`/${locale}/predlozi`} allowSignup />
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="mt-8 text-[14px] text-black/60">
        <Link href="/kampanje#prijedlozi" className="font-semibold text-sea underline underline-offset-2 hover:text-sea-2">{t("viewList")}</Link>
      </p>
    </div>
  );
}
