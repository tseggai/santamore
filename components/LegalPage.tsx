import type { LegalDoc } from "@/content/legal/types";
import type { Locale } from "@/i18n/routing";

/**
 * Shared renderer for the eight legal pages. Server component, no client JS.
 * Every draft carries the lawyer-review banner until the texts are approved;
 * the banner strings live here (not in messages/) so they cannot drift apart
 * from the documents they guard.
 */
const DRAFT_BANNER: Record<Locale, string> = {
  me: "NACRT — mora ga pregledati advokat u Crnoj Gori prije objave",
  en: "DRAFT — must be reviewed by a Montenegrin lawyer before launch",
  ru: "ЧЕРНОВИК — перед публикацией должен быть проверен юристом в Черногории",
};

export function LegalPage({ doc, locale }: { doc: LegalDoc; locale: Locale }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p
        role="note"
        className="rounded-brand border-[1.5px] border-dashed border-red bg-red/5 px-4 py-3 text-[13px] font-semibold text-red-dark"
      >
        {DRAFT_BANNER[locale]}
      </p>
      <h1 className="type-display mt-8 text-4xl">{doc.title}</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink/80">{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="type-display mt-8 text-2xl">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-3 text-[14.5px] leading-relaxed text-ink/80"
            >
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink/80">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
