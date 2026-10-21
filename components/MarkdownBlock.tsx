import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown written in the console (notes, agendas, minutes), set in the legal prose style. */
export function MarkdownBlock({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`prose-legal ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
}
