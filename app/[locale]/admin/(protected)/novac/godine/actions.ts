"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Staff-session action; year_reports_staff_all (migration 0026) is the
// enforcement. One row per calendar year, upserted in place.

export interface YearReportResult {
  ok: boolean;
  error?: "invalid" | "server";
}

const schema = z.object({
  year: z.number().int().min(2025).max(2100),
  headline: z.string().trim().max(160).nullable(),
  summaryMd: z.string().trim().max(8000).nullable(),
  planMd: z.string().trim().max(8000).nullable(),
  volunteers: z.number().int().min(0).max(100_000).nullable(),
  beneficiaries: z.number().int().min(0).max(1_000_000).nullable(),
  venues: z.array(z.string().trim().min(1).max(120)).max(50),
  isPublic: z.boolean(),
});

export async function saveYearReport(input: unknown): Promise<YearReportResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("year_reports").upsert(
    {
      year: data.year,
      headline: data.headline,
      summary_md: data.summaryMd,
      plan_md: data.planMd,
      volunteers: data.volunteers,
      beneficiaries: data.beneficiaries,
      venues: data.venues,
      is_public: data.isPublic,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "year" },
  );
  if (error) {
    console.error("[admin] year report save failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/admin/novac/godine", "page");
  revalidatePath("/[locale]/transparentnost", "page");
  return { ok: true };
}
