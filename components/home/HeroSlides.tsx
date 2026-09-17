"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { DonateButton } from "@/components/donate/DonateButton";
import { Link } from "@/i18n/navigation";

/** What the right-hand card shows: the one figure that makes the slide concrete. */
export type HeroCard =
  | { type: "total"; value: string; label: string }
  | { type: "event"; startsAt: string; day: string; month: string; weekday: string; venue: string | null; kind: string }
  | { type: "progress"; raised: string; goalLine: string | null; pct: number | null; donors: string }
  | { type: "list"; items: { title: string; count: number }[]; empty: string };

export interface HeroSlide {
  id: string;
  /** What kind of thing this is — the chip in the corner. */
  chip: string;
  eyebrow: string;
  title: string;
  text: string;
  image: string | null;
  card: HeroCard;
  primary: { href: string; label: string; donate?: boolean };
  secondary?: { href: string; label: string };
}

const HOLD_MS = 8000;

function Countdown({ startsAt }: { startsAt: string }) {
  const t = useTranslations("home");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const left = new Date(startsAt).getTime() - now;
  if (left <= 0) return <p className="mt-3 text-[14px] font-semibold text-sea">{t("cdStarted")}</p>;
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const cell = (value: number, label: string) => (
    <span className="flex flex-col items-center rounded-lg bg-mist px-3 py-2">
      <span className="font-mono text-[22px] font-extrabold tabular-nums leading-none">{String(value).padStart(2, "0")}</span>
      <span className="mt-1 text-[11px] uppercase tracking-[0.12em] text-black/55">{label}</span>
    </span>
  );
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5" aria-label={`${days} ${t("cdDays")} ${hours} ${t("cdHours")} ${minutes} ${t("cdMinutes")}`}>
      {cell(days, t("cdDays"))}
      {cell(hours, t("cdHours"))}
      {cell(minutes, t("cdMinutes"))}
    </div>
  );
}

function Card({ card }: { card: HeroCard }) {
  const t = useTranslations("home");
  const box = "rounded-brand bg-paper p-5 text-black shadow-[0_24px_60px_rgba(14,58,70,0.25)]";
  if (card.type === "total") {
    return (
      <div className={box}>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/55">{t("liveTotal")}</p>
        <p className="mt-2 font-mono text-4xl font-extrabold tabular-nums">{card.value}</p>
        <p className="mt-1 text-[13.5px] text-black/60">{card.label}</p>
      </div>
    );
  }
  if (card.type === "event") {
    return (
      <div className={box}>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-red text-paper">
            <span className="font-mono text-[26px] font-extrabold leading-none tabular-nums">{card.day}</span>
            <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em]">{card.month}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold">{card.weekday}</span>
            <span className="block text-[13.5px] text-black/60">{card.kind}{card.venue ? ` · ${card.venue}` : ""}</span>
          </span>
        </div>
        <Countdown startsAt={card.startsAt} />
      </div>
    );
  }
  if (card.type === "progress") {
    return (
      <div className={box}>
        <p className="font-mono text-[32px] font-extrabold tabular-nums leading-none">{card.raised}</p>
        <p className="mt-1.5 text-[13.5px] text-black/60">
          {card.goalLine ? <>{card.goalLine} · </> : null}
          <span className="font-mono tabular-nums">{card.donors}</span> {t("donorsShort")}
        </p>
        {card.pct !== null ? (
          <>
            <span className="mt-3 block h-[8px] overflow-hidden rounded-[4px] bg-mist-2">
              <span className="block h-full rounded-[4px] bg-sea" style={{ width: `${Math.max(2, card.pct)}%` }} />
            </span>
            <p className="mt-1.5 font-mono text-[13px] tabular-nums text-sea">{card.pct}% {t("goalReached")}</p>
          </>
        ) : null}
      </div>
    );
  }
  return (
    <div className={box}>
      {card.items.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-black/65">{card.empty}</p>
      ) : (
        <ol className="space-y-1.5">
          {card.items.map((item) => (
            <li key={item.title} className="flex items-center gap-3 rounded-lg bg-mist px-3 py-2">
              <span className="font-mono text-[13px] font-bold tabular-nums text-red">▲ {item.count}</span>
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{item.title}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * The landing hero as a full-height slideshow: one slide per thing a
 * visitor can act on right now. Each slide says what it is (the chip),
 * makes it concrete (the card: live total, date and countdown, progress,
 * the vote) and offers the action. Advances on its own unless the visitor
 * prefers reduced motion, hovers or has focus inside; dots, arrows,
 * arrow keys and swipe all work; every slide stays in the DOM.
 */
export function HeroSlides({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => go(index + 1), HOLD_MS);
    return () => clearInterval(timer);
  }, [count, paused, index, go]);

  if (count === 0) return null;

  const button = (slide: HeroSlide["primary"], tone: "red" | "ghost"): ReactNode => {
    const className =
      tone === "red"
        ? "inline-flex h-12 items-center rounded-lg bg-red px-6 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark"
        : "inline-flex h-12 items-center rounded-lg bg-paper/15 px-6 text-[15.5px] font-semibold text-paper transition-colors hover:bg-paper/25";
    if (slide.donate) {
      return (
        <DonateButton request={{ kind: "campaign" }} href={slide.href} className={className}>
          {slide.label}
        </DonateButton>
      );
    }
    return (
      <Link href={slide.href} className={className}>
        {slide.label}
      </Link>
    );
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("slideshow")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(index + 1);
        if (event.key === "ArrowLeft") go(index - 1);
      }}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        touchX.current = null;
        const end = event.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        if (end - start > 48) go(index - 1);
        if (start - end > 48) go(index + 1);
      }}
      className="relative min-h-[calc(100dvh-64px)] overflow-hidden bg-sea text-paper sm:min-h-[calc(100dvh-72px)]"
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={!active}
            className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-700 motion-reduce:transition-none ${active ? "z-[1] opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {slide.image ? <Image src={slide.image} alt="" fill priority={i === 0} sizes="100vw" className="object-cover" /> : null}
            <div className={`absolute inset-0 ${slide.image ? "bg-gradient-to-r from-sea via-sea/80 to-sea/40" : "bg-gradient-to-br from-sea to-sea-2"}`} />
            {/* the same column as every content page; only the picture runs edge to edge */}
            <div className="relative mx-auto grid w-full max-w-3xl items-center gap-8 px-5 pb-24 pt-14 sm:pb-28 sm:pt-16 md:grid-cols-[minmax(0,1fr)_260px] md:gap-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-paper/15 px-3 py-1 font-mono text-[11.5px] uppercase tracking-[0.16em] text-paper">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red" />
                  {slide.chip}
                </span>
                <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.16em] text-paper/70">{slide.eyebrow}</p>
                <h2 className="type-display mt-2 text-4xl leading-[1.08] sm:text-5xl">{slide.title}</h2>
                <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-paper/80">{slide.text}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  {button(slide.primary, "red")}
                  {slide.secondary ? button(slide.secondary, "ghost") : null}
                </div>
              </div>
              <Card card={slide.card} />
            </div>
          </div>
        );
      })}

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-0 z-[2] mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 pb-6">
          <div role="tablist" aria-label={t("slideshow")} className="flex gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={t("goToSlide", { n: i + 1, title: slide.title })}
                onClick={() => go(i)}
                className={`h-2.5 rounded-full transition-all ${i === index ? "w-8 bg-paper" : "w-2.5 bg-paper/45 hover:bg-paper/70"}`}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => go(index - 1)} aria-label={t("prevSlide")} className="flex h-10 w-10 items-center justify-center rounded-lg bg-paper/15 text-[18px] hover:bg-paper/25">
              ‹
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label={t("nextSlide")} className="flex h-10 w-10 items-center justify-center rounded-lg bg-paper/15 text-[18px] hover:bg-paper/25">
              ›
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
