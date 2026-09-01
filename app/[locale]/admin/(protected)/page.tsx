import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

const SECTIONS = [
  { href: "/admin/donacije", key: "donationsLink" },
  { href: "/admin/prijave", key: "registrationsLink" },
  { href: "/admin/prikupljaci", key: "fundraisersLink" },
  { href: "/admin/isplate", key: "disbursementsLink" },
  { href: "/admin/sadrzaj", key: "contentLink" },
] as const;

export default async function AdminIndexPage() {
  const t = await getTranslations("admin");

  return (
    <div className="py-8">
      <ul className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block rounded-xl border-[1.5px] border-line px-5 py-3.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
            >
              {t(section.key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
