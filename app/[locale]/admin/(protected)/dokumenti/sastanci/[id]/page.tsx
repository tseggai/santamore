import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MeetingEditor } from "@/components/admin/MeetingEditor";
import { MeetingSheet } from "@/components/MeetingSheet";
import { PrintButton } from "@/components/PrintButton";
import { PageHeader } from "@/components/console/PageHeader";
import { MEETING_COLUMNS, meetingDate, type MeetingRow } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

async function fetchMeeting(id: string): Promise<MeetingRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("meetings").select(MEETING_COLUMNS).eq("id", id).maybeSingle();
  return (data as MeetingRow | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const row = await fetchMeeting(id);
  return row ? { title: `${row.title} — ${row.held_at} — Santamore` } : {};
}

/** One meeting: who was there, the agenda, the minutes; Edit opens the slide-over, Print / PDF prints the sheet alone. */
export default async function MeetingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.meetings");
  const row = await fetchMeeting(id);
  if (!row) notFound();
  return (
    <div className="py-8">
      <p className="text-[14px] print:hidden"><Link href="/admin/dokumenti/sastanci" className="font-semibold text-sea hover:underline">← {t("back")}</Link></p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="type-eyebrow text-black/60">{meetingDate(row.held_at, locale)}</p>
          <PageHeader title={row.title} />
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton label={t("print")} fileName={`santamore-zapisnik-${row.held_at}`} />
          <MeetingEditor row={row} label={t("edit")} tone="paper" />
        </div>
      </div>
      <MeetingSheet row={row} locale={locale} />
    </div>
  );
}
