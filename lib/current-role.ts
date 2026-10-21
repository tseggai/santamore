import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in person's role, or null when nobody is signed in. Read with the
 * user's own session, so it says what the policies will allow; pages use it
 * only to decide what to show (the database stays the barrier).
 */
export async function currentRole(): Promise<Role | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile?.role ?? "member") as Role;
}
