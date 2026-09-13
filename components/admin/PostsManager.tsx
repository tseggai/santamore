"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PostEditor, type EditablePost } from "@/components/admin/PostEditor";
import { SidePanel } from "@/components/console/SidePanel";

/** Post list with the editor in a slide-over; `?post=` deep links still open one. */
export function PostsManager({ posts, initialPostId }: { posts: EditablePost[]; initialPostId?: string }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState<"" | "new" | string>(
    initialPostId && posts.some((post) => post.id === initialPostId) ? initialPostId : "",
  );
  const editing = posts.find((post) => post.id === open) ?? null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen("new")}
        className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark"
      >
        + {t("postNew")}
      </button>
      <SidePanel
        open={open !== ""}
        title={editing ? t("postEditHeading", { title: editing.title }) : t("postNewHeading")}
        onClose={() => setOpen("")}
        wide
      >
        <PostEditor key={open} post={editing} onSaved={() => setOpen("")} />
      </SidePanel>

      {posts.length > 0 ? (
        <>
          <h2 className="mt-8 text-[16px] font-bold">{t("postListHeading")}</h2>
          <ul className="mt-3 space-y-1.5">
            {posts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => setOpen(post.id)}
                  className="flex w-full flex-wrap items-baseline gap-x-3 rounded-lg bg-mist px-3.5 py-2.5 text-left text-[14.5px] transition-colors hover:bg-mist-2"
                >
                  <span className="font-mono text-[12px] uppercase text-sea">{post.locale}</span>
                  <span className="font-semibold">{post.title}</span>
                  <span className="font-mono text-[13px] text-black/45">/{post.slug}</span>
                  <span className={post.published_at ? "ml-auto text-[13px] font-semibold text-sea" : "ml-auto text-[13px] text-black/50"}>
                    {post.published_at ? t("postLive") : t("postDraft")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
