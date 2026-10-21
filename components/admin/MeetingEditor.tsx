"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { deleteMeeting, saveMeeting } from "@/app/[locale]/admin/(protected)/dokumenti/sastanci/actions";
import { SidePanel } from "@/components/console/SidePanel";
import { parseAttendees, type MeetingRow } from "@/lib/meetings";

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

/**
 * A meeting in the slide-over: date, title, the sign-in list, the agenda
 * and the minutes as Markdown. Opens on the button it is given; a new
 * meeting lands on its own page once saved.
 */
export function MeetingEditor({ row, label, tone = "sea" }: { row: MeetingRow | null; label: string; tone?: "sea" | "paper" }) {
  const t = useTranslations("admin.meetings");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [heldAt, setHeldAt] = useState(row?.held_at ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(row?.title ?? "");
  const [attendees, setAttendees] = useState((row?.attendees ?? []).join("\n"));
  const [agenda, setAgenda] = useState(row?.agenda_md ?? "");
  const [minutes, setMinutes] = useState(row?.minutes_md ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const result = await saveMeeting({ id: row?.id ?? null, heldAt, title, attendees: parseAttendees(attendees), agendaMd: agenda || null, minutesMd: minutes || null }).catch(() => ({ ok: false as const, error: "server" as const }));
    setBusy(false);
    if (!result.ok) {
      setNotice(t("failed"));
      return;
    }
    setOpen(false);
    if (row) router.refresh();
    else router.push(`/${locale}/admin/dokumenti/sastanci/${result.id}`);
  };

  const remove = async () => {
    if (!row || !window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    const result = await deleteMeeting(row.id).catch(() => ({ ok: false as const, error: "server" as const }));
    setBusy(false);
    if (!result.ok) {
      setNotice(t("failed"));
      return;
    }
    router.push(`/${locale}/admin/dokumenti/sastanci`);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={tone === "sea" ? "rounded-lg bg-sea px-3.5 py-2 text-[14px] font-bold text-paper hover:bg-sea-2" : "rounded-lg bg-mist px-3.5 py-2 text-[14px] font-semibold text-black/80 hover:bg-mist-2"}>
        {label}
      </button>
      <SidePanel open={open} title={row ? t("edit") : t("new")} onClose={() => setOpen(false)} wide>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <label className={labelClass}>
              {t("date")}
              <input type="date" required value={heldAt} onChange={(e) => setHeldAt(e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              {t("titleField")}
              <input type="text" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className={labelClass}>
            {t("attendees")}
            <span className="block text-[13px] font-medium text-black/60">{t("attendeesHint")}</span>
            <textarea rows={5} value={attendees} onChange={(e) => setAttendees(e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            {t("agenda")}
            <span className="block text-[13px] font-medium text-black/60">{t("agendaHint")}</span>
            <textarea rows={10} maxLength={20_000} value={agenda} onChange={(e) => setAgenda(e.target.value)} className={`${inputClass} font-mono text-[13.5px]`} />
          </label>
          <label className={labelClass}>
            {t("minutes")}
            <span className="block text-[13px] font-medium text-black/60">{t("minutesHint")}</span>
            <textarea rows={18} maxLength={60_000} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`${inputClass} font-mono text-[13.5px]`} />
          </label>
          {notice ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{notice}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="rounded-lg bg-red px-4 py-2 text-[14px] font-bold text-paper hover:bg-red-dark disabled:opacity-50">
              {busy ? t("saving") : t("save")}
            </button>
            {row ? (
              <button type="button" disabled={busy} onClick={() => void remove()} className="text-[14px] font-semibold text-red-dark hover:underline disabled:opacity-50">
                {t("delete")}
              </button>
            ) : null}
          </div>
        </form>
      </SidePanel>
    </>
  );
}
