import { getTranslations } from "next-intl/server";

import {
  FundraiserStatusButtons,
  MessageHideButton,
} from "@/components/admin/FundraiserModeration";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface FundraiserRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "hidden";
  goal_cents: number | null;
  profile: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface MessageRow {
  id: string;
  donor_name: string | null;
  message: string;
  is_message_hidden: boolean;
  created_at: string;
  fundraiser: { title: string } | { title: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminFundraisersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: pagesData }, { data: messagesData }] = await Promise.all([
    supabase
      .from("fundraisers")
      .select("id, slug, title, status, goal_cents, profile:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(200),
    // Recent donor-wall messages across all pages, newest first — the
    // moderation wall. Hidden ones stay listed so they can be restored.
    supabase
      .from("donations")
      .select(
        "id, donor_name, message, is_message_hidden, created_at, fundraiser:fundraisers(title)",
      )
      .not("message", "is", null)
      .neq("message", "")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const pages = (pagesData ?? []) as unknown as FundraiserRow[];
  const messages = (messagesData ?? []) as unknown as MessageRow[];
  const money = (cents: number) => formatCents(cents, locale as Locale);

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("fundraisersTitle")}</h1>

      {pages.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-ink/60">{t("pagesEmpty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-sea">
                <th className="py-2 pr-3">{t("pageTitleCol")}</th>
                <th className="py-2 pr-3">{t("pageOwner")}</th>
                <th className="py-2 pr-3">{t("pageGoal")}</th>
                <th className="py-2 pr-3">{t("pageStatus")}</th>
                <th className="py-2">{t("pageActions")}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-line-soft align-top">
                  <td className="py-2.5 pr-3">
                    {page.status === "active" ? (
                      <Link
                        href={`/f/${page.slug}`}
                        className="font-semibold text-sea hover:underline"
                      >
                        {page.title}
                      </Link>
                    ) : (
                      <span className="font-semibold">{page.title}</span>
                    )}
                    <span className="block font-mono text-[11.5px] text-ink/45">
                      /f/{page.slug}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">{one(page.profile)?.full_name ?? "—"}</td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums">
                    {page.goal_cents ? money(page.goal_cents) : "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={
                        page.status === "active"
                          ? "font-semibold text-sea"
                          : page.status === "hidden"
                            ? "font-semibold text-red-dark"
                            : "text-ink/60"
                      }
                    >
                      {t(`pageStatusValue.${page.status}`)}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <FundraiserStatusButtons
                      fundraiserId={page.id}
                      status={page.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-12 text-[15px] font-bold">{t("wallHeading")}</h2>
      <p className="mt-1 text-[13px] text-ink/60">{t("wallHint")}</p>
      {messages.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-ink/60">{t("wallEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {messages.map((row) => (
            <li
              key={row.id}
              className={`rounded-[11px] border-[1.5px] px-3.5 py-2.5 text-[13.5px] ${
                row.is_message_hidden ? "border-line-soft opacity-60" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">{row.donor_name ?? "—"}</span>
                <span className="text-[12px] text-ink/50">
                  {one(row.fundraiser)?.title ?? "—"} ·{" "}
                  <span className="font-mono tabular-nums">
                    {row.created_at.slice(0, 10)}
                  </span>
                </span>
                <span className="ml-auto">
                  <MessageHideButton
                    donationId={row.id}
                    hidden={row.is_message_hidden}
                  />
                </span>
              </div>
              <p className="mt-1 text-ink/80">{row.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
