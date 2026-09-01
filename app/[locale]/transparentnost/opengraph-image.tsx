import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { formatCents } from "@/lib/money";
import { routing, type Locale } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Santamore";

// Shareable ledger card with the live running totals (brief §11).
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale)
    ? rawLocale
    : routing.defaultLocale;

  let received = 0;
  let disbursed = 0;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createSupabaseClient(url, anonKey);
      const { data } = await supabase
        .from("v_public_ledger_summary")
        .select("received_cents, disbursed_cents")
        .single();
      if (data) {
        received = data.received_cents;
        disbursed = data.disbursed_cents;
      }
    } catch {
      // brand-only card
    }
  }

  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const labels =
    locale === "en"
      ? { received: "Donations received", disbursed: "Paid to beneficiaries" }
      : locale === "ru"
        ? { received: "Получено пожертвований", disbursed: "Выплачено получателям" }
        : { received: "Donacije primljene", disbursed: "Isplaćeno korisnicima" };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0E3A46",
          color: "#FFFFFF",
          padding: "72px 88px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#F35353",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          SANTAMORE
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
          <div style={{ display: "flex", fontSize: 40, color: "rgba(255,255,255,0.75)" }}>
            {labels.received}
          </div>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 700, lineHeight: 1.1 }}>
            {money(received)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          <div style={{ display: "flex", fontSize: 40, color: "rgba(255,255,255,0.75)" }}>
            {labels.disbursed}
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#F35353" }}>
            {money(disbursed)}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
