"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

import { useDialog } from "@/components/console/useDialog";

/**
 * Right-hand slide-over for console forms. The list behind it stays put:
 * a native <dialog> gives the focus trap, Escape and the inert page; we
 * add the scroll lock, the backdrop close and the slide-in (which
 * `prefers-reduced-motion` turns off). Children mount only while open,
 * so a form always starts fresh. Once something inside has been typed
 * or changed, a click on the backdrop, Escape or the × asks before
 * discarding it; a form that closes itself after saving is not asked.
 */
export function SidePanel({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const t = useTranslations("admin");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dirty = useRef(false);
  const asking = useRef(false);
  const confirmBox = useDialog();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? "hidden" : "";
    dirty.current = false;
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Work in progress also survives a closed tab only by asking first.
  useEffect(() => {
    if (!open) return;
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open]);

  /** Close now, or first ask when something inside was changed. */
  const requestClose = () => {
    if (!dirty.current) { onClose(); return; }
    if (asking.current) return;
    asking.current = true;
    void confirmBox.confirm(t("discardChanges"), { confirmLabel: t("discard"), danger: true }).then((ok) => {
      asking.current = false;
      if (ok) onClose();
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      // React re-dispatches a nested dialog's close and cancel up the
      // component tree even though they never bubble in the DOM, so only
      // this dialog's own events may close the panel.
      onClose={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        // A click on the backdrop closes the panel, unless another modal
        // (the console confirm) is open on top: that click is theirs.
        if (event.target !== event.currentTarget) return;
        if (document.querySelectorAll("dialog[open]").length > 1) return;
        requestClose();
      }}
      onInputCapture={() => { dirty.current = true; }}
      onChangeCapture={() => { dirty.current = true; }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none justify-end bg-transparent p-0 backdrop:bg-ink/55 open:flex"
    >
      {open ? (
        <div
          className={`flex h-full w-full flex-col bg-paper shadow-[-16px_0_48px_rgba(14,58,70,0.18)] motion-safe:animate-[panel-in_220ms_ease-out] ${
            wide ? "sm:max-w-[820px]" : "sm:max-w-[640px]"
          }`}
        >
          <div className="flex shrink-0 items-center gap-3 border-b-[0.5px] border-line px-5 py-4 sm:px-6">
            <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t("panelClose")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-[19px] leading-none text-black/70 transition-colors hover:bg-mist-2 hover:text-sea"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-mist px-5 py-5 sm:px-6">
            {children}
          </div>
        </div>
      ) : null}
      {confirmBox.element}
    </dialog>
  );
}
