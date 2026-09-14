"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { setRsvp } from "@/app/[locale]/dashboard/(protected)/dogadjaji/actions";

type Status = "going" | "interested" | null;

/** "Are you coming?" as one select: not decided, going, interested. */
export function RsvpSelect({ eventId, status }: { eventId: string; status: Status }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const choose = async (value: string) => {
    setBusy(true);
    setError(false);
    const next = value === "going" || value === "interested" ? value : null;
    const result = await setRsvp({ eventId, status: next }).catch(() => ({ ok: false }));
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(true);
  };

  return (
    <label className="inline-flex items-center gap-2 text-[14px]">
      <span className="font-semibold text-black/70">{t("rsvpLabel")}</span>
      <select
        value={status ?? ""}
        disabled={busy}
        onChange={(e) => choose(e.target.value)}
        className={`rounded-lg px-3 py-2 text-[14px] font-semibold outline-none disabled:opacity-60 ${status === "going" ? "bg-sea text-paper" : "bg-paper focus:bg-mist-2"}`}
      >
        <option value="">{t("rsvpUndecided")}</option>
        <option value="going">{t("rsvpGoing")}</option>
        <option value="interested">{t("rsvpInterested")}</option>
      </select>
      {error ? <span role="alert" className="text-[13px] font-semibold text-red-dark">{t("actionError")}</span> : null}
    </label>
  );
}
