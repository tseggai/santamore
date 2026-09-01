import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Locale-prefixed private areas; API routes have nothing to index.
        disallow: ["/*/admin", "/*/dashboard", "/api/"],
      },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
