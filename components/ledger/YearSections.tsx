"use client";

import { useId, useState, type ReactNode } from "react";

export interface YearSection {
  key: string;
  label: string;
  /** The figure on the tile; the tile is the tab. */
  value: string;
  content: ReactNode;
}

/**
 * The year in figures, as tabs: each tile is a tab whose panel shows what
 * stands behind the number; the first tab is the year's story. No motion,
 * so nothing to switch off for reduced-motion users. Arrow keys move
 * between tabs, per the WAI tabs pattern.
 */
export function YearSections({ story, sections }: { story: { key: string; label: string; content: ReactNode }; sections: YearSection[] }) {
  const baseId = useId();
  const all = [story.key, ...sections.map((s) => s.key)];
  const [active, setActive] = useState(story.key);
  const panelId = (key: string) => `${baseId}-${key}-panel`;
  const tabId = (key: string) => `${baseId}-${key}-tab`;
  const tile = (selected: boolean) =>
    `rounded-lg px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${
      selected ? "bg-sea text-paper" : "bg-mist hover:bg-mist-2"
    }`;

  const onKey = (event: React.KeyboardEvent<HTMLButtonElement>, key: string) => {
    const index = all.indexOf(key);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % all.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + all.length) % all.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = all.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActive(all[next]);
    document.getElementById(tabId(all[next]))?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label={story.label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          role="tab"
          id={tabId(story.key)}
          aria-selected={active === story.key}
          aria-controls={panelId(story.key)}
          tabIndex={active === story.key ? 0 : -1}
          onClick={() => setActive(story.key)}
          onKeyDown={(e) => onKey(e, story.key)}
          className={`${tile(active === story.key)} col-span-2 sm:col-span-4`}
        >
          <span className={`type-eyebrow ${active === story.key ? "text-paper/80" : "text-sea/80"}`}>{story.label}</span>
        </button>
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            role="tab"
            id={tabId(section.key)}
            aria-selected={active === section.key}
            aria-controls={panelId(section.key)}
            tabIndex={active === section.key ? 0 : -1}
            onClick={() => setActive(section.key)}
            onKeyDown={(e) => onKey(e, section.key)}
            className={tile(active === section.key)}
          >
            <span className={`block text-[12.5px] font-semibold ${active === section.key ? "text-paper/80" : "text-black/55"}`}>{section.label}</span>
            <span className="mt-0.5 block font-mono text-[22px] tabular-nums">{section.value}</span>
          </button>
        ))}
      </div>
      {[story, ...sections].map((section) => (
        <div
          key={section.key}
          role="tabpanel"
          id={panelId(section.key)}
          aria-labelledby={tabId(section.key)}
          hidden={active !== section.key}
          className="mt-5"
        >
          {section.content}
        </div>
      ))}
    </div>
  );
}
