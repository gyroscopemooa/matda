import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";
export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "가까운 이웃과 나누는 질문부터 믿을 수 있는 업체와의 연결까지. 글 하나로 시작하세요.",
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
