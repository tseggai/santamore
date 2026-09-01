import { getTranslations } from "next-intl/server";

import { DisbursementForm, type ChapterOption } from "@/components/admin/DisbursementForm";
import { DisbursementRowActions } from "@/components/admin/DisbursementRowActions";
import { formatCents } from "@/lib/money";
import { disbursementDocUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface DisbursementRow {
  id: string;
  beneficiary_label: string;
  category: string | null;
  amount_cents: number;
  decided_at: string | null;
  paid_at: string | null;
  published_at: string | null;
  documentation_paths: string[];
  committee_decision_ref: string | null;
  chapter: { name: string } | { name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminDisbursementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: chaptersData }, { data: rowsData }] = await Promise.all([
    supabase.from("chapters").select("id, name").order("name"),
    supabase
      .from("disbursements")
      .select(
        "id, beneficiary_label, category, amount_cents, decided_at, paid_at, published_at, documentation_paths, committee_decision_ref, chapter:chapters(name)",
      )
      .order("published_at", { ascending: false, nullsFirst: true })
      .limit(200),
  ]);
  const chapters = (chaptersData ?? []) as ChapterOption[];
  const rows = (rowsData ?? []) as unknown as DisbursementRow[];
  const drafts = rows.filter((row) => row.published_at === null);
  const published = rows.filter((row) => row.published_at !== null);

  const money = (cents: number) => formatCents(cents, locale as Locale);
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

  const list = (items: DisbursementRow[], isPublished: boolean) => (
    <ul className="mt-3 space-y-2">
      {items.map((row) => (
        <li
          key={row.id}
          className="rounded-[11px] border-[1.5px] border-line px-3.5 py-2.5 text-[13.5px]"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono tabular-nums text-ink/60">
              {day(row.published_at ?? row.decided_at)}
            </span>
            <span className="font-semibold">{row.beneficiary_label}</span>
            <span className="font-mono font-medium tabular-nums">
              {money(row.amount_cents)}
            </span>
            <span className="text-[12px] text-ink/50">
              {one(row.chapter)?.name ?? "—"}
              {row.category ? ` · ${row.category}` : ""}
              {row.committee_decision_ref ? ` · ${row.committee_decision_ref}` : ""}
            </span>
            <span className="ml-auto">
              <DisbursementRowActions
                disbursementId={row.id}
                isPublished={isPublished}
                isPaid={row.paid_at !== null}
              />
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {isPublished ? (
              <span
                className={
                  row.paid_at
                    ? "font-mono text-[11.5px] text-sea"
                    : "font-mono text-[11.5px] text-red-dark"
                }
              >
                {row.paid_at
                  ? t("disbPaidOn", { date: day(row.paid_at) })
                  : t("disbAwaitingPayout")}
              </span>
            ) : null}
            {row.documentation_paths.map((path) => {
              const href = disbursementDocUrl(path);
              if (!href) return null;
              return (
                <a
                  key={path}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-mist px-2.5 py-0.5 font-mono text-[11px] text-sea hover:underline"
                >
                  {t("disbDoc")}
                </a>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("disbursementsTitle")}</h1>

      <h2 className="mt-6 text-[15px] font-bold">{t("disbNewHeading")}</h2>
      {chapters.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-ink/60">{t("disbNoChapters")}</p>
      ) : (
        <DisbursementForm chapters={chapters} />
      )}

      <h2 className="mt-10 text-[15px] font-bold">{t("disbDraftHeading")}</h2>
      {drafts.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-ink/60">{t("disbDraftEmpty")}</p>
      ) : (
        list(drafts, false)
      )}

      <h2 className="mt-10 text-[15px] font-bold">{t("disbPublishedHeading")}</h2>
      {published.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-ink/60">{t("disbPublishedEmpty")}</p>
      ) : (
        list(published, true)
      )}
    </div>
  );
}
