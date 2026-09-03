import type { ReactNode } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

/**
 * Public-site chrome. The admin area lives outside this group on purpose —
 * it wears its own console shell so staff never mistake which side of the
 * platform they're on.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
