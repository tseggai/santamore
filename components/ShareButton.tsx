"use client";

import { useState } from "react";

/**
 * Web Share where available, clipboard fallback elsewhere. `copiedLabel`
 * doubles as the post-copy confirmation. The "icon" variant is a compact
 * square button for header action rows; the label becomes its
 * accessible name and a short-lived badge after copying.
 */
export function ShareButton({
  title,
  path,
  label,
  copiedLabel,
  variant = "primary",
  text,
  className,
}: {
  title: string;
  /** Site-absolute path to share, e.g. "/me/f/ana". */
  path: string;
  label: string;
  copiedLabel: string;
  variant?: "primary" | "ghost" | "icon";
  /** Pre-written message for the share sheet (WhatsApp, Viber…); the copy fallback still copies the bare URL. */
  text?: string;
  /** Icon variant only: replaces the default surface classes. */
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share(text ? { title, text, url } : { title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };

  if (variant === "icon") {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={share}
          aria-label={label}
          title={label}
          className={className ?? "inline-flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-ink transition-colors hover:bg-mist-2 hover:text-sea"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path
              d="M12 3v12m0-12L8 7m4-4 4 4M5 13v6h14v-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? copiedLabel : ""}
        </span>
        {copied ? (
          <span
            aria-hidden
            className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12px] font-semibold text-paper"
          >
            {copiedLabel}
          </span>
        ) : null}
      </span>
    );
  }

  const buttonClass =
    variant === "primary"
      ? "block w-full rounded-xl bg-red px-6 py-3.5 text-center text-[16px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
      : "block w-full rounded-xl border-[1.5px] border-line px-6 py-3 text-center text-[15px] font-semibold transition-colors hover:border-sea hover:text-sea";

  return (
    <button type="button" onClick={share} aria-live="polite" className={buttonClass}>
      {copied ? copiedLabel : label}
    </button>
  );
}
