import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const KINDS = ["contact", "volunteer", "partner", "newsletter"] as const;
type Kind = (typeof KINDS)[number];

interface MessageRow {
  id: string;
  kind: Kind;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  locale: string;
  created_at: string;
}

export default async function AdminMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [{ locale }, { kind }] = await Promise.all([params, searchParams]);
  const t = await getTranslations("admin");
  const activeKind = KINDS.includes(kind as Kind) ? (kind as Kind) : null;

  const supabase = await createClient();
  let query = supabase
    .from("inbound_messages")
    .select("id, kind, name, email, phone, message, locale, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (activeKind) query = query.eq("kind", activeKind);
  const { data } = await query;
  const rows = (data ?? []) as MessageRow[];

  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("messagesTitle")}</h1>
      <p className="mt-1 text-[13px] text-ink/60">{t("messagesHint")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[null, ...KINDS].map((kindOption) => {
          const selected = activeKind === kindOption;
          return (
            <Link
              key={kindOption ?? "all"}
              href={kindOption ? `/admin/poruke?kind=${kindOption}` : "/admin/poruke"}
              className={
                selected
                  ? "rounded-full bg-sea px-4 py-1.5 text-[12.5px] font-semibold text-paper"
                  : "rounded-full border-[1.5px] border-line px-4 py-1.5 text-[12.5px] font-semibold text-ink/70 hover:border-sea hover:text-sea"
              }
            >
              {kindOption ? t(`msgKind.${kindOption}`) : t("msgKindAll")}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-[13.5px] text-ink/60">{t("messagesEmpty")}</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-[11px] border-[1.5px] border-line px-3.5 py-2.5 text-[13.5px]"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-full bg-mist px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-sea">
                  {t(`msgKind.${row.kind}`)}
                </span>
                <span className="font-semibold">{row.name ?? "—"}</span>
                {row.email ? (
                  <a
                    href={`mailto:${row.email}`}
                    className="text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
                  >
                    {row.email}
                  </a>
                ) : null}
                {row.phone ? <span className="font-mono">{row.phone}</span> : null}
                <span className="ml-auto font-mono text-[11.5px] tabular-nums text-ink/45">
                  {dateFormat.format(new Date(row.created_at))} · {row.locale}
                </span>
              </div>
              {row.message ? (
                <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-ink/80">
                  {row.message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
