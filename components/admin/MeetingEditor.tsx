"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

import { deleteMeeting, saveMeeting } from "@/app/[locale]/admin/(protected)/dokumenti/sastanci/actions";
import { SidePanel } from "@/components/console/SidePanel";
import { describeUploadError, downscaleToJpeg } from "@/lib/images";
import { MEETING_IMAGE_BUCKET, ORG_CHART_TOKEN, parseAttendees, type MeetingRow } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/client";

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

/**
 * A meeting in the slide-over: date, title, the sign-in list, the agenda
 * and the minutes as Markdown, each with a button that uploads a picture
 * (downsized to JPEG, into the meeting's folder of the private bucket) and
 * one that inserts the org chart line; both land where the cursor is.
 * Opens on the button it is given; a new meeting lands on its own page
 * once saved.
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
  // The bucket folder: the meeting's id, or one minted for a meeting not yet saved.
  const [folder] = useState(() => row?.id ?? `new-${crypto.randomUUID()}`);

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
          <MarkdownField label={t("agenda")} hint={t("agendaHint")} rows={10} maxLength={20_000} value={agenda} onChange={setAgenda} folder={folder} />
          <MarkdownField label={t("minutes")} hint={t("minutesHint")} rows={18} maxLength={60_000} value={minutes} onChange={setMinutes} folder={folder} />
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

/**
 * A Markdown textarea with its two insert buttons. A picture is downsized
 * in the browser, uploaded to <folder>/<time>.jpg and written in as a
 * Markdown image with the bucket path; the org chart is one line.
 */
function MarkdownField({ label, hint, rows, maxLength, value, onChange, folder }: { label: string; hint: string; rows: number; maxLength: number; value: string; onChange: (v: string) => void; folder: string }) {
  const t = useTranslations("admin.meetings");
  const tAdmin = useTranslations("admin");
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Put a block where the cursor is, on lines of its own.
  const insert = (block: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : value.length;
    const before = value.slice(0, at);
    const after = value.slice(at);
    const lead = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const trail = after.length === 0 ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    const next = `${before}${lead}${block}${trail}${after}`;
    onChange(next);
    const caret = before.length + lead.length + block.length + trail.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const blob = await downscaleToJpeg(file, 1600);
      const path = `${folder}/${Date.now()}.jpg`;
      const { error: uploadError } = await createClient().storage.from(MEETING_IMAGE_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || t("pictureAlt");
      insert(`![${alt}](${path})`);
    } catch (cause) {
      const why = describeUploadError(cause);
      setError(why.key === "uploadFailed" ? tAdmin(why.key, { detail: why.detail }) : tAdmin(why.key));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const buttonClass = "rounded-lg bg-mist px-3 py-1.5 text-[13.5px] font-semibold text-black/80 hover:bg-mist-2 disabled:opacity-50";
  return (
    <div>
      <label className={labelClass}>
        {label}
        <span className="block text-[13px] font-medium text-black/60">{hint}</span>
        <textarea ref={area} rows={rows} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} font-mono text-[13.5px]`} />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
        <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className={buttonClass}>
          {uploading ? t("uploading") : t("addPicture")}
        </button>
        <button type="button" disabled={uploading} onClick={() => insert(ORG_CHART_TOKEN)} className={buttonClass}>
          {t("insertOrgChart")}
        </button>
        <span className="text-[13px] text-black/60">{t("insertHint")}</span>
      </div>
      {error ? <p role="alert" className="mt-1 text-[13.5px] font-semibold text-red-dark">{error}</p> : null}
    </div>
  );
}
