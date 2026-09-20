import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { siteUrl, homeTitle, homeDescription } from "@/lib/seo";
export const metadata: Metadata = {
  title: {
    default: homeTitle,
    template: `%s | ${siteConfig.name}`,
  },
  metadataBase: new URL(siteUrl),
  description: homeDescription,
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION ||
      "7Txa9SR8IC6UywgCRgOoNTvflJ_cNlqXbVuj_ZwXtwU",
    other: {
      "naver-site-verification":
        process.env.NAVER_SITE_VERIFICATION ||
        "8c9731ee7a28d4761cb68b12e17e233eba83850c",
    },
  },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
