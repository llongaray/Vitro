import type { MetadataRoute } from "next";

import { getSite, requestOrigin } from "@/lib/api";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSite().catch(() => null);
  const { origin } = await requestOrigin();
  if (!site || !site.tenant.indexing_enabled) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/preview"] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
