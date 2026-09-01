import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { landingContent } from "@/content/site/landing";
import { formatCents } from "@/lib/money";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

async function fetchLanding() {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const [summary, events, board, chapters, gallery] = await Promise.all([
      supabase.from("v_public_ledger_summary").select("received_cents").single(),
      supabase
        .from("v_public_events")
        .select("slug, name, starts_at")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(1),
      supabase
        .from("v_leaderboard")
        .select("slug, title, raised_cents")
        .order("rank", { ascending: true })
        .limit(5),
      supabase.from("v_chapter_totals").select("name, slug, raised_cents"),
      supabase
        .from("v_public_gallery")
        .select("id, storage_path, caption")
        .order("sort_order", { ascending: true })
        .limit(8),
    ]);
    return {
      receivedCents: summary.data?.received_cents ?? 0,
      nextEvent: events.data?.[0] ?? null,
      board: board.data ?? [],
      chapters: chapters.data ?? [],
      gallery: gallery.data ?? [],
    };
  } catch {
    return {
      receivedCents: 0,
      nextEvent: null,
      board: [],
      chapters: [],
      gallery: [],
    };
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tLb, tEvents] = await Promise.all([
    getTranslations("home"),
    getTranslations("leaderboard"),
    getTranslations("events"),
  ]);
  const content = landingContent[locale as Locale];
  const { receivedCents, nextEvent, board, chapters, gallery } = await fetchLanding();

  const money = (cents: number) =>
    formatCents(cents, locale as Locale, { trimWholeCents: true });
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const daysToEvent = nextEvent
    ? Math.max(
        0,
        Math.ceil((new Date(nextEvent.starts_at).getTime() - Date.now()) / 86_400_000),
      )
    : null;

  const eyebrowClass = "font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20">
      {/* 1 — hero with the live total */}
      <section className="py-16 sm:py-24">
        <p className={eyebrowClass}>{t("eyebrow")}</p>
        <h1 className="type-display mt-3 max-w-3xl text-4xl leading-[1.08] sm:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink/70">
          {t("sub")}
        </p>
        <p className="mt-6 font-mono text-[13px] text-sea">
          <span className="type-display text-3xl tabular-nums">{money(receivedCents)}</span>{" "}
          {t("liveTotal")}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/podrzi"
            className="rounded-xl bg-red px-6 py-3.5 text-[15.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
          >
            {t("ctaDonate")}
          </Link>
          {nextEvent ? (
            <Link
              href={`/dogadjaji/${nextEvent.slug}`}
              className="rounded-xl border-[1.5px] border-line px-6 py-3.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
            >
              {t("ctaRegister")}
            </Link>
          ) : null}
        </div>
        <p className="mt-8 max-w-xl rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[12px] text-sea">
          {t("heroPhotoNote")}
        </p>
      </section>

      {/* 2 — last year: the only honest track-record claim */}
      <section className="grid gap-6 border-t border-line-soft py-12 sm:grid-cols-3">
        {content.triad.map((item) => (
          <div key={item.big}>
            <p className="type-display text-5xl text-red">{item.big}</p>
            <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-ink/70">
              {item.label}
            </p>
          </div>
        ))}
      </section>

      {/* 3 — how it works */}
      <section className="border-t border-line-soft py-12">
        <p className={eyebrowClass}>{t("howHeading")}</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          {content.steps.map((step, index) => (
            <div key={step.title} className="rounded-brand border-[1.5px] border-line px-5 py-4">
              <span className="font-mono text-[11px] text-red">0{index + 1}</span>
              <p className="type-display mt-1 text-xl">{step.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink/65">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — next event with countdown */}
      {nextEvent ? (
        <section className="border-t border-line-soft py-12">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-brand bg-sea px-6 py-6 text-paper">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper/70">
                {t("nextEvent")}
              </p>
              <p className="type-display mt-1 text-2xl">{nextEvent.name}</p>
              <p className="mt-1 text-[13px] text-paper/75">
                {dateFormat.format(new Date(nextEvent.starts_at))}
                {daysToEvent !== null ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-mono tabular-nums">
                      {t("countdown", { count: daysToEvent })}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <Link
              href={`/dogadjaji/${nextEvent.slug}/prijava`}
              className="rounded-xl bg-red px-6 py-3.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
            >
              {tEvents("registerCta")}
            </Link>
          </div>
        </section>
      ) : null}

      {/* 5 — the two funds, four lines, → ledger */}
      <section className="border-t border-line-soft py-12">
        <p className={eyebrowClass}>{t("fundsHeading")}</p>
        <ul className="mt-4 max-w-2xl space-y-2">
          {content.funds.map((line) => (
            <li key={line} className="flex gap-2.5 text-[14.5px] leading-relaxed">
              <span aria-hidden className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-red" />
              {line}
            </li>
          ))}
        </ul>
        <Link
          href="/transparentnost"
          className="mt-4 inline-block text-[13.5px] font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
        >
          {content.fundsCta}
        </Link>
      </section>

      {/* 6 — live leaderboard preview */}
      {board.length > 0 ? (
        <section className="border-t border-line-soft py-12">
          <p className={eyebrowClass}>{tLb("title")}</p>
          <div className="max-w-xl">
            <LeaderboardList
              locale={locale as Locale}
              entries={board.map(
                (row): LeaderboardEntry => ({
                  slug: row.slug,
                  title: row.title,
                  raisedCents: row.raised_cents,
                  href: `/f/${row.slug}`,
                }),
              )}
            />
          </div>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-xl border-[1.5px] border-line px-5 py-3 text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea"
          >
            {tLb("cta")}
          </Link>
        </section>
      ) : null}

      {/* 7 — gallery strip (renders once photos with consent exist) */}
      {gallery.length > 0 ? (
        <section className="border-t border-line-soft py-12">
          <p className={eyebrowClass}>{t("galleryHeading")}</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {gallery.map((item) => {
              const src = galleryImageUrl(item.storage_path);
              if (!src) return null;
              return (
                <Image
                  key={item.id}
                  src={src}
                  alt={item.caption ?? ""}
                  width={280}
                  height={200}
                  className="h-[180px] w-[250px] shrink-0 rounded-brand border-[1.5px] border-line object-cover"
                />
              );
            })}
          </div>
          <Link
            href="/galerija"
            className="mt-3 inline-block text-[13.5px] font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
          >
            {t("galleryCta")}
          </Link>
        </section>
      ) : null}

      {/* 8 — chapters */}
      {chapters.length > 0 ? (
        <section className="border-t border-line-soft py-12">
          <p className={eyebrowClass}>{t("chaptersHeading")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {chapters.map((chapter) => (
              <div
                key={chapter.slug}
                className="rounded-brand border-[1.5px] border-line px-5 py-3.5"
              >
                <p className="text-[14.5px] font-semibold">{chapter.name}</p>
                <p className="mt-0.5 font-mono text-[12.5px] tabular-nums text-sea">
                  {money(chapter.raised_cents)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 9 — partner wall (placeholder until real, consented logos exist) */}
      <section className="border-t border-line-soft py-12">
        <p className={eyebrowClass}>{t("partnersHeading")}</p>
        <p className="mt-4 max-w-xl rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[12.5px] text-sea">
          {t("partnersNote")}
        </p>
        <Link
          href="/partneri"
          className="mt-3 inline-block text-[13.5px] font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
        >
          {t("partnersCta")}
        </Link>
      </section>

      {/* 10 — beneficiary story (needs a real story with consent) */}
      <section className="border-t border-line-soft py-12">
        <p className={eyebrowClass}>{t("storyHeading")}</p>
        <p className="mt-4 max-w-xl rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[12.5px] text-sea">
          {t("storyNote")}
        </p>
      </section>

      {/* 11 — newsletter + monthly donor club */}
      <section className="border-t border-line-soft py-12">
        <p className={eyebrowClass}>{t("newsletterHeading")}</p>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink/70">
          {t("newsletterSub")}
        </p>
        <div className="mt-4">
          <InboundForm kind="newsletter" compact />
        </div>
      </section>
    </div>
  );
}
