import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // The share-card routes read the brand fonts from disk (lib/og-fonts.ts);
  // make sure the deployed functions carry them.
  outputFileTracingIncludes: {
    "/[locale]/(site)/transparentnost/opengraph-image": ["./assets/fonts/**"],
    "/[locale]/(site)/f/[slug]/opengraph-image": ["./assets/fonts/**"],
  },
  images: {
    // Fundraiser photos live in Supabase Storage (public bucket) and are
    // served resized through next/image — never raw multi-MB originals.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
