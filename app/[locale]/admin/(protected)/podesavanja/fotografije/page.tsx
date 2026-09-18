import { getTranslations, setRequestLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

interface GalleryRow {
  event_id: string | null;
  campaign_id: string | null;
  is_published: boolean;
}

/**
 * Every photo set at a glance. Photos belong to an event or a cause, so
 * each row opens the owner's editor, where the gallery tool lives.
 */
export default async function SettingsPhotosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: items }, { data: events }, { data: campaigns }] = await Promise.all([
    supabase.from("gallery_items").select("event_id, campaign_id, is_published").limit(10_000),
    supabase.from("events").select("id, name, starts_at").order("starts_at", { ascending: false }).limit(500),
    supabase.from("campaigns").select("id, title, starts_at").order("starts_at", { ascending: false }).limit(500),
  ]);
  const counts = new Map<string, { total: number; published: number }>();
  let loose = 0;
  for (const item of (items ?? []) as GalleryRow[]) {
    const key = item.event_id ? `e:${item.event_id}` : item.campaign_id ? `c:${item.campaign_id}` : null;
    if (!key) {
      loose += 1;
      continue;
    }
    const prev = counts.get(key) ?? { total: 0, published: 0 };
    counts.set(key, { total: prev.total + 1, published: prev.published + (item.is_published ? 1 : 0) });
  }
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const rows = [
    ...((events ?? []) as { id: string; name: string; starts_at: string | null }[]).map((e) => ({
      key: `e:${e.id}`,
      name: e.name,
      kind: t("photosKindEvent"),
      when: e.starts_at ? dateFormat.format(new Date(e.starts_at)) : "—",
      href: `/admin/dogadjaji?uredi=${e.id}`,
    })),
    ...((campaigns ?? []) as { id: string; title: string; starts_at: string | null }[]).map((c) => ({
      key: `c:${c.id}`,
      name: c.title,
      kind: t("photosKindCause"),
      when: c.starts_at ? dateFormat.format(new Date(c.starts_at)) : "—",
      href: `/admin/kampanje?uredi=${c.id}`,
    })),
  ].map((row) => ({ ...row, ...(counts.get(row.key) ?? { total: 0, published: 0 }) }));
  const withPhotos = rows.filter((row) => row.total > 0);
  const without = rows.filter((row) => row.total === 0);

  const list = (items: typeof rows) => (
    <ul className="overflow-hidden rounded-lg bg-mist">
      {items.map((row) => (
        <li key={row.key} className="border-t-[0.5px] border-line first:border-t-0">
          <Link href={row.href} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
            <span className="font-semibold">{row.name}</span>
            <span className="text-black/55">{row.kind} · {row.when}</span>
            <span className="ml-auto font-mono text-[13.5px] tabular-nums text-black/70">
              {row.total > 0 ? t("photosCount", { total: row.total, published: row.published }) : t("photosNone")}
            </span>
            <span className="text-[14px] font-semibold text-sea">{t("photosManage")} →</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="pb-8">
      <p className="text-[14px] leading-relaxed text-black/60">{t("photosHint")}</p>
      {loose > 0 ? <p className="mt-2 text-[14px] font-semibold text-red-dark">{t("photosLoose", { count: loose })}</p> : null}
      {withPhotos.length > 0 ? (
        <>
          <h2 className="mt-5 text-[15px] font-bold">{t("photosWith")}</h2>
          <div className="mt-2">{list(withPhotos)}</div>
        </>
      ) : null}
      {without.length > 0 ? (
        <>
          <h2 className="mt-6 text-[15px] font-bold">{t("photosWithout")}</h2>
          <div className="mt-2">{list(without)}</div>
        </>
      ) : null}
    </div>
  );
}
