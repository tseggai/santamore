import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/**
 * A list narrowed by a link from elsewhere (an event's pages, an event's
 * teams): says what it shows and offers the whole list back.
 */
export function FocusChip({ label, clearHref }: { label: string; clearHref: string }) {
  const t = useTranslations("admin");
  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-sea px-3 text-[13.5px] font-semibold text-paper">
      {label}
      <Link href={clearHref} className="rounded px-1 underline underline-offset-2 hover:opacity-80">
        {t("focusClear")}
      </Link>
    </span>
  );
}
