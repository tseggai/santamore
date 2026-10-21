import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Reads of the public views, shared by every visitor and refreshed once a
 * minute. The public pages used to run every query on every visit, with a
 * session-bound client, from a function region an ocean away from the
 * database; this is the cache in front of that.
 *
 * The client here carries the anon key and no cookies: it sees exactly what
 * an anonymous visitor sees (the v_public_* views, the public RPCs), so a
 * cached result can never leak a signed-in person's data, and it can run
 * inside the data cache, which forbids cookies(). Anything per person (a
 * member's votes, the signed-in state) stays on lib/supabase/server.ts.
 *
 * The contract: a public figure may be up to PUBLIC_CACHE_SECONDS old. The
 * console's own screens read live. An action that must show at once on the
 * site calls revalidatePublic().
 */
export const PUBLIC_CACHE_SECONDS = 60;
export const PUBLIC_CACHE_TAG = "public";

export function publicClient(): SupabaseClient {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Runs `read` against the public views once per key per minute and hands
 * every visitor the same result. The key names the page and its inputs
 * (locale, slug, year); the read must return plain data (the cache stores
 * JSON), which Supabase responses are.
 */
export function cachedPublic<T>(key: (string | number | null | undefined)[], read: (supabase: SupabaseClient) => PromiseLike<T>): Promise<T> {
  const parts = key.map((k) => (k == null ? "" : String(k)));
  return unstable_cache(async () => await read(publicClient()), ["public-data", ...parts], { revalidate: PUBLIC_CACHE_SECONDS, tags: [PUBLIC_CACHE_TAG] })();
}

/** Drops every cached public read at once, for an action whose effect must show on the site now (the test-mode switch). Server actions only. */
export function revalidatePublic(): void {
  revalidateTag(PUBLIC_CACHE_TAG);
}

/** Whether test mode is on, as the site shows it: cached like every other public read. */
export function cachedTestMode(): Promise<boolean> {
  return cachedPublic(["test-mode"], async (supabase) => {
    const { data } = await supabase.rpc("test_mode");
    return Boolean(data);
  });
}
