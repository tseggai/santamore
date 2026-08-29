"use client";

import { useEffect, useRef, useState } from "react";

export function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (old browser, no permission): the values are
      // always shown as selectable text right next to the button.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
