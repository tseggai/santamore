"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { htmlLang, type Locale } from "@/i18n/routing";

/** Local "YYYY-MM-DDTHH:mm", the same shape a datetime-local input uses. */
export type LocalDateTime = string;

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: LocalDateTime): { y: number; m: number; d: number; hh: number; mm: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  return { y: +match[1], m: +match[2] - 1, d: +match[3], hh: +(match[4] ?? 0), mm: +(match[5] ?? 0) };
}

function build(y: number, m: number, d: number, hh: number, mm: number): LocalDateTime {
  return `${y}-${pad(m + 1)}-${pad(d)}T${pad(hh)}:${pad(mm)}`;
}

/**
 * A date-and-time picker in the brand: a month grid (Monday first) and
 * hour/minute selects, in a popover under a button that reads like a
 * value. No library; the value is the same local string the old native
 * input produced, so nothing upstream changes. Keyboard: the button opens
 * it, every day is a button, Escape closes, focus returns.
 */
export function DateTimeField({
  id,
  label,
  value,
  onChange,
  required = false,
  mode = "datetime",
  hideLabel = false,
}: {
  id: string;
  label: string;
  value: LocalDateTime;
  onChange: (next: LocalDateTime) => void;
  required?: boolean;
  /** "date" yields plain "YYYY-MM-DD" and hides the time. */
  mode?: "datetime" | "date";
  /** The label stays for screen readers only (a row with a header above). */
  hideLabel?: boolean;
}) {
  const dateOnly = mode === "date";
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const lang = htmlLang(locale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popId = useId();

  const parsed = parse(value);
  const today = new Date();
  const [viewY, setViewY] = useState(parsed?.y ?? today.getFullYear());
  const [viewM, setViewM] = useState(parsed?.m ?? today.getMonth());

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const monthLabel = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(
    new Date(viewY, viewM, 1),
  );
  const valueLabel = parsed
    ? new Intl.DateTimeFormat(lang, {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }),
      }).format(new Date(parsed.y, parsed.m, parsed.d, parsed.hh, parsed.mm))
    : "";
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: "short" }).format(new Date(2024, 0, 1 + i)), // 2024-01-01 is a Monday
  );

  const first = new Date(viewY, viewM, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const hh = parsed?.hh ?? 9;
  const mm = parsed?.mm ?? 0;
  const minutes = Array.from(new Set([...Array.from({ length: 12 }, (_, i) => i * 5), mm])).sort((a, b) => a - b);

  const pickDay = (d: number) => {
    if (dateOnly) {
      onChange(`${viewY}-${pad(viewM + 1)}-${pad(d)}`);
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    onChange(build(viewY, viewM, d, hh, mm));
  };
  const setTime = (nextH: number, nextM: number) => {
    const base = parsed ?? { y: viewY, m: viewM, d: today.getDate() };
    onChange(build(base.y, base.m, base.d, nextH, nextM));
  };
  const shiftMonth = (delta: number) => {
    const next = new Date(viewY, viewM + delta, 1);
    setViewY(next.getFullYear());
    setViewM(next.getMonth());
  };

  const dayClass = (d: number) => {
    const selected = parsed && parsed.y === viewY && parsed.m === viewM && parsed.d === d;
    const isToday = today.getFullYear() === viewY && today.getMonth() === viewM && today.getDate() === d;
    return `h-9 w-9 rounded-lg text-[14px] font-semibold tabular-nums transition-colors ${
      selected ? "bg-sea text-paper" : isToday ? "bg-mist-2 text-black" : "hover:bg-mist-2"
    }`;
  };

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-[14.5px] font-semibold"}>
        {label}
      </label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        onClick={() => setOpen((v) => !v)}
        className={`${hideLabel ? "" : "mt-1 "}flex w-full items-center justify-between gap-3 rounded-lg border-[1.5px] px-3 py-2.5 text-left text-[15px] outline-none focus:border-sea ${
          open ? "border-sea" : "border-line"
        } ${parsed ? "bg-paper" : "bg-paper text-black/45"}`}
      >
        <span className="truncate">{valueLabel || (dateOnly ? t("dtPickDate") : t("dtPick"))}</span>
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-black/50" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="4.5" width="14" height="12" rx="2" />
          <path d="M3 8.5h14M7 3v3M13 3v3" />
        </svg>
      </button>
      {required && !parsed ? <input tabIndex={-1} aria-hidden required className="sr-only" value="" onChange={() => undefined} /> : null}

      {open ? (
        <div
          id={popId}
          role="dialog"
          aria-label={label}
          className="absolute left-0 z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg bg-paper p-4 shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
        >
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label={t("dtPrevMonth")} className="h-9 w-9 rounded-lg hover:bg-mist-2">
              ‹
            </button>
            <span className="text-[15px] font-bold capitalize">{monthLabel}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label={t("dtNextMonth")} className="h-9 w-9 rounded-lg hover:bg-mist-2">
              ›
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {weekdays.map((day) => (
              <span key={day} className="type-eyebrow text-[11px] text-black/50">
                {day}
              </span>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <span key={`e${i}`} />
              ) : (
                <button key={d} type="button" onClick={() => pickDay(d)} aria-pressed={!!(parsed && parsed.y === viewY && parsed.m === viewM && parsed.d === d)} className={dayClass(d)}>
                  {d}
                </button>
              ),
            )}
          </div>
          {dateOnly ? null : (
          <div className="mt-4 flex items-end gap-2 border-t-[0.5px] border-line pt-3">
            <label className="flex-1 text-[13px] font-semibold">
              {t("dtHour")}
              <select
                value={hh}
                onChange={(event) => setTime(Number(event.target.value), mm)}
                className="mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-2 py-2 font-mono text-[15px]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {pad(i)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-[13px] font-semibold">
              {t("dtMinute")}
              <select
                value={mm}
                onChange={(event) => setTime(hh, Number(event.target.value))}
                className="mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-2 py-2 font-mono text-[15px]"
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => onChange("")} className="text-[13.5px] font-semibold text-black/60 hover:text-red-dark">
              {t("dtClear")}
            </button>
            <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} className="rounded-lg bg-ink px-4 py-2 text-[14px] font-bold text-paper">
              {t("dtDone")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
