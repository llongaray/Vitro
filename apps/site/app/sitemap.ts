import type { MetadataRoute } from "next";

import { publicGet, requestOrigin } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await publicGet<{ paths: string[] }>("/api/v1/public/sitemap");
  if (!data) return [];
  const { origin } = await requestOrigin();
  return data.paths.map((path) => ({ url: `${origin}${path}` }));
}
