import { createClient } from "@/lib/supabase/server";

/** Loads the runner's pages and picks the one named by ?page= (or the first). */
export async function myPages(userId: string) {
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("fundraisers")
    .select("id, slug, title, status, event_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const eventIds = [...new Set((pages ?? []).map((page) => page.event_id))];
  const { data: events } = eventIds.length
    ? await supabase.from("v_public_events").select("id, name").in("id", eventIds)
    : { data: [] };
  const eventName = new Map((events ?? []).map((event) => [event.id, event.name]));
  return (pages ?? []).map((page) => ({
    id: page.id,
    slug: page.slug,
    title: page.title,
    status: page.status as "draft" | "active" | "hidden",
    eventName: eventName.get(page.event_id) ?? "—",
  }));
}
