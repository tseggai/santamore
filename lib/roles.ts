/**
 * Access levels on a profile (migration 0061). The database enforces them
 * through is_staff() and is_admin(); these helpers keep the app's own
 * checks and the console navigation in step with it.
 *
 *   member       "None": runs pages, joins teams and events; no console
 *   accounting   the Money section and the supporters behind it
 *   chapter_lead "Editor": everything in the console except access levels,
 *                deletes and the switches under Settings (the value is
 *                historical; the label is Editor, a chapter lead is a team role)
 *   admin        everything
 *
 * This is the access level only. A person's role on the team (officer,
 * board, chapter lead…) and their participation (fundraiser, athlete,
 * donor…) are other things — see docs/ROLES.md.
 */
export const ROLES = ["member", "accounting", "chapter_lead", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Roles that get through the console gate and the is_staff() policies. */
export const STAFF_ROLES: readonly Role[] = ["accounting", "chapter_lead", "admin"];

export function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(role as Role);
}

/** The nav label (admin namespace) of each console section, for summaries of what a level opens. */
export const SECTION_NAV_KEY: Record<string, string> = {
  "/admin": "navOverview",
  "/admin/novac": "navMoney",
  "/admin/kampanje": "navCampaigns",
  "/admin/dogadjaji": "navEvents",
  "/admin/korisnici": "navBeneficiaries",
  "/admin/podrska": "navSupporters",
  "/admin/stranice": "navPages",
  "/admin/osoblje": "navStaff",
  "/admin/poruke": "navMessages",
  "/admin/podesavanja": "navSettings",
  "/admin/registracija": "navRegistration",
  "/admin/pravila": "navRules",
};

/** Console sections by role: the nav shows these, the pages check nothing more (RLS does). */
export const SECTIONS_BY_ROLE: Record<Role, readonly string[]> = {
  member: [],
  accounting: ["/admin", "/admin/novac", "/admin/podrska", "/admin/pravila"],
  chapter_lead: ["/admin", "/admin/novac", "/admin/kampanje", "/admin/dogadjaji", "/admin/korisnici", "/admin/podrska", "/admin/stranice", "/admin/osoblje", "/admin/poruke", "/admin/podesavanja", "/admin/registracija", "/admin/pravila"],
  admin: ["/admin", "/admin/novac", "/admin/kampanje", "/admin/dogadjaji", "/admin/korisnici", "/admin/podrska", "/admin/stranice", "/admin/osoblje", "/admin/poruke", "/admin/podesavanja", "/admin/registracija", "/admin/pravila"],
};
