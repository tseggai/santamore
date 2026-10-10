"use client";

import { useTranslations } from "next-intl";

import { SECTIONS_BY_ROLE, SECTION_NAV_KEY, type Role } from "@/lib/roles";

/**
 * What an access level opens, in the console's own words: the level, then
 * the sections it can manage, read from the same table the nav uses
 * (lib/roles.ts) so the two can never disagree. Admin adds the things only
 * an admin may do; None says what a member does instead.
 */
export function AccessSummary({ role, className = "" }: { role: Role; className?: string }) {
  const t = useTranslations("admin");
  const sections = SECTIONS_BY_ROLE[role].map((href) => t(SECTION_NAV_KEY[href] ?? "navOverview"));
  return (
    <span className={`block text-[13px] leading-relaxed text-black/60 ${className}`}>
      {role === "member" ? (
        t("memberAccessHint.member")
      ) : (
        <>
          {t("accessSections", { sections: sections.join(", ") })}
          {role === "admin" ? <>, {t("accessAdminExtra")}</> : null}.
        </>
      )}
    </span>
  );
}
