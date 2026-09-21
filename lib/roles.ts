/**
 * Access levels on a profile (migration 0061). The database enforces them
 * through is_staff() and is_admin(); these helpers keep the app's own
 * checks and the console navigation in step with it.
 *
 *   member       runs pages, joins teams and events; no console
 *   accounting   the Money section and the supporters behind it
 *   chapter_lead staff: everything in the console except access levels,
 *                deletes and the switches under Settings
 *   admin        everything
 */
export const ROLES = ["member", "accounting", "chapter_lead", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Roles that get through the console gate and the is_staff() policies. */
export const STAFF_ROLES: readonly Role[] = ["accounting", "chapter_lead", "admin"];

export function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(role as Role);
}

/** Console sections by role: the nav shows these, the pages check nothing more (RLS does). */
export const SECTIONS_BY_ROLE: Record<Role, readonly string[]> = {
  member: [],
  accounting: ["/admin", "/admin/novac", "/admin/podrska"],
  chapter_lead: ["/admin", "/admin/novac", "/admin/kampanje", "/admin/dogadjaji", "/admin/korisnici", "/admin/podrska", "/admin/stranice", "/admin/osoblje", "/admin/poruke", "/admin/podesavanja", "/admin/registracija"],
  admin: ["/admin", "/admin/novac", "/admin/kampanje", "/admin/dogadjaji", "/admin/korisnici", "/admin/podrska", "/admin/stranice", "/admin/osoblje", "/admin/poruke", "/admin/podesavanja", "/admin/registracija"],
};
