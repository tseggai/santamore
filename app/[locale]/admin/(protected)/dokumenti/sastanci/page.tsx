import { getTranslations, setRequestLocale } from "next-intl/server";

import { MeetingEditor } from "@/components/admin/MeetingEditor";
import { PageHeader } from "@/components/console/PageHeader";
import { MEETING_COLUMNS, meetingDate, type MeetingRow } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/** Every meeting, newest first, searchable by words in the title, the agenda or the minutes, and filterable by year. */
export default async function MeetingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; year?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tDocs, { q: rawQ, year: rawYear }] = await Promise.all([getTranslations("admin.meetings"), getTranslations("admin.documents"), searchParams]);
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) : "";
  const year = typeof rawYear === "string" && /^\d{4}$/.test(rawYear) ? rawYear : "";
  const supabase = await createClient();
  let query = supabase.from("meetings").select(MEETING_COLUMNS).order("held_at", { ascending: false });
  if (q) {
    // Words in the title, the agenda or the minutes; the pattern's own wildcards are escaped.
    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    query = query.or(`title.ilike.${JSON.stringify(pattern)},agenda_md.ilike.${JSON.stringify(pattern)},minutes_md.ilike.${JSON.stringify(pattern)}`);
  }
  if (year) query = query.gte("held_at", `${year}-01-01`).lte("held_at", `${year}-12-31`);
  const [{ data }, { data: allDates }] = await Promise.all([query, supabase.from("meetings").select("held_at")]);
  const rows = (data ?? []) as MeetingRow[];
  const years = Array.from(new Set((allDates ?? []).map((r) => String(r.held_at).slice(0, 4)))).sort().reverse();
  return (
    <div className="py-8">
      <p className="text-[14px]"><Link href="/admin/dokumenti?tab=organisation" className="font-semibold text-sea hover:underline">← {tDocs("title")} · {tDocs("sectionOrganisation")}</Link></p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t("title")} />
        <MeetingEditor row={null} label={t("new")} />
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-[13.5px] font-semibold">
          {t("search")}
          <input type="search" name="q" defaultValue={q} maxLength={100} placeholder={t("searchHint")} className="mt-1 block w-72 max-w-full rounded-lg bg-mist px-3.5 py-2 text-[15px] font-medium outline-none ring-sea/40 focus:ring-2" />
        </label>
        <label className="text-[13.5px] font-semibold">
          {t("year")}
          <select name="year" defaultValue={year} className="mt-1 block rounded-lg bg-mist px-3.5 py-2 text-[15px] font-medium outline-none ring-sea/40 focus:ring-2">
            <option value="">{t("allYears")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-mist px-3.5 py-2 text-[14px] font-semibold text-black/80 hover:bg-mist-2">{t("apply")}</button>
        {q || year ? <Link href="/admin/dokumenti/sastanci" className="text-[14px] font-semibold text-sea hover:underline">{t("clear")}</Link> : null}
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-[14.5px] text-black/60">{q || year ? t("noMatches") : t("empty")}</p>
      ) : (
        <ul className="mt-6 overflow-hidden rounded-lg bg-mist">
          {rows.map((row) => (
            <li key={row.id} className="border-t-[0.5px] border-line first:border-t-0">
              <Link href={`/admin/dokumenti/sastanci/${row.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
                <span className="font-mono text-[13px] font-bold text-black/55">{meetingDate(row.held_at, locale)}</span>
                <span className="font-semibold">{row.title}</span>
                <span className="text-black/55">{row.minutes_md ? t("minutesHeading") : t("noMinutes")}</span>
                <span className="ml-auto text-[14px] font-semibold text-sea">{tDocs("open")} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
