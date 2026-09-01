import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { formatIbanForDisplay } from "@/lib/epc-qr";
import { getOrgBankDetails } from "@/lib/org";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "footer.site" });
  return { title: `${t("contact")} — Santamore` };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tFooter] = await Promise.all([
    getTranslations("kontakt"),
    getTranslations("footer"),
  ]);
  const bank = getOrgBankDetails();

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("sub")}</p>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
            {t("formHeading")}
          </p>
          <div className="mt-3">
            <InboundForm kind="contact" />
          </div>
        </div>
        <div className="space-y-6 text-[14px] leading-relaxed">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
              {tFooter("orgHeading")}
            </p>
            <p className="mt-2">{tFooter("orgName")}</p>
            <p>{tFooter("orgAddress")}</p>
            <p className="text-ink/70">{tFooter("orgId")}</p>
            <p className="mt-1">{tFooter("email")}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
              {t("bankHeading")}
            </p>
            {bank.iban ? (
              <>
                <p className="mt-2">{bank.name}</p>
                <p className="font-mono tabular-nums">{formatIbanForDisplay(bank.iban)}</p>
                {bank.bic ? <p className="font-mono">{bank.bic}</p> : null}
              </>
            ) : (
              <p className="mt-2 text-ink/70">{tFooter("iban")}</p>
            )}
          </div>
          <p className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[12.5px] text-sea">
            {t("mapNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
