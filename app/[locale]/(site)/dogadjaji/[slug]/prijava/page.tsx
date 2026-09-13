import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/admin/SignInForm";
import { SepaPanel } from "@/components/donate/SepaPanel";
import { RegistrationForm, type TierOption } from "@/components/events/RegistrationForm";
import { parseTiers } from "@/lib/events";
import { getOrgBankDetails } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface RegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  distance: string | null;
  shirt_size: string | null;
  tier_label: string | null;
  amount_due_cents: number;
  payment_reference: string | null;
  participant_name: string | null;
}

/**
 * Register for an event. One account can hold several registrations (a
 * child, a partner, a friend): existing ones are listed with what is left
 * to pay, and "?nova=1" opens the form for another person.
 */
export default async function EventRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ nova?: string }>;
}) {
  const [{ locale, slug }, { nova }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("events");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("v_public_events")
    .select("id, slug, name, kind, distances, price_tiers, offers_shirts")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-14">
        <p className="type-eyebrow text-sea/80">{event.name}</p>
        <h1 className="type-display mt-2 text-3xl">{t("signInTitle")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("signInSub")}</p>
        <div className="mt-6">
          <SignInForm locale={locale as Locale} nextPath={`/${locale}/dogadjaji/${event.slug}/prijava`} allowSignup />
        </div>
      </div>
    );
  }

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, status, distance, shirt_size, tier_label, amount_due_cents, payment_reference, participant_name")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const registrations = (rows ?? []) as RegistrationRow[];
  const showForm = registrations.length === 0 || nova === "1";

  const back = (
    <Link href={`/dogadjaji/${event.slug}`} className="inline-block text-[14px] font-semibold text-sea transition-colors hover:text-sea-2">
      ← {event.name}
    </Link>
  );

  if (!showForm) {
    return (
      <div className="mx-auto max-w-xl px-5 py-14">
        {back}
        <h1 className="type-display mt-3 text-3xl">
          {registrations.every((r) => r.status === "confirmed") ? t("confirmedTitle") : t("registeredTitle")}
        </h1>
        <ul className="mt-6 space-y-4">
          {registrations.map((registration) => {
            const due = registration.amount_due_cents ?? 0;
            const pendingPayment = registration.status === "pending" && due > 0;
            return (
              <li key={registration.id} className="rounded-lg bg-mist p-4 sm:p-5">
                <p className="text-[16px] font-bold">{registration.participant_name ?? profile?.full_name ?? user.email}</p>
                <p className="mt-0.5 text-[14.5px] text-black/65">
                  {[registration.distance, registration.tier_label, registration.shirt_size].filter(Boolean).join(" · ")}
                </p>
                {pendingPayment ? (
                  <>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-black/70">{t("payInstructions")}</p>
                    <div className="mt-3">
                      <SepaPanel locale={locale as Locale} bank={getOrgBankDetails()} reference={registration.payment_reference ?? ""} amountCents={due} monthly={false} />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 rounded-lg bg-paper px-4 py-3 text-[14.5px] text-sea">
                    {registration.status === "confirmed" ? t("paidNote") : t("noFeeNote")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[13.5px] leading-relaxed text-black/60">{t("opsNote")}</p>
        <Link
          href={`/dogadjaji/${event.slug}/prijava?nova=1`}
          className="mt-6 inline-flex rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90"
        >
          {t("registerAnother")}
        </Link>
      </div>
    );
  }

  const tiers: TierOption[] = parseTiers(event.price_tiers).map((tier) => ({ label: tier.label, amountCents: tier.amount_cents }));

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      {registrations.length > 0 ? (
        <Link href={`/dogadjaji/${event.slug}/prijava`} className="inline-block text-[14px] font-semibold text-sea transition-colors hover:text-sea-2">
          ← {t("yourRegistrations")}
        </Link>
      ) : (
        back
      )}
      <h1 className="type-display mt-3 text-3xl">{registrations.length > 0 ? t("registerAnother") : t("registerTitle")}</h1>
      <div className="mt-6">
        <RegistrationForm
          eventSlug={event.slug}
          kind={(event.kind as "race" | "challenge" | "social") ?? "race"}
          distances={Array.isArray(event.distances) ? (event.distances as string[]) : []}
          tiers={tiers}
          offersShirts={Boolean(event.offers_shirts)}
          defaultName={registrations.length > 0 ? "" : (profile?.full_name ?? "")}
          defaultEmail={registrations.length > 0 ? "" : (user.email ?? "")}
        />
      </div>
    </div>
  );
}
