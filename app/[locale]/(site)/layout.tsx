import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { DonateProvider } from "@/components/donate/DonateDialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

/**
 * Public-site chrome. The admin area lives outside this group on purpose —
 * it wears its own console shell so staff never mistake which side of the
 * platform they're on. While test mode is on, a bar under the header says
 * so, so nobody mistakes practice figures for real ones.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  let testMode = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("test_mode");
    testMode = Boolean(data);
  } catch {
    testMode = false;
  }
  const t = await getTranslations("home");
  return (
    <DonateProvider>
      {/* the test-mode bar is part of the header, so the landing hero can sit under both */}
      <Header notice={testMode ? t("testModeBanner") : null} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </DonateProvider>
  );
}
