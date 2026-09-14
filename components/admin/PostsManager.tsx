"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { PostEditor, type EditablePost, type PostGroup } from "@/components/admin/PostEditor";
import { Chip, DataTable, Thumb, iconButton, type Column } from "@/components/console/DataTable";
import { PageHeader } from "@/components/console/PageHeader";
import { SidePanel } from "@/components/console/SidePanel";
import { ExternalIcon } from "@/components/Icons";
import { formatShortDate } from "@/lib/dates";
import { galleryImageUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/** Posts grouped by slug (one row per language); the row opens the editor. */
export function PostsManager({ posts, initialPostId, title, lead }: { posts: EditablePost[]; initialPostId?: string; title: string; lead: string }) {
  const t = useTranslations("admin");
  const uiLocale = useLocale() as Locale;
  const groups: PostGroup[] = [];
  for (const post of posts) {
    const group = groups.find((g) => g.slug === post.slug);
    if (group) group.rows.push(post);
    else groups.push({ slug: post.slug, rows: [post] });
  }
  const [open, setOpen] = useState<"" | "new" | string>(groups.find((g) => g.rows.some((r) => r.id === initialPostId))?.slug ?? "");
  const group = groups.find((g) => g.slug === open) ?? null;
  const titleOf = (g: PostGroup) =>
    (g.rows.find((r) => r.locale === routing.defaultLocale) ?? g.rows.find((r) => r.locale === uiLocale) ?? g.rows[0]).title;
  const isLive = (g: PostGroup) => g.rows.some((r) => r.published_at);
  const dateOf = (g: PostGroup) => g.rows.map((r) => r.published_at).filter(Boolean).sort().at(-1) ?? null;

  const columns: Column<PostGroup>[] = [
    {
      key: "title",
      header: t("table.colTitle"),
      cell: (g) => <span className="block max-w-[320px] truncate font-semibold">{titleOf(g)}</span>,
      sort: (g) => titleOf(g),
    },
    {
      key: "languages",
      header: t("table.colLanguages"),
      cell: (g) => (
        <span className="flex gap-1">
          {routing.locales.map((l) => (
            <span
              key={l}
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                g.rows.some((r) => r.locale === l) ? "bg-sea text-paper" : "bg-paper text-black/30"
              }`}
            >
              {l}
            </span>
          ))}
        </span>
      ),
      filter: {
        options: routing.locales.map((l) => ({ value: l, label: l.toUpperCase() })),
        match: (g, value) => g.rows.some((r) => r.locale === value),
      },
    },
    {
      key: "status",
      header: t("table.colStatus"),
      cell: (g) => (isLive(g) ? <Chip tone="sea">{t("postLive")}</Chip> : <Chip>{t("postDraft")}</Chip>),
      sort: (g) => (isLive(g) ? 1 : 0),
      filter: {
        options: [
          { value: "live", label: t("postLive") },
          { value: "draft", label: t("postDraft") },
        ],
        match: (g, value) => (value === "live" ? isLive(g) : !isLive(g)),
      },
    },
    {
      key: "date",
      header: t("table.colDate"),
      cell: (g) => <span className="font-mono tabular-nums text-black/60">{formatShortDate(dateOf(g), uiLocale)}</span>,
      sort: (g) => dateOf(g),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        lead={lead}
        action={
          <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
            + {t("postNew")}
          </button>
        }
      />
      <SidePanel open={open !== ""} title={open === "new" ? t("postNewHeading") : group ? t("postEditHeading", { title: titleOf(group) }) : ""} onClose={() => setOpen("")} wide>
        <PostEditor key={open} group={group} onSaved={() => setOpen("")} />
      </SidePanel>

      <DataTable
        rows={groups}
        getId={(g) => g.slug}
        columns={columns}
        leading={(g) => <Thumb src={galleryImageUrl(g.rows[0].cover_path)} initial={titleOf(g).charAt(0).toUpperCase()} />}
        onOpen={(g) => setOpen(g.slug)}
        searchText={(g) => `${g.slug} ${g.rows.map((r) => r.title).join(" ")}`}
        emptyLabel={t("postsEmpty")}
        rowActions={(g) =>
          isLive(g) ? (
            <Link href={`/vijesti/${g.slug}`} target="_blank" className={iconButton} aria-label={t("table.view")} title={t("table.view")}>
              <ExternalIcon />
            </Link>
          ) : null
        }
      />
    </div>
  );
}
