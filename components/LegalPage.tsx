import type { LegalDoc } from "@/content/legal/types";

/**
 * Shared renderer for the legal pages. Server component, no client JS. A page
 * is either a document built from docs/legal/governance (HTML, see
 * lib/legal-docs.ts) or typed content from content/legal (the cookie policy).
 */
export function LegalPage(props: { title: string; html: string } | { doc: LegalDoc }) {
  if ("html" in props) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="type-display text-4xl">{props.title}</h1>
        <article className="prose-legal mt-6" dangerouslySetInnerHTML={{ __html: props.html }} />
      </div>
    );
  }
  const { doc } = props;
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{doc.title}</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-black/80">{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="type-display mt-8 text-2xl">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-[15.5px] leading-relaxed text-black/80">
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15.5px] leading-relaxed text-black/80">
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
