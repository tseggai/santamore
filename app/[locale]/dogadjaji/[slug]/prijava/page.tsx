import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/admin/SignInForm";
import { RegistrationForm, type TierOption } from "@/components/events/RegistrationForm";
import { SepaPanel } from "@/components/donate/SepaPanel";
import { getOrgBankDetails } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Tier {
  label: string;
  amount_cents: number;
}

function parseTiers(value: unknown): Tier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    typeof entry?.label === "string" &&
    typeof entry?.amount_cents === "number" &&
    Number.isInteger(entry.amount_cents)
      ? [{ label: entry.label, amount_cents: entry.amount_cents }]
      : [],
  );
}

export default async function EventRegistrationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("events");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("v_public_events")
    .select("id, slug, name, distances, price_tiers")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
          {event.name}
        </p>
        <h1 className="type-display mt-2 text-3xl">{t("signInTitle")}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink/65">{t("signInSub")}</p>
        <div className="mt-6">
          <SignInForm
            locale={locale as Locale}
            nextPath={`/${locale}/dogadjaji/${event.slug}/prijava`}
            allowSignup
          />
        </div>
      </div>
    );
  }

  const { data: registration } = await supabase
    .from("registrations")
    .select(
      "id, status, distance, shirt_size, tier_label, amount_due_cents, amount_paid_cents, payment_reference",
    )
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (registration) {
    const due = registration.amount_due_cents ?? 0;
    const pendingPayment = registration.status === "pending" && due > 0;
    return (
      <div className="mx-auto max-w-xl px-5 py-14">
        <Link
          href={`/dogadjaji/${event.slug}`}
          className="inline-block text-[12.5px] font-semibold text-sea transition-colors hover:text-sea-2"
        >
          ← {event.name}
        </Link>
        <h1 className="type-display mt-3 text-3xl">
          {registration.status === "confirmed"
            ? t("confirmedTitle")
            : t("registeredTitle")}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
          {registration.distance ? <>{registration.distance} · </> : null}
          {registration.tier_label}
          {registration.shirt_size ? <> · {registration.shirt_size}</> : null}
        </p>
        {pendingPayment ? (
          <>
            <p className="mt-4 text-[14px] leading-relaxed text-ink/70">
              {t("payInstructions")}
            </p>
            <div className="mt-4">
              <SepaPanel
                locale={locale as Locale}
                bank={getOrgBankDetails()}
                reference={registration.payment_reference ?? ""}
                amountCents={due}
                monthly={false}
              />
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink/60">
              {t("opsNote")}
            </p>
          </>
        ) : (
          <p className="mt-4 rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[13.5px] text-sea">
            {registration.status === "confirmed" ? t("paidNote") : t("noFeeNote")}
          </p>
        )}
      </div>
    );
  }

  const tiers: TierOption[] = parseTiers(event.price_tiers).map((tier) => ({
    label: tier.label,
    amountCents: tier.amount_cents,
  }));

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <Link
        href={`/dogadjaji/${event.slug}`}
        className="inline-block text-[12.5px] font-semibold text-sea transition-colors hover:text-sea-2"
      >
        ← {event.name}
      </Link>
      <h1 className="type-display mt-3 text-3xl">{t("registerTitle")}</h1>
      <div className="mt-6">
        <RegistrationForm
          eventSlug={event.slug}
          distances={Array.isArray(event.distances) ? (event.distances as string[]) : []}
          tiers={tiers}
        />
      </div>
    </div>
  );
}
