import type { MetadataRoute } from "next";
import { readGuides } from "@/lib/guide-server";
import { readPublicPosts } from "@/lib/community-public";
import { indexablePost } from "@/lib/community-content";
import { siteUrl, searchEnabled } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!searchEnabled()) return [];
  return [
    { url: siteUrl + "/" },
    { url: siteUrl + "/guides" },
    { url: siteUrl + "/community" },
    ...(await readPublicPosts()).filter(indexablePost).map((post) => ({
      url: `${siteUrl}/posts/${post.id}`,
      lastModified: new Date(post.updatedAt),
    })),
    ...(await readGuides()).map((g) => ({
      url: `${siteUrl}/guides/${g.slug}`,
      lastModified: new Date(g.updatedAt),
    })),
  ];
}
