"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/donate/CopyButton";
import { EpcQrCode } from "@/components/donate/EpcQrCode";
import { buildEpcQrPayload, formatIbanForDisplay } from "@/lib/epc-qr";
import { formatCents, type Cents } from "@/lib/money";
import { hasBankDetails, type OrgBankDetails } from "@/lib/org";
import type { Locale } from "@/i18n/routing";

/**
 * The bank-transfer rail (brief §8, prototype's #sepaBox): beneficiary,
 * IBAN, amount, reference, live EPC QR, copy buttons, and the
 * what-happens-next line. Values always stay copyable text so a manual
 * transfer works when an app can't scan the QR.
 */
export function SepaPanel({
  locale,
  bank,
  reference,
  amountCents,
  monthly,
}: {
  locale: Locale;
  bank: OrgBankDetails;
  reference: string;
  amountCents: Cents;
  monthly: boolean;
}) {
  const t = useTranslations("donate");
  const bankReady = hasBankDetails(bank);

  const qrPayload = useMemo(() => {
    if (!bankReady) return null;
    try {
      return buildEpcQrPayload({
        beneficiaryName: bank.name,
        iban: bank.iban,
        bic: bank.bic || undefined,
        amountCents,
        reference,
      });
    } catch {
      // Bad env values or out-of-range amount: no broken QR, text fallback.
      return null;
    }
  }, [bankReady, bank.name, bank.iban, bank.bic, amountCents, reference]);

  const labelClass = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-sea";
  const valueClass = "font-mono text-[15px] font-medium tabular-nums break-all";

  return (
    <div className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-4">
      {bankReady ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className={labelClass}>{t("sepaBeneficiary")}</div>
              <div className="text-[14.5px] font-semibold">{bank.name}</div>
            </div>
            <div className="text-right">
              <div className={labelClass}>{t("sepaAmount")}</div>
              <div className={valueClass}>
                {formatCents(amountCents, locale)}
                {monthly ? t("perMonth") : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className={labelClass}>{t("sepaIban")}</div>
              <div className={valueClass}>{formatIbanForDisplay(bank.iban)}</div>
            </div>
            <CopyButton
              value={formatIbanForDisplay(bank.iban)}
              label={t("copyIban")}
              copiedLabel={t("copied")}
            />
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            {qrPayload ? (
              <figure className="shrink-0">
                <EpcQrCode payload={qrPayload} alt={t("qrCaption")} />
                <figcaption className="mt-1.5 max-w-[148px] text-[11px] leading-snug text-ink/60">
                  {t("qrCaption")}
                </figcaption>
              </figure>
            ) : null}
            <div className="min-w-0">
              <div className={labelClass}>{t("sepaReference")}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className={valueClass}>{reference}</span>
                <CopyButton
                  value={reference}
                  label={t("copyReference")}
                  copiedLabel={t("copied")}
                />
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">{t("sepaNote")}</p>
              {monthly ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">
                  {t("standingOrderNote")}
                </p>
              ) : null}
            </div>
          </div>

          <p className="mt-3 border-t border-line-soft pt-3 text-[12.5px] leading-relaxed text-ink/70">
            {t("whatNext")} {t("qrManualNote")}
          </p>
        </>
      ) : (
        <p className="text-[13.5px] leading-relaxed text-sea">{t("bankDetailsPending")}</p>
      )}
    </div>
  );
}
