"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";

/**
 * "How will this look?" — renders a public page component with the
 * form's current (unsaved) values, at phone or desktop width. The
 * content is the real page markup, so there is nothing to keep in sync.
 */
export function PreviewFrame({
  children,
  liveHref,
}: {
  children: ReactNode;
  /** The published page, when there is one to open in a new tab. */
  liveHref?: string | null;
}) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<"phone" | "desktop">("phone");

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border-[1.5px] border-line bg-paper px-3 py-1.5 text-[13.5px] font-semibold hover:border-sea hover:text-sea"
        >
          {open ? t("previewHide") : t("previewShow")}
        </button>
        {open ? (
          <div role="group" aria-label={t("previewWidth")} className="flex overflow-hidden rounded-lg border-[1.5px] border-line">
            {(["phone", "desktop"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={width === option}
                onClick={() => setWidth(option)}
                className="px-3 py-1.5 text-[13px] font-semibold aria-pressed:bg-ink aria-pressed:text-paper"
              >
                {t(`preview.${option}`)}
              </button>
            ))}
          </div>
        ) : null}
        {liveHref ? (
          <Link
            href={liveHref}
            target="_blank"
            className="text-[13.5px] font-semibold text-sea underline underline-offset-2"
          >
            {t("previewOpenLive")} ↗
          </Link>
        ) : null}
      </div>
      {open ? (
        <div className="mt-3">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">
            {t("previewNote")}
          </p>
          <div
            className="mx-auto max-h-[720px] overflow-y-auto rounded-lg border-[1.5px] border-ink bg-paper shadow-[0_12px_32px_rgba(54,67,75,0.16)]"
            style={{ width: width === "phone" ? "min(100%, 400px)" : "100%" }}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
