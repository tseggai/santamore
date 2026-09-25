import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import logoWhite from "@/public/brand/SantamoreLogo-White.png";
import amex from "@/public/brand/cards/amex.svg";
import diners from "@/public/brand/cards/diners.svg";
import maestro from "@/public/brand/cards/maestro.svg";
import mastercard from "@/public/brand/cards/mastercard.svg";
import visa from "@/public/brand/cards/visa.svg";

const SITE_LINKS = [
  { href: "/o-nama", key: "about" },
  { href: "/kako-radimo", key: "how" },
  { href: "/dogadjaji", key: "events" },
  { href: "/kampanje", key: "campaigns" },
  { href: "/galerija", key: "gallery" },
  { href: "/transparentnost", key: "ledger" },
  { href: "/podrzi", key: "donate" },
  { href: "/prikupljaci", key: "fundraisers" },
  { href: "/korisnici", key: "beneficiaries" },
  { href: "/partneri", key: "partners" },
  { href: "/vijesti", key: "news" },
  { href: "/cesta-pitanja", key: "faq" },
  { href: "/kontakt", key: "contact" },
] as const;

// The card brands Monri accepts, shown as the acquirer requires (brief §5).
// Logos are the brands' own marks (public/brand/cards), used only to say
// which cards work.
const CARD_BRANDS = [
  { src: visa, name: "Visa", className: "h-4 w-auto" },
  { src: mastercard, name: "Mastercard", className: "h-4 w-auto" },
  { src: maestro, name: "Maestro", className: "h-4 w-auto" },
  // A square mark: taller, or it reads as a dot beside the wordmarks.
  { src: amex, name: "American Express", className: "h-6 w-auto" },
  { src: diners, name: "Diners Club", className: "h-4 w-auto" },
] as const;

// Every legal page the acquirer requires, per docs/BUILD-BRIEF.md §5.
const LEGAL_LINKS = [
  { href: "/pravila-privatnosti", key: "privacy" },
  { href: "/kolacici", key: "cookies" },
  { href: "/uslovi-koriscenja", key: "terms" },
  { href: "/pravila-donacija", key: "donations" },
  { href: "/uslovi-ucesca", key: "eventTerms" },
  { href: "/zastita-djece", key: "safeguarding" },
  { href: "/kodeks", key: "codeOfConduct" },
  { href: "/informacije-o-organizaciji", key: "impressum" },
] as const;

export default function Footer() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");

  return (
    <footer className="bg-sea text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Image src={logoWhite} alt={tc("siteName")} className="h-16 w-auto" />
          <h2 className="mt-5 font-mono text-[12px] uppercase tracking-[0.16em] text-mist/70">
            {t("orgHeading")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-mist/90">
            <li>{t("orgName")}</li>
            <li>{t("orgAddress")}</li>
            <li>{t("orgId")}</li>
          </ul>
          <p className="mt-5 text-[13px] text-mist/60">{t("cards")}</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label={t("cards")}>
            {CARD_BRANDS.map((brand) => (
              <li key={brand.name} className="flex h-8 items-center rounded bg-paper px-2">
                <Image src={brand.src} alt={brand.name} className={brand.className} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-mono text-[12px] uppercase tracking-[0.16em] text-mist/70">
            {t("siteHeading")}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {SITE_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[14px] text-mist/90 hover:text-paper hover:underline"
                >
                  {t(`site.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-mono text-[12px] uppercase tracking-[0.16em] text-mist/70">
            {t("legalHeading")}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[14px] text-mist/90 hover:text-paper hover:underline"
                >
                  {t(`legal.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <LocaleSwitcher variant="dark" direction="up" />
          </div>
        </div>
      </div>
      <div className="border-t border-paper/20">
        <p className="mx-auto max-w-6xl px-5 py-5 text-[13.5px] text-mist/80">
          {t("note")}
        </p>
      </div>
    </footer>
  );
}
