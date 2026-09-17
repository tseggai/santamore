"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { DonateButton } from "@/components/donate/DonateButton";
import { Link } from "@/i18n/navigation";

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  /** A figure worth the space: the live total, days to go. */
  figure?: string;
  figureLabel?: string;
  image: string | null;
  primary: { href: string; label: string; donate?: boolean };
  secondary?: { href: string; label: string };
}

const HOLD_MS = 7000;

/**
 * The landing hero as a full-height slideshow: one slide per thing a
 * visitor can act on right now — who we are, the next events, the open
 * causes, the cause vote. Advances on its own unless the visitor prefers
 * reduced motion, is hovering or has focus inside; arrows, dots, keyboard
 * and swipe all work; every slide is in the DOM for screen readers.
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
            className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-700 motion-reduce:transition-none ${active ? "z-[1] opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {slide.image ? <Image src={slide.image} alt="" fill priority={i === 0} sizes="100vw" className="object-cover" /> : null}
            <div className={`absolute inset-0 ${slide.image ? "bg-gradient-to-t from-sea via-sea/70 to-sea/25" : "bg-gradient-to-br from-sea to-sea-2"}`} />
            <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-24 sm:pb-24">
              <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/70">{slide.eyebrow}</p>
              <h2 className="type-display mt-3 max-w-4xl text-4xl leading-[1.08] sm:text-6xl">{slide.title}</h2>
              <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-paper/80">{slide.text}</p>
              {slide.figure ? (
                <p className="mt-5 text-[14px] text-paper/75">
                  <span className="font-mono text-3xl font-extrabold tabular-nums text-paper">{slide.figure}</span> {slide.figureLabel}
                </p>
              ) : null}
              <div className="mt-7 flex flex-wrap gap-3">
                {button(slide.primary, "red")}
                {slide.secondary ? button(slide.secondary, "ghost") : null}
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-0 z-[2] mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pb-6">
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
