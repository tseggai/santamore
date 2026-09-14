import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { galleryImageUrl } from "@/lib/storage";

/**
 * One news post as readers see it — shared by the public page and the
 * editor preview, so the two never drift.
 */
export function PostArticle({
  title,
  dateLabel,
  coverPath,
  bodyMd,
  preview = false,
}: {
  title: string;
  dateLabel: string | null;
  coverPath: string | null;
  bodyMd: string;
  preview?: boolean;
}) {
  const cover = galleryImageUrl(coverPath);
  return (
    <div className={preview ? "pointer-events-none select-none" : ""}>
      {dateLabel ? <p className="font-mono text-[12.5px] text-black/55">{dateLabel}</p> : null}
      <h1 className="type-display mt-2 text-4xl leading-[1.1] sm:text-5xl">{title || "…"}</h1>
      {cover ? (
        <Image
          src={cover}
          alt=""
          width={1200}
          height={675}
          priority={!preview}
          className="mt-6 w-full rounded-lg bg-mist object-cover"
        />
      ) : null}
      <div className="prose-news mt-8">
        <Markdown remarkPlugins={[remarkGfm]}>{bodyMd}</Markdown>
      </div>
    </div>
  );
}
