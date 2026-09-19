import type { MetadataRoute } from "next";
import { readGuides } from "@/lib/guide-server";
import { siteUrl, searchEnabled } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!searchEnabled()) return [];
  return [
    { url: siteUrl + "/" },
    { url: siteUrl + "/guides" },
    ...(await readGuides()).map((g) => ({
      url: `${siteUrl}/guides/${g.slug}`,
      lastModified: new Date(g.updatedAt),
    })),
  ];
}
