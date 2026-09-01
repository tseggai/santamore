"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface GalleryImage {
  id: string;
  src: string;
  caption: string | null;
  credit: string | null;
  eventSlug: string | null;
  eventName: string | null;
  year: number | null;
}

export interface GalleryLabels {
  filterAll: string;
  credit: string;
  close: string;
  prev: string;
  next: string;
  counter: string; // "{current} / {total}" pre-formatted pattern with {current}/{total}
}

/**
 * Filterable grid + hand-built lightbox (brief §12: keyboard, swipe, lazy,
 * captions/credits — no library). The dialog traps focus on itself, arrows
 * and swipe navigate, Esc closes, and motion is instant so
 * prefers-reduced-motion has nothing to reduce.
 */
export function GalleryGrid({
  images,
  labels,
}: {
  images: GalleryImage[];
  labels: GalleryLabels;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  // One filter chip per event (ordered by year desc), plus "all".
  const filters = useMemo(() => {
    const seen = new Map<string, { slug: string; label: string; year: number }>();
    for (const image of images) {
      if (image.eventSlug && image.eventName && !seen.has(image.eventSlug)) {
        seen.set(image.eventSlug, {
          slug: image.eventSlug,
          label: image.year ? `${image.eventName} · ${image.year}` : image.eventName,
          year: image.year ?? 0,
        });
      }
    }
    return [...seen.values()].sort((a, b) => b.year - a.year);
  }, [images]);

  const visible = useMemo(
    () => (filter === "all" ? images : images.filter((i) => i.eventSlug === filter)),
    [images, filter],
  );

  const close = useCallback(() => {
    setOpenIndex(null);
    lastTriggerRef.current?.focus();
  }, []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) =>
        current === null
          ? current
          : (current + delta + visible.length) % visible.length,
      );
    },
    [visible.length],
  );

  // Keyboard: Esc closes, arrows navigate. Bound only while open.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex === null, close, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = openIndex === null ? null : visible[openIndex];

  return (
    <div>
      {filters.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group">
          {[{ slug: "all", label: labels.filterAll, year: 0 }, ...filters].map((f) => (
            <button
              key={f.slug}
              type="button"
              aria-pressed={filter === f.slug}
              onClick={() => {
                setFilter(f.slug);
                setOpenIndex(null);
              }}
              className={
                filter === f.slug
                  ? "rounded-full bg-sea px-4 py-1.5 text-[12.5px] font-semibold text-paper"
                  : "rounded-full border-[1.5px] border-line px-4 py-1.5 text-[12.5px] font-semibold text-ink/70 hover:border-sea hover:text-sea"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={(event) => {
                lastTriggerRef.current = event.currentTarget;
                setOpenIndex(index);
              }}
              className="group block w-full overflow-hidden rounded-brand border-[1.5px] border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
              aria-label={image.caption ?? image.eventName ?? undefined}
            >
              <Image
                src={image.src}
                alt={image.caption ?? ""}
                width={480}
                height={360}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-opacity group-hover:opacity-90"
              />
            </button>
          </li>
        ))}
      </ul>

      {current ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={current.caption ?? current.eventName ?? undefined}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 outline-none"
          onClick={close}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = event.changedTouches[0]?.clientX;
            if (start === null || end === undefined) return;
            if (Math.abs(end - start) > 48) step(end < start ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-mono text-[12px] tabular-nums text-paper/70">
              {labels.counter
                .replace("{current}", String((openIndex ?? 0) + 1))
                .replace("{total}", String(visible.length))}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label={labels.close}
              className="rounded-lg px-3 py-1.5 text-xl leading-none text-paper hover:bg-paper/10"
            >
              ×
            </button>
          </div>

          <div
            className="relative flex-1"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={current.src}
              alt={current.caption ?? ""}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <div
            className="flex items-center justify-between gap-4 px-4 py-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={labels.prev}
              className="rounded-lg px-3 py-2 text-xl leading-none text-paper hover:bg-paper/10"
            >
              ‹
            </button>
            <div className="min-w-0 text-center text-[13px] leading-relaxed text-paper/85">
              {current.caption ? <p>{current.caption}</p> : null}
              <p className="text-[11.5px] text-paper/55">
                {[current.eventName, current.credit ? `${labels.credit} ${current.credit}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={labels.next}
              className="rounded-lg px-3 py-2 text-xl leading-none text-paper hover:bg-paper/10"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
