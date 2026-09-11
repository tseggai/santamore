"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchDonateTarget } from "@/app/[locale]/(site)/podrzi/actions";
import { DonateFlow } from "@/components/donate/DonateFlow";
import type { DonateRequest, DonateTargetData } from "@/lib/donate/types";
import type { Locale } from "@/i18n/routing";

interface DonateContextValue {
  open: (request: DonateRequest) => void;
}

const DonateContext = createContext<DonateContextValue | null>(null);

/** Null outside the provider (the runner console, the admin) — callers fall back to the link. */
export function useDonate(): DonateContextValue | null {
  return useContext(DonateContext);
}

type State =
  | { phase: "closed" }
  | { phase: "loading"; request: DonateRequest }
  | { phase: "ready"; request: DonateRequest; data: DonateTargetData }
  | { phase: "error"; request: DonateRequest };

/**
 * One donate overlay for the whole public site. Any Donate button opens
 * it over the page the visitor is on; the target (flagship campaign, a
 * campaign, a fundraiser page) is loaded when it opens, so no page pays
 * for it up front. A native <dialog> gives the focus trap, Escape and
 * the inert background; we add the scroll lock and the mobile sheet.
 */
export function DonateProvider({ children }: { children: ReactNode }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("donate");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>({ phase: "closed" });
  const isOpen = state.phase !== "closed";

  const load = useCallback(async (request: DonateRequest) => {
    setState({ phase: "loading", request });
    const data = await fetchDonateTarget(request).catch(() => null);
    setState((current) =>
      current.phase === "closed" || current.request !== request
        ? current
        : data
          ? { phase: "ready", request, data }
          : { phase: "error", request },
    );
  }, []);

  const open = useCallback(
    (request: DonateRequest) => {
      void load(request);
    },
    [load],
  );

  const close = useCallback(() => setState({ phase: "closed" }), []);

  // Mirror React state into the native dialog and lock the page behind it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <DonateContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label={t("payVerb")}
        onClose={close}
        onClick={(event) => {
          // Only the backdrop itself, never a click inside the panel.
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-ink/55 open:flex sm:items-center sm:p-4"
      >
        <div className="relative flex max-h-[100dvh] w-full max-w-[600px] flex-col rounded-t-[18px] border-[1.5px] border-ink bg-paper shadow-[0_24px_60px_rgba(14,58,70,0.25)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[18px]">
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-line bg-paper text-[19px] leading-none text-ink/70 transition-colors hover:border-sea hover:text-sea"
          >
            ×
          </button>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {state.phase === "ready" ? (
              <DonateFlow
                key={`${state.request.kind}:${state.request.slug ?? ""}`}
                locale={locale}
                data={state.data}
                variant="dialog"
                onClose={close}
              />
            ) : state.phase === "error" ? (
              <div className="px-5 py-10 sm:px-7">
                <p
                  role="alert"
                  className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[15px] text-sea"
                >
                  {t("errServer")}
                </p>
              </div>
            ) : (
              <div className="px-5 py-10 sm:px-7" aria-busy>
                <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">
                  {t("payVerb")}
                </p>
                <div className="mt-4 h-8 w-2/3 animate-pulse rounded-md bg-mist motion-reduce:animate-none" />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[68px] animate-pulse rounded-[11px] bg-mist motion-reduce:animate-none"
                    />
                  ))}
                </div>
                <p className="sr-only">{t("loading")}</p>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </DonateContext.Provider>
  );
}
