"use client";

import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { ImageIcon } from "@/components/Icons";
import { downscaleToJpeg } from "@/lib/images";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

/**
 * What-you-see editor for post bodies. The document is stored as Markdown
 * (the public page renders it), so the editor reads and writes Markdown
 * through Tiptap's serializer; images upload to the gallery bucket and sit
 * between paragraphs like any other block.
 */
export function RichTextEditor({
  value,
  onChange,
  folder,
  id,
}: {
  value: string;
  onChange: (markdown: string) => void;
  /** Bucket folder for pictures dropped into the text. */
  folder: string;
  id?: string;
}) {
  const t = useTranslations("admin");
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const last = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
      Image.configure({ inline: false }),
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: id ?? "",
        class: "prose-news min-h-[320px] rounded-b-lg bg-paper px-4 py-3 text-[15px] outline-none focus:bg-paper",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      const markdown = current.getMarkdown();
      last.current = markdown;
      onChange(markdown);
    },
  });

  // A translation or a tab switch replaces the text from outside.
  useEffect(() => {
    if (!editor || value === last.current) return;
    last.current = value;
    editor.commands.setContent(value, { contentType: "markdown" });
  }, [editor, value]);

  const insertImage = async (file: File) => {
    if (!editor) return;
    setBusy(true);
    try {
      const blob = await downscaleToJpeg(file, 2000);
      const path = `${folder}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("gallery").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const src = galleryImageUrl(path);
      if (src) editor.chain().focus().setImage({ src, alt: "" }).run();
    } catch {
      // nothing inserted; the text is untouched
    } finally {
      setBusy(false);
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("mdLinkPrompt"), previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const tool = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-[13px] font-semibold transition-colors disabled:opacity-40 ${active ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"}`;

  return (
    <div className="mt-1 rounded-lg bg-paper">
      <div className="flex flex-wrap items-center gap-1.5 border-b-[0.5px] border-line px-2 py-1.5" role="toolbar" aria-label={t("postBody")}>
        <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} className={`${tool(Boolean(editor?.isActive("bold")))} font-bold`} title={t("mdBold")} aria-label={t("mdBold")}>B</button>
        <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} className={`${tool(Boolean(editor?.isActive("italic")))} italic`} title={t("mdItalic")} aria-label={t("mdItalic")}>I</button>
        <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={tool(Boolean(editor?.isActive("heading", { level: 2 })))} title={t("mdHeading")}>H2</button>
        <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={tool(Boolean(editor?.isActive("heading", { level: 3 })))} title={t("mdHeading")}>H3</button>
        <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()} className={tool(Boolean(editor?.isActive("bulletList")))} title={t("mdList")}>•</button>
        <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={tool(Boolean(editor?.isActive("orderedList")))} title={t("mdOrderedList")}>1.</button>
        <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={tool(Boolean(editor?.isActive("blockquote")))} title={t("mdQuote")}>“</button>
        <button type="button" disabled={!editor} onClick={setLink} className={tool(Boolean(editor?.isActive("link")))} title={t("mdLink")}>↗</button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void insertImage(file);
          }}
        />
        <button type="button" disabled={!editor || busy} onClick={() => fileInput.current?.click()} className={`${tool(false)} inline-flex items-center gap-1.5`} title={t("mdImage")}>
          <ImageIcon />
          {busy ? t("photoUploading") : t("mdImage")}
        </button>
        <span className="ml-auto flex gap-1.5">
          <button type="button" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} className={tool(false)} title={t("mdUndo")} aria-label={t("mdUndo")}>↶</button>
          <button type="button" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} className={tool(false)} title={t("mdRedo")} aria-label={t("mdRedo")}>↷</button>
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
