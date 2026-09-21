import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { isStaffRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** My profile: the record behind the account, and where the access level shows. */
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tAdmin] = await Promise.all([getTranslations("dashboard"), getTranslations("admin")]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, locale, role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "member";
  const lang = routing.locales.includes(profile?.locale as Locale) ? (profile?.locale as Locale) : (locale as Locale);

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("profileTitle")}</h1>
      <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-black/60">{t("profileHint")}</p>
      <div className="mt-5">
        <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} locale={lang} email={user.email ?? null} />
      </div>
      <section className="mt-6 max-w-md rounded-lg bg-mist px-5 py-4 text-[14.5px]">
        <p className="text-[13.5px] font-semibold">{tAdmin("memberAccess")}</p>
        <p className="mt-1">{tAdmin(`memberRole.${role}`)}</p>
        <p className="mt-1 text-[13.5px] text-black/60">{tAdmin(`memberAccessHint.${role}`)}</p>
        {isStaffRole(role) ? (
          <p className="mt-3">
            <Link href="/admin" className="font-semibold text-sea underline underline-offset-2">{t("profileAdminLink")} →</Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
