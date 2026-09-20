import type { ReactNode } from "react";

export interface YearSection {
  key: string;
  label: string;
  /** The figure on the tile; the tile jumps to the section. */
  value: string;
  content: ReactNode;
}

/**
 * The year in full: the story first, then a strip of figures, then every
 * section open on the page. A figure is a link to its section, so the
 * strip reads as a table of contents rather than a set of tabs.
 */
export function YearSections({ story, sections }: { story: { key: string; label: string; content: ReactNode }; sections: YearSection[] }) {
  const id = (key: string) => `godina-${key}`;
  return (
    <div>
      <section id={id(story.key)}>
        <h3 className="type-eyebrow text-sea/80">{story.label}</h3>
        <div className="mt-2">{story.content}</div>
      </section>
      <nav aria-label={story.label} className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sections.map((section) => (
          <a
            key={section.key}
            href={`#${id(section.key)}`}
            className="rounded-lg bg-mist px-3.5 py-3 text-left transition-colors hover:bg-mist-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
          >
            <span className="block text-[12.5px] font-semibold text-black/55">{section.label}</span>
            <span className="mt-0.5 block font-mono text-[22px] tabular-nums">{section.value}</span>
          </a>
        ))}
      </nav>
      {sections.map((section) => (
        <section key={section.key} id={id(section.key)} className="mt-8 scroll-mt-24">
          <h3 className="type-eyebrow text-sea/80">
            {section.label} <span className="font-mono normal-case tracking-normal text-black/45">· {section.value}</span>
          </h3>
          <div className="mt-2">{section.content}</div>
        </section>
      ))}
    </div>
  );
}
