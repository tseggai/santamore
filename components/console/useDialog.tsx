"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DialogRequest {
  kind: "alert" | "confirm";
  message: string;
  /** Small mono line under the message, e.g. the database's own words. */
  detail?: string | null;
  /** The confirming button's label; defaults to Delete for danger, OK otherwise. */
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

/**
 * The console's own alert and confirm, in place of the browser's. Both
 * return a promise: `await dialog.confirm("…")` reads like the native
 * call but renders a mist box on a native <dialog>, so focus, Escape and
 * the inert page come for free. Render `dialog.element` once per screen.
 */
export function useDialog() {
  const t = useTranslations("admin");
  const [request, setRequest] = useState<DialogRequest | null>(null);
  // The open request also lives in a ref, so settling never runs a side
  // effect inside a state updater.
  const pending = useRef<DialogRequest | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The box renders through a portal on <body>: a console screen usually
  // sits inside a slide-over <dialog>, and a dialog nested in a dialog
  // confused iOS Safari into closing the slide-over instead.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  const settle = useCallback((ok: boolean) => {
    const current = pending.current;
    pending.current = null;
    setRequest(null);
    current?.resolve(ok);
  }, []);
  const ask = useCallback((next: DialogRequest) => {
    pending.current?.resolve(false);
    pending.current = next;
    setRequest(next);
  }, []);

  const confirm = useCallback(
    (message: string, options: { confirmLabel?: string; danger?: boolean } = {}) =>
      new Promise<boolean>((resolve) => ask({ kind: "confirm", message, danger: options.danger ?? true, confirmLabel: options.confirmLabel, resolve })),
    [ask],
  );
  const alert = useCallback(
    (message: string, detail?: string | null) => new Promise<void>((resolve) => ask({ kind: "alert", message, detail, resolve: () => resolve() })),
    [ask],
  );

  const box: ReactNode = (
    <dialog
      ref={dialogRef}
      aria-label={request?.message ?? ""}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        settle(false);
      }}
      onClose={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target === event.currentTarget) settle(false);
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-lg border-0 bg-paper p-0 shadow-[0_24px_64px_rgba(14,58,70,0.22)] backdrop:bg-ink/55 motion-safe:open:animate-[dialog-in_160ms_ease-out]"
    >
      {request ? (
        <div className="px-6 py-5">
          <p className="text-[15.5px] font-semibold leading-relaxed">{request.message}</p>
          {request.detail ? <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-black/60">{request.detail}</p> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {request.kind === "confirm" ? (
              <button type="button" onClick={() => settle(false)} className="rounded-lg bg-mist px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
                {t("cancel")}
              </button>
            ) : null}
            <button
              type="button"
              autoFocus
              onClick={() => settle(true)}
              className={`rounded-lg px-5 py-2.5 text-[14.5px] font-bold text-paper outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 ${request.kind === "confirm" && request.danger ? "bg-red" : "bg-ink"}`}
            >
              {request.kind === "alert" ? t("dialogOk") : (request.confirmLabel ?? t("dialogDelete"))}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
  const element: ReactNode = mounted ? createPortal(box, document.body) : null;

  return { confirm, alert, element };
}
