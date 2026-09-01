import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import logoWhite from "@/public/brand/SantamoreLogo-White.png";

const SITE_LINKS = [
  { href: "/o-nama", key: "about" },
  { href: "/kako-radimo", key: "how" },
  { href: "/dogadjaji", key: "events" },
  { href: "/galerija", key: "gallery" },
  { href: "/transparentnost", key: "ledger" },
  { href: "/podrzi", key: "donate" },
  { href: "/prikupljaci", key: "fundraisers" },
  { href: "/partneri", key: "partners" },
  { href: "/vijesti", key: "news" },
  { href: "/cesta-pitanja", key: "faq" },
  { href: "/kontakt", key: "contact" },
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
          <Image src={logoWhite} alt={tc("siteName")} className="h-9 w-auto" />
          <h2 className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-mist/70">
            {t("orgHeading")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-mist/90">
            <li>{t("orgName")}</li>
            <li>{t("orgAddress")}</li>
            <li>{t("orgId")}</li>
            <li className="font-mono">{t("iban")}</li>
            <li>{t("email")}</li>
            <li className="pt-2 text-mist/60">{t("cards")}</li>
          </ul>
        </div>

        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mist/70">
            {t("siteHeading")}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {SITE_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[13px] text-mist/90 hover:text-paper hover:underline"
                >
                  {t(`site.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mist/70">
            {t("legalHeading")}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[13px] text-mist/90 hover:text-paper hover:underline"
                >
                  {t(`legal.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <LocaleSwitcher />
          </div>
        </div>
      </div>
      <div className="border-t border-paper/20">
        <p className="mx-auto max-w-6xl px-5 py-5 text-[12.5px] text-mist/80">
          {t("note")}
        </p>
      </div>
    </footer>
  );
}
