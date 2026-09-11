"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { setRsvp } from "@/app/[locale]/dashboard/(protected)/dogadjaji/actions";

type Status = "going" | "interested" | null;

/** Going / Interested toggles; tapping the active one clears it. */
export function RsvpButtons({ eventId, status }: { eventId: string; status: Status }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const choose = async (next: Exclude<Status, null>) => {
    setBusy(true);
    setError(false);
    const result = await setRsvp({ eventId, status: status === next ? null : next }).catch(() => ({ ok: false }));
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(true);
  };

  const cls = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors disabled:opacity-60 ${
      active ? "bg-sea text-paper" : "bg-paper text-black hover:bg-mist-2"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("rsvpLabel")}>
      <button type="button" disabled={busy} aria-pressed={status === "going"} onClick={() => choose("going")} className={cls(status === "going")}>
        {t("rsvpGoing")}
      </button>
      <button type="button" disabled={busy} aria-pressed={status === "interested"} onClick={() => choose("interested")} className={cls(status === "interested")}>
        {t("rsvpInterested")}
      </button>
      {error ? (
        <span role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </span>
      ) : null}
    </div>
  );
}
