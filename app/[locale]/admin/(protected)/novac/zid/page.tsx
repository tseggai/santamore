import { getTranslations, setRequestLocale } from "next-intl/server";

import { MessageHideButton } from "@/components/admin/FundraiserModeration";
import { formatShortDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

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

/**
 * Donor-wall moderation lives with the money it came with: every message
 * is a line on a donation, so it sits under Money next to Incoming.
 */
export default async function DonorWallPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("donations")
    .select("id, donor_name, message, is_message_hidden, created_at, fundraiser:fundraisers(title)")
    .not("message", "is", null)
    .neq("message", "")
    .order("created_at", { ascending: false })
    .limit(200);
  const messages = (data ?? []) as unknown as MessageRow[];

  return (
    <div className="py-8">
      <h2 className="text-[18px] font-bold">{t("wallHeading")}</h2>
      <p className="mt-1 text-[14px] text-black/60">{t("wallHint")}</p>
      {messages.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-black/60">{t("wallEmpty")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {messages.map((row) => (
            <li key={row.id} className={`rounded-lg bg-mist px-3.5 py-2.5 text-[14.5px] ${row.is_message_hidden ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">{row.donor_name ?? "—"}</span>
                <span className="text-[13px] text-black/50">
                  {one(row.fundraiser)?.title ?? "—"} · <span className="font-mono tabular-nums">{formatShortDate(row.created_at, locale as Locale)}</span>
                </span>
                <span className="ml-auto">
                  <MessageHideButton donationId={row.id} hidden={row.is_message_hidden} />
                </span>
              </div>
              <p className="mt-1 text-black/80">{row.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
