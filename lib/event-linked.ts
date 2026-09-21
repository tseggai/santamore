/**
 * The rows behind the counts in the events list, loaded once with the
 * list. Plain data and pure helpers: the server page counts with them,
 * the peek panel lists with them.
 */
export interface EventLinked {
  registrations: LinkedRegistration[];
  rsvps: LinkedRsvp[];
  pages: LinkedPage[];
  teams: LinkedTeam[];
}

export interface LinkedRegistration {
  id: string;
  event_id: string;
  user_id: string | null;
  participant_name: string | null;
  party_of: string | null;
  status: "pending" | "confirmed" | "cancelled";
  tier_label: string | null;
  distance: string | null;
  bib_number: string | null;
  amount_due_cents: number;
  amount_paid_cents: number;
}

export interface LinkedRsvp {
  event_id: string;
  user_id: string;
  name: string;
}

export interface LinkedPage {
  id: string;
  campaign_id: string | null;
  title: string;
  slug: string;
  status: "draft" | "active" | "hidden";
  owner_name: string;
}

export interface LinkedTeam {
  id: string;
  event_id: string;
  campaign_id: string | null;
  name: string;
  slug: string;
  captain_name: string;
  pages: number;
}

/** Heads coming: every uncancelled registration row (guests included) plus RSVPs from accounts with no registration. */
export function goingFor(linked: EventLinked, eventId: string) {
  const regs = linked.registrations.filter((r) => r.event_id === eventId && r.status !== "cancelled");
  const registered = new Set(regs.map((r) => r.user_id).filter(Boolean));
  const rsvpOnly = linked.rsvps.filter((r) => r.event_id === eventId && !registered.has(r.user_id));
  return { regs, rsvpOnly, count: regs.length + rsvpOnly.length };
}

export function pagesFor(linked: EventLinked, campaignId: string | null) {
  const pages = campaignId ? linked.pages.filter((p) => p.campaign_id === campaignId) : [];
  return { pages, active: pages.filter((p) => p.status === "active").length, drafts: pages.filter((p) => p.status !== "active").length };
}
