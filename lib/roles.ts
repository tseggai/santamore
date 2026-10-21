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
 *   director     the Executive Director: everything an editor has, plus the
 *                leadership documents (pay and staffing); access levels,
 *                deletes and the switches stay with the admin
 *   admin        everything
 *
 * This is the access level only. A person's role on the team (officer,
 * board, chapter lead…) and their participation (fundraiser, athlete,
 * donor…) are other things — see docs/ROLES.md.
 */
export const ROLES = ["member", "accounting", "chapter_lead", "director", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Roles that get through the console gate and the is_staff() policies. */
export const STAFF_ROLES: readonly Role[] = ["accounting", "chapter_lead", "director", "admin"];

export function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(role as Role);
}

/** The leadership: the Executive Director and the administrators, who alone read the documents that carry pay figures (is_leadership() in the database). */
export const LEADERSHIP_ROLES: readonly Role[] = ["director", "admin"];

export function isLeadershipRole(role: string | null | undefined): boolean {
  return LEADERSHIP_ROLES.includes(role as Role);
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
  "/admin/dokumenti": "navDocuments",
};

/**
 * Console sections by role: the nav shows these, the pages check nothing more
 * (RLS does). "/admin/dokumenti/paket" is not a nav entry: it says who may
 * open the forms and drafts for editing (accounting reads the documents only).
 */
export const SECTIONS_BY_ROLE: Record<Role, readonly string[]> = {
  member: [],
  accounting: ["/admin", "/admin/novac", "/admin/podrska", "/admin/dokumenti"],
  chapter_lead: ["/admin", "/admin/novac", "/admin/kampanje", "/admin/dogadjaji", "/admin/korisnici", "/admin/podrska", "/admin/stranice", "/admin/osoblje", "/admin/poruke", "/admin/podesavanja", "/admin/dokumenti", "/admin/dokumenti/paket"],
  director: ["/admin", "/admin/novac", "/admin/kampanje", "/admin/dogadjaji", "/admin/korisnici", "/admin/podrska", "/admin/stranice", "/admin/osoblje", "/admin/poruke", "/admin/podesavanja", "/admin/dokumenti", "/admin/dokumenti/paket"],
  admin: ["/admin", "/admin/novac", "/admin/kampanje", "/admin/dogadjaji", "/admin/korisnici", "/admin/podrska", "/admin/stranice", "/admin/osoblje", "/admin/poruke", "/admin/podesavanja", "/admin/dokumenti", "/admin/dokumenti/paket"],
};
