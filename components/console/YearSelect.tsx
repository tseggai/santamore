"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * The year in view for a console list: all years, or one. It lives in the
 * URL (`?godina=`) so the page filters on the server and the choice
 * survives a refresh or a shared link.
 */
export function YearSelect({ years, value, param = "godina" }: { years: number[]; value: number | null; param?: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const options = [...new Set([...years, ...(value ? [value] : [])])].sort((a, b) => b - a);

  const choose = (next: string) => {
    const query = new URLSearchParams(params.toString());
    if (next === "all") query.delete(param);
    else query.set(param, next);
    const search = query.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  };

  return (
    <label className="inline-flex items-center gap-2 text-[14px]">
      <span className="text-black/60">{t("yearFilterLabel")}</span>
      <select value={value ? String(value) : "all"} onChange={(e) => choose(e.target.value)} className="rounded-lg bg-mist px-3 py-2 text-[14px] font-semibold outline-none ring-sea/40 focus:ring-2">
        <option value="all">{t("yearFilterAll")}</option>
        {options.map((y) => <option key={y} value={String(y)}>{y}</option>)}
      </select>
    </label>
  );
}

/** `?godina=2025` → 2025; anything else → null (all years). */
export function parseYear(value: string | undefined): number | null {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}
