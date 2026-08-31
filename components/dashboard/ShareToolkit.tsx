"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * The share toolkit (brief §10): pre-written message with the page link,
 * one tap to Viber (heavily used locally, always forgotten), WhatsApp and
 * Facebook, plus the dynamic share image for Instagram Stories.
 */
export function ShareToolkit({
  title,
  pagePath,
  imagePath,
  siteOrigin,
}: {
  title: string;
  /** Locale-prefixed public page path, e.g. "/me/f/ana". */
  pagePath: string;
  /** The opengraph-image path for the page. */
  imagePath: string;
  /** Server-derived origin so links are absolute from the first paint. */
  siteOrigin: string;
}) {
  const t = useTranslations("dashboard");
  const [copied, setCopied] = useState<"" | "text" | "link">("");
  // Browser fallback when NEXT_PUBLIC_SITE_URL is unset; effect-only so
  // server and first client render agree.
  const [fallbackOrigin, setFallbackOrigin] = useState("");
  useEffect(() => {
    if (!siteOrigin) setFallbackOrigin(window.location.origin);
  }, [siteOrigin]);

  const url = `${siteOrigin || fallbackOrigin}${pagePath}`;
  const message = t("shareMessage", { title, url });

  const copy = async (value: string, kind: "text" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      // Values stay visible below for manual copying.
    }
  };

  const linkClass =
    "block rounded-[11px] border-[1.5px] border-line px-4 py-3 text-center text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea";

  return (
    <div>
      <p className="whitespace-pre-line rounded-brand border-[1.5px] border-line bg-sand px-4 py-3 text-[13.5px] leading-relaxed">
        {message}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <a
          href={`viber://forward?text=${encodeURIComponent(message)}`}
          className={linkClass}
        >
          Viber
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Facebook
        </a>
        <button type="button" onClick={() => copy(message, "text")} className={linkClass}>
          {copied === "text" ? t("saved") : t("copyMessage")}
        </button>
        <button type="button" onClick={() => copy(url, "link")} className={linkClass}>
          {copied === "link" ? t("saved") : t("copyLink")}
        </button>
        <a
          href={imagePath}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {t("shareImage")}
        </a>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink/60">{t("igNote")}</p>
    </div>
  );
}
