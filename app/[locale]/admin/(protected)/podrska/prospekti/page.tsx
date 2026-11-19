import { setRequestLocale } from "next-intl/server";

import { ProspectsManager } from "@/components/admin/ProspectsManager";
import { PROSPECT_COLUMNS, SPONSORSHIP_PDF_PATH, type ProspectActivityRow, type ProspectRow } from "@/lib/prospects";
import { catalogueFacets } from "@/lib/server/prospect-catalogue";
import { siteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Prospects: the organisations we ask for support (a sponsor, help in kind,
 * a partner, the media, a funder) and where each ask stands. The list is
 * developed from the researched catalogue by criteria, or added to by hand;
 * a message opens in the sender's own WhatsApp, mail app or Instagram and
 * is logged here with its follow-up date.
 */
export default async function AdminProspectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: prospects }, { data: activities }, { data: profile }] = await Promise.all([
    supabase.from("prospects").select(PROSPECT_COLUMNS).order("created_at", { ascending: false }).limit(2000),
    supabase.from("prospect_activities").select("id, prospect_id, kind, channel, template, lang, body, created_at").order("created_at", { ascending: false }).limit(3000),
    user ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const origin = siteOrigin();
  return (
    <div className="pb-8">
      <ProspectsManager
        locale={locale as Locale}
        prospects={(prospects ?? []) as unknown as ProspectRow[]}
        activities={(activities ?? []) as ProspectActivityRow[]}
        facets={catalogueFacets()}
        sender={(profile as { full_name: string | null } | null)?.full_name?.trim() || "Santamore"}
        today={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Podgorica" }).format(new Date())}
        links={{ pledge: `${origin}/partneri`, site: origin, pdf: `${origin}${SPONSORSHIP_PDF_PATH}` }}
      />
    </div>
  );
}
