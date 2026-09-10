import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PagePicker, type PickerPage } from "@/components/dashboard/PagePicker";
import { ShareToolkit } from "@/components/dashboard/ShareToolkit";
import { myPages } from "@/lib/dashboard/pages";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function ShareToolsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale }, { page: pageParam }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const pages = await myPages(user.id);
  const current = pages.find((page) => page.slug === pageParam) ?? pages[0] ?? null;

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("shareTools")}</h1>
      {!current ? (
        <p className="mt-3 text-[14px] text-ink/65">
          {t("pagesEmpty")}{" "}
          <Link href="/dashboard/stranice" className="font-semibold text-sea underline underline-offset-2">
            {t("qaNewPage")}
          </Link>
        </p>
      ) : (
        <>
          <PagePicker pages={pages as PickerPage[]} current={current.slug} />
          {current.status !== "active" ? (
            <p className="mt-4 rounded-[11px] border-[1.5px] border-dashed border-red bg-red/5 px-4 py-3 text-[13.5px] text-red-dark">
              {t("shareDraftWarning")}{" "}
              <Link href={`/dashboard/stranice/${current.slug}`} className="font-semibold underline underline-offset-2">
                {t("editPage")}
              </Link>
            </p>
          ) : null}
          <div className="mt-5">
            <ShareToolkit
              title={current.title}
              pagePath={`/${locale}/f/${current.slug}`}
              imagePath={`/${locale}/f/${current.slug}/opengraph-image`}
              siteOrigin={(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}
            />
          </div>
        </>
      )}
    </div>
  );
}
