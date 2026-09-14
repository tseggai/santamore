import { htmlLang, type Locale } from "@/i18n/routing";

/** "Jan 5, 2026" in the console's language. */
export function formatShortDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(htmlLang(locale), { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/** "Jan 20, 2026, 02:00 PM" in the console's language. */
export function formatShortDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(htmlLang(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
