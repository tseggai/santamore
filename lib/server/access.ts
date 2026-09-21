import "server-only";

import { isStaffRole, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

/** The signed-in person's access level, for what a console page shows. RLS and the SQL functions decide what it may do. */
export async function currentRole(): Promise<Role> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "member";
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (data?.role as Role | undefined) ?? "member";
}

export async function isAdmin(): Promise<boolean> {
  return (await currentRole()) === "admin";
}

export async function isStaff(): Promise<boolean> {
  return isStaffRole(await currentRole());
}
