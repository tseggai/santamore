"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export interface PickerPage {
  slug: string;
  title: string;
  eventName: string;
}

/** Which of my pages does this tool act on? Drives the `?page=` param. */
export function PagePicker({ pages, current }: { pages: PickerPage[]; current: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const pathname = usePathname();
  if (pages.length <= 1) return null;
  return (
    <div className="mt-4">
      <label htmlFor="pagePicker" className="text-[12.5px] font-semibold">
        {t("pagePickerLabel")}
      </label>
      <select
        id="pagePicker"
        value={current}
        onChange={(event) => router.push(`${pathname}?page=${event.target.value}`)}
        className="mt-1 w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-sea"
      >
        {pages.map((page) => (
          <option key={page.slug} value={page.slug}>
            {page.title} · {page.eventName}
          </option>
        ))}
      </select>
    </div>
  );
}
