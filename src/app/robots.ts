import type { MetadataRoute } from "next";
import { searchEnabled, siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return searchEnabled()
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/api/",
            "/admin",
            "/my",
            "/chat",
            "/notifications",
            "/auth/",
            "/reset-password",
          ],
        },
        sitemap: siteUrl + "/sitemap.xml",
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
