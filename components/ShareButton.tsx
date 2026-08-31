"use client";

import { useState } from "react";

/**
 * Web Share where available, clipboard fallback elsewhere. `copiedLabel`
 * doubles as the post-copy confirmation.
 */
export function ShareButton({
  title,
  path,
  label,
  copiedLabel,
  variant = "primary",
}: {
  title: string;
  /** Site-absolute path to share, e.g. "/me/f/ana". */
  path: string;
  label: string;
  copiedLabel: string;
  variant?: "primary" | "ghost";
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };

  const className =
    variant === "primary"
      ? "block w-full rounded-xl bg-red px-6 py-3.5 text-center text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
      : "block w-full rounded-xl border-[1.5px] border-line px-6 py-3 text-center text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea";

  return (
    <button type="button" onClick={share} aria-live="polite" className={className}>
      {copied ? copiedLabel : label}
    </button>
  );
}
