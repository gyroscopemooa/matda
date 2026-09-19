import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";
export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "청소부터 웹·앱 제작까지, 맡기고 싶은 일과 궁금한 점을 나누는 요청형 커뮤니티. 해죠에 올려보세요.",
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
