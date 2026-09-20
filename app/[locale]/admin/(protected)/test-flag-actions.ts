"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { RECORD_KINDS } from "@/lib/test-flag";

// Qualifying records for live mode, or marking them as test, one at a time
// (set_record_test, migration 0059). Admin only, enforced in SQL. The
// record and everything attached to it flip together; live money that is
// not attached is never touched.

export interface TestFlagResult {
  ok: boolean;
  error?: "invalid" | "server";
  detail?: string;
  /** Records the database no longer had. */
  missing?: number;
}

const schema = z.object({
  kind: z.enum(RECORD_KINDS),
  ids: z.array(z.string().uuid()).min(1).max(200),
  test: z.boolean(),
});

export async function setRecordsTest(input: unknown): Promise<TestFlagResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { kind, ids, test } = parsed.data;
  const supabase = await createClient();
  let missing = 0;
  for (const id of ids) {
    const { data, error } = await supabase.rpc("set_record_test", { p_kind: kind, p_id: id, p_test: test });
    if (error) {
      console.error("[admin] set_record_test failed:", error.code, error.message);
      return { ok: false, error: "server", detail: `${error.code}: ${error.message}` };
    }
    if (!(data as { ok?: boolean } | null)?.ok) missing += 1;
  }
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]", "layout");
  return { ok: true, missing };
}

export async function setYearReportTest(input: unknown): Promise<TestFlagResult> {
  const parsed = z.object({ year: z.number().int().min(2025).max(2100), test: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_year_report_test", { p_year: parsed.data.year, p_test: parsed.data.test });
  if (error) {
    console.error("[admin] set_year_report_test failed:", error.code, error.message);
    return { ok: false, error: "server", detail: `${error.code}: ${error.message}` };
  }
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]", "layout");
  return { ok: true, missing: (data as { ok?: boolean } | null)?.ok ? 0 : 1 };
}
