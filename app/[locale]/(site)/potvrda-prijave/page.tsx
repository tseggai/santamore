import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { confirmSignIn } from "./actions";
import { otpType } from "@/lib/auth-otp";
import { safeNextPath } from "@/lib/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Where the link meant to land: its own `next`, or the one inside Supabase's redirect_to. Internal paths only. */
function targetPath(next: string | undefined, redirectTo: string | undefined, fallback: string): string {
  const direct = safeNextPath(next, "");
  if (direct) return direct;
  if (redirectTo) {
    try {
      const url = new URL(redirectTo);
      const inner = safeNextPath(url.searchParams.get("next"), "");
      if (inner) return inner;
      if (!url.pathname.startsWith("/api/")) return safeNextPath(`${url.pathname}${url.search}`, fallback);
    } catch {
      // Not a URL: ignore it.
    }
  }
  return fallback;
}

/**
 * The page the sign-in email links to. It spends nothing on load: a mail
 * scanner or a link preview that opens it leaves the token intact, and the
 * person signs in by pressing the button (see actions.ts). The Supabase
 * "Magic Link" template must point here with {{ .TokenHash }}; docs/DEPLOY.md
 * has the template.
 */
export default async function ConfirmSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string; redirect_to?: string; error?: string }>;
}) {
  const [{ locale: routeLocale }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, routeLocale)) notFound();
  // The template links to one locale; the person's own is in the path the link lands on.
  const next = targetPath(query.next, query.redirect_to, `/${routeLocale}/dashboard`);
  const nextLocale = next.split("/")[1];
  const locale = hasLocale(routing.locales, nextLocale) ? nextLocale : routeLocale;
  // Same page under the person's own locale, so the header matches the text. A redirect spends nothing.
  if (locale !== routeLocale) {
    const same = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    redirect(`/${locale}/potvrda-prijave?${same.toString()}`);
  }
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });
  const signIn = next.includes("/admin") ? "/admin/prijava" : "/dashboard/prijava";
  const tokenHash = query.token_hash?.trim() ?? "";
  const failed = query.error === "1";

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <p className="type-eyebrow text-sea/80">Santamore</p>
      <h1 className="type-display mt-2 text-3xl">{t("confirmTitle")}</h1>
      {failed || !tokenHash ? (
        <>
          <p role="alert" className="mt-4 rounded-lg bg-mist px-5 py-4 text-[15px] leading-relaxed text-red-dark">
            {failed ? t("confirmFailed") : t("confirmMissing")}
          </p>
          <Link href={signIn} locale={locale} className="mt-5 inline-flex rounded-lg bg-sea px-6 py-3 text-[15px] font-bold text-paper transition-colors hover:bg-sea-2">
            {t("confirmAgain")}
          </Link>
        </>
      ) : (
        <form action={confirmSignIn} className="mt-4">
          <p className="text-[15px] leading-relaxed text-black/65">{t("confirmSub")}</p>
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={otpType(query.type)} />
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="mt-5 w-full rounded-lg bg-sea px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-sea-2">
            {t("confirmButton")}
          </button>
        </form>
      )}
    </div>
  );
}
