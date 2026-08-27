import { use } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("eyebrow")}
      </p>
      <h1 className="type-display mt-3 max-w-3xl text-4xl leading-[1.08] sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink/70">
        {t("sub")}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/podrzi"
          className="rounded-xl bg-red px-6 py-3.5 text-[15.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          {t("ctaDonate")}
        </Link>
        <Link
          href="/transparentnost"
          className="rounded-xl border-[1.5px] border-line px-6 py-3.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
        >
          {t("ctaLedger")}
        </Link>
      </div>

      <p className="mt-16 rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[13px] text-sea">
        {t("buildNote")}
      </p>

      {/* Temporary render check: all three faces must show č ć š ž đ. */}
      <div className="mt-10 space-y-1 text-[13px] text-ink/50">
        <p className="type-display">{t("typeCheck")}</p>
        <p>{t("typeCheck")}</p>
        <p className="font-mono">{t("typeCheck")}</p>
      </div>
    </div>
  );
}
