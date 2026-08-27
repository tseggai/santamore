"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <nav aria-label={t("languageSwitcher")} className="flex gap-1">
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            aria-current={active ? "true" : undefined}
            className={`rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              active
                ? "border-red bg-red text-paper"
                : "border-line text-ink/70 hover:border-sea hover:text-sea"
            }`}
          >
            {l}
          </Link>
        );
      })}
    </nav>
  );
}
