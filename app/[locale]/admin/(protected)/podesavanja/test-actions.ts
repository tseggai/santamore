"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Test mode (migration 0055): admin only, enforced in SQL. While it is on,
// every record made is marked is_test; test money is not immutable, test
// rows leave the public figures the moment it is off, and purge removes
// them all. Live rows are never touched.

export interface TestModeResult {
  ok: boolean;
  error?: "invalid" | "server";
  detail?: string;
  on?: boolean;
  deleted?: number;
}

export async function setTestMode(input: unknown): Promise<TestModeResult> {
  const parsed = z.object({ on: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_test_mode", { p_on: parsed.data.on });
  if (error) {
    console.error("[admin] set_test_mode failed:", error.code, error.message);
    return { ok: false, error: "server", detail: `${error.code}: ${error.message}` };
  }
  revalidatePath("/", "layout");
  return { ok: true, on: Boolean(data) };
}

export async function purgeTestData(): Promise<TestModeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purge_test_data");
  if (error) {
    console.error("[admin] purge_test_data failed:", error.code, error.message);
    return { ok: false, error: "server", detail: `${error.code}: ${error.message}` };
  }
  revalidatePath("/", "layout");
  return { ok: true, deleted: Number((data as { deleted?: number } | null)?.deleted ?? 0) };
}
