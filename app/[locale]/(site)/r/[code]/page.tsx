import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RedeemForm } from "@/components/perks/RedeemForm";
import { QrImage } from "@/components/QrImage";
import { ShareButton } from "@/components/ShareButton";
import { siteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface AwardRow {
  code: string;
  status: "issued" | "redeemed" | "revoked" | "expired";
  awarded_on: string;
  expires_at: string;
  redeemed_at: string | null;
  challenge_slug: string;
  challenge_title: string;
  partner_name: string;
  reward_label: string;
  participant_name: string | null;
}

async function fetchAward(code: string): Promise<AwardRow | null> {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(clean)) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_perk_award")
      .select("*")
      .eq("code", clean)
      .maybeSingle();
    return (data as AwardRow | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * One award, reachable by its code: the athlete opens it on their phone
 * and shows the QR; the partner scans it, lands on this same page and
 * redeems with their PIN. It shows the award — never the Strava activity.
 */
export default async function AwardPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tDonate] = await Promise.all([getTranslations("perks"), getTranslations("donate")]);

  const award = await fetchAward(code);
  if (!award) notFound();

  const url = `${siteOrigin()}/${locale}/r/${award.code}`;
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const tone =
    award.status === "issued"
      ? "bg-sea text-paper"
      : award.status === "redeemed"
        ? "bg-mist text-sea"
        : "bg-red/10 text-red-dark";

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-black/60">
        {award.partner_name}
      </p>
      <h1 className="type-display mt-1 text-3xl">{award.reward_label}</h1>
      <p className="mt-2 text-[15px] text-black/70">
        {t("awardFor", { name: award.participant_name ?? t("someone") })} ·{" "}
        <Link
          href={`/izazovi/${award.challenge_slug}`}
          className="font-semibold text-black underline decoration-black/30 underline-offset-[3px]"
        >
          {award.challenge_title}
        </Link>
      </p>

      <div className="mt-5 flex flex-col items-center rounded-brand border-[1.5px] border-line p-5">
        <span className={`rounded-full px-3 py-1 font-mono text-[12px] uppercase tracking-[0.14em] ${tone}`}>
          {t(`awardStatus.${award.status}`)}
        </span>
        <div className="mt-4">
          <QrImage value={url} alt={t("qrAlt")} size={220} />
        </div>
        <p className="mt-3 font-mono text-[23px] tracking-[0.2em]">{award.code}</p>
        <p className="mt-2 text-center text-[13.5px] text-black/60">
          {t("earnedOn", { date: dateFormat.format(new Date(award.awarded_on)) })}
          {" · "}
          {award.status === "redeemed" && award.redeemed_at
            ? t("redeemedOn", { date: dateFormat.format(new Date(award.redeemed_at)) })
            : t("validUntil", { date: dateFormat.format(new Date(award.expires_at)) })}
        </p>
      </div>

      {award.status === "issued" ? (
        <div className="mt-4">
          <RedeemForm code={award.code} />
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <ShareButton
          title={`${award.reward_label} · ${award.partner_name}`}
          path={`/${locale}/r/${award.code}`}
          label={t("shareAward")}
          copiedLabel={tDonate("copied")}
          variant="ghost"
        />
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-black/50">{t("awardNote")}</p>
    </div>
  );
}
