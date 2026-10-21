import { getTranslations, setRequestLocale } from "next-intl/server";

import { MeetingEditor } from "@/components/admin/MeetingEditor";
import { PageHeader } from "@/components/console/PageHeader";
import { MEETING_COLUMNS, meetingDate, type MeetingRow } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/** Every meeting, newest first: the agenda and the minutes live together on each one. */
export default async function MeetingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tDocs] = await Promise.all([getTranslations("admin.meetings"), getTranslations("admin.documents")]);
  const supabase = await createClient();
  const { data } = await supabase.from("meetings").select(MEETING_COLUMNS).order("held_at", { ascending: false });
  const rows = (data ?? []) as MeetingRow[];
  return (
    <div className="py-8">
      <p className="text-[14px]"><Link href="/admin/dokumenti?tab=organisation" className="font-semibold text-sea hover:underline">← {tDocs("title")} · {tDocs("sectionOrganisation")}</Link></p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t("title")} />
        <MeetingEditor row={null} label={t("new")} />
      </div>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/60">{t("hint")}</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-[14.5px] text-black/60">{t("empty")}</p>
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
