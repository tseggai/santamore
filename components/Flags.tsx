import type { Locale } from "@/i18n/routing";

/**
 * Inline SVG flags for the language switcher. Drawn by hand so they render
 * identically everywhere (emoji flags are missing on Windows). Simplified
 * geometry — recognisable at 20px, not heraldically exact.
 */
export function Flag({ locale, className }: { locale: Locale; className?: string }) {
  const props = {
    viewBox: "0 0 60 40",
    className,
    "aria-hidden": true as const,
    focusable: "false" as const,
  };
  switch (locale) {
    case "me":
      // Montenegro: red field, gold border, gold eagle simplified to a mark.
      return (
        <svg {...props}>
          <rect width="60" height="40" fill="#c9a227" />
          <rect x="3" y="3" width="54" height="34" fill="#d4111e" />
          <circle cx="30" cy="17" r="6" fill="#c9a227" />
          <path d="M22 30 L30 19 L38 30 Z" fill="#c9a227" />
          <rect x="27.5" y="24" width="5" height="5" fill="#1d4f91" />
        </svg>
      );
    case "en":
      // Union Jack, simplified.
      return (
        <svg {...props}>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="8" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#c8102e" strokeWidth="3" />
          <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="13" />
          <path d="M30 0 V40 M0 20 H60" stroke="#c8102e" strokeWidth="7" />
        </svg>
      );
    case "ru":
      return (
        <svg {...props}>
          <rect width="60" height="40" fill="#fff" />
          <rect y="13.33" width="60" height="13.33" fill="#0039a6" />
          <rect y="26.66" width="60" height="13.34" fill="#d52b1e" />
        </svg>
      );
  }
}
