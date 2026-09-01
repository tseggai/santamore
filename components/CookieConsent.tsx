"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

const STORAGE_KEY = "sm-consent";

function loadPlausible(domain: string) {
  if (document.querySelector("script[data-domain]")) return;
  const script = document.createElement("script");
  script.src = "https://plausible.io/js/script.js";
  script.dataset.domain = domain;
  script.defer = true;
  document.head.appendChild(script);
}

/**
 * Consent banner that actually gates analytics (brief §6): Plausible loads
 * only after an explicit accept, and only when a domain is configured.
 * Reject is one tap and visually equal. No domain → nothing to consent to,
 * so no banner.
 */
export function CookieConsent({ domain }: { domain: string | null }) {
  const t = useTranslations("consent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!domain) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable (private mode): keep analytics off, show nothing
      return;
    }
    if (stored === "accepted") loadPlausible(domain);
    else if (stored !== "rejected") setVisible(true);
  }, [domain]);

  if (!domain || !visible) return null;

  const decide = (choice: "accepted" | "rejected") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // not persistable; treat as session-only choice
    }
    if (choice === "accepted") loadPlausible(domain);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-ink bg-paper px-5 py-4"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13px] leading-relaxed text-ink/80">
          {t("text")}{" "}
          <Link
            href="/kolacici"
            className="font-semibold text-sea underline decoration-line underline-offset-2"
          >
            {t("policy")}
          </Link>
        </p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => decide("rejected")}
            className="rounded-xl border-[1.5px] border-ink px-5 py-2.5 text-[13.5px] font-bold hover:bg-mist"
          >
            {t("reject")}
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="rounded-xl border-[1.5px] border-ink bg-ink px-5 py-2.5 text-[13.5px] font-bold text-paper hover:opacity-90"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
