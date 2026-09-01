import { getTranslations } from "next-intl/server";

import { RegistrationRowActions } from "@/components/admin/RegistrationRowActions";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface RegistrationRow {
  id: string;
  event_id: string;
  distance: string | null;
  shirt_size: string | null;
  tier_label: string | null;
  bib_number: string | null;
  waiver_signed_at: string | null;
  amount_due_cents: number;
  amount_paid_cents: number;
  payment_reference: string | null;
  status: "pending" | "confirmed" | "cancelled";
  profile: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface EventRow {
  id: string;
  name: string;
  starts_at: string;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const [{ locale }, { event: eventFilter }] = await Promise.all([
    params,
    searchParams,
  ]);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, name, starts_at")
    .order("starts_at", { ascending: false });
  const events = (eventsData ?? []) as EventRow[];
  const selectedEvent =
    events.find((candidate) => candidate.id === eventFilter) ?? events[0] ?? null;

  let rows: RegistrationRow[] = [];
  if (selectedEvent) {
    const { data } = await supabase
      .from("registrations")
      .select(
        "id, event_id, distance, shirt_size, tier_label, bib_number, waiver_signed_at, amount_due_cents, amount_paid_cents, payment_reference, status, profile:profiles(full_name)",
      )
      .eq("event_id", selectedEvent.id)
      .order("status", { ascending: true });
    rows = (data ?? []) as unknown as RegistrationRow[];
  }

  const money = (cents: number) => formatCents(cents, locale as Locale);
  const confirmed = rows.filter((row) => row.status === "confirmed").length;

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("registrationsTitle")}</h1>

      {events.length > 1 ? (
        <form method="get" className="mt-4 flex items-center gap-2">
          <label className="text-[13px] font-semibold" htmlFor="event-filter">
            {t("regEvent")}
          </label>
          <select
            id="event-filter"
            name="event"
            defaultValue={selectedEvent?.id}
            className="rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2 text-[13.5px] outline-none focus:border-sea"
          >
            {events.map((eventRow) => (
              <option key={eventRow.id} value={eventRow.id}>
                {eventRow.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border-[1.5px] border-line px-3.5 py-2 text-[13px] font-semibold hover:border-sea hover:text-sea"
          >
            {t("regShow")}
          </button>
        </form>
      ) : null}

      {selectedEvent ? (
        <>
          <p className="mt-4 text-[13.5px] text-ink/65">
            {t("regSummary", { total: rows.length, confirmed })}
          </p>
          <p className="mt-1">
            <a
              href={`/api/admin/registrations?event=${selectedEvent.id}`}
              download
              className="text-[13px] font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
            >
              {t("regCsv")}
            </a>
          </p>

          {rows.length === 0 ? (
            <p className="mt-6 text-[13.5px] text-ink/60">{t("regEmpty")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-sea">
                    <th className="py-2 pr-3">{t("regRunner")}</th>
                    <th className="py-2 pr-3">{t("regDistance")}</th>
                    <th className="py-2 pr-3">{t("regSize")}</th>
                    <th className="py-2 pr-3">{t("regWaiver")}</th>
                    <th className="py-2 pr-3">{t("regFee")}</th>
                    <th className="py-2 pr-3">{t("table.reference")}</th>
                    <th className="py-2 pr-3">{t("regStatus")}</th>
                    <th className="py-2">{t("bib")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-line-soft align-top">
                      <td className="py-2.5 pr-3 font-semibold">
                        {one(row.profile)?.full_name ?? "—"}
                        {row.tier_label ? (
                          <span className="block text-[11.5px] font-normal text-ink/50">
                            {row.tier_label}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3">{row.distance ?? "—"}</td>
                      <td className="py-2.5 pr-3">{row.shirt_size ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums">
                        {row.waiver_signed_at ? row.waiver_signed_at.slice(0, 10) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums">
                        {row.status === "confirmed"
                          ? money(row.amount_paid_cents)
                          : row.amount_due_cents > 0
                            ? money(row.amount_due_cents)
                            : "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">
                        {row.payment_reference ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={
                            row.status === "confirmed"
                              ? "font-semibold text-sea"
                              : row.status === "cancelled"
                                ? "text-ink/40 line-through"
                                : "text-ink/60"
                          }
                        >
                          {t(`regStatusValue.${row.status}`)}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <RegistrationRowActions
                          registrationId={row.id}
                          bib={row.bib_number}
                          status={row.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-[13.5px] text-ink/60">{t("regNoEvents")}</p>
      )}
    </div>
  );
}
