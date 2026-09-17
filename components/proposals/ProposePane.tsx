"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SignInForm } from "@/components/admin/SignInForm";
import { SidePanel } from "@/components/console/SidePanel";
import { ProposeForm, type PublicCriterion } from "@/components/proposals/ProposeForm";
import type { Locale } from "@/i18n/routing";

/**
 * "Propose a cause" as a right-hand pane over the causes page: the button,
 * and the pane holding the sign-in (when needed) or the proposal form.
 * `?predlozi=1` opens it on load — that is where the sign-in link returns.
 */
export function ProposePane({ signedIn, criteria, className }: { signedIn: boolean; criteria: PublicCriterion[]; className?: string }) {
  const t = useTranslations("proposals");
  const locale = useLocale() as Locale;
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("predlozi") === "1") setOpen(true);
  }, [params]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-red px-5 text-[15px] font-bold text-paper transition-colors hover:bg-red-dark"}
      >
        <span aria-hidden className="text-[18px] leading-none">+</span>
        {t("proposeCta")}
      </button>
      <SidePanel open={open} title={t("title")} onClose={() => setOpen(false)}>
        <p className="text-[14.5px] leading-relaxed text-black/65">{t("sub")}</p>
        <div className="mt-5">
          {signedIn ? (
            <ProposeForm criteria={criteria} />
          ) : (
            <div className="rounded-lg bg-paper px-5 py-5">
              <h3 className="text-[16px] font-bold">{t("signInTitle")}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-black/65">{t("signInSub")}</p>
              <div className="mt-4">
                <SignInForm locale={locale} nextPath={`/${locale}/kampanje?predlozi=1`} allowSignup />
              </div>
            </div>
          )}
        </div>
      </SidePanel>
    </>
  );
}
