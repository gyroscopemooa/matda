import { readGuides } from "@/lib/guide-server";
import { siteUrl, searchEnabled, homeTitle, homeDescription } from "@/lib/seo";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Workspace from "@/components/workspace";
import { transact } from "@/lib/store";
import { siteConfig, isReleasedPath } from "@/lib/config";
import { remoteEnabled } from "@/lib/community-repository";
import { createClient } from "@supabase/supabase-js";
const titles: Record<string, string> = {
  "": "필요한 일이 있나요? 일단 올려죠",
  guides: "해죠 가이드",
  community: "필요한 일과 이야기를 나누는 곳",
  quotes: "간편하게 견적받기",
  providers: "좋은 업체 찾기",
  biz: "기업에 필요한 전문업체 찾기",
  "biz/rfqs": "기업 비교견적 RFQ",
  "biz/contracts": "사업장 · 계약 관리",
  "biz/tenders": "민간 공개 제안입찰",
  my: "나의 활동",
  chat: "나의 대화",
  notifications: "알림",
  admin: "운영 관리",
};
type Props = { params: Promise<{ path?: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parts = (await params).path || [];
  if (
    !isReleasedPath("/" + parts.join("/")) &&
    !(parts.length === 1 && ["quotes", "providers", "biz"].includes(parts[0]))
  )
    notFound();
  let title = !isReleasedPath("/" + parts.join("/"))
    ? `${parts[0] === "biz" ? "맡다 비즈" : parts[0] === "quotes" ? "견적받기" : "업체찾기"} · 준비 중`
    : titles[parts.join("/")];
  let description =
    "가벼운 글쓰기부터 업체와의 연결까지, 같은 공간에서 시작하세요.";
  if (parts.length === 2 && ["posts", "providers"].includes(parts[0])) {
    try {
      const row = remoteEnabled()
        ? (
            await createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            )
              .from("posts")
              .select("title,body")
              .eq("id", parts[1])
              .eq("status", "published")
              .maybeSingle()
          ).data
        : await transact((db) =>
            db.rows.find(
              (r) =>
                r.id === parts[1] &&
                (r.kind === "provider" ||
                  (r.kind === "post" && r.status === "published")),
            ),
          );
      if (row) {
        title = String(row.title || ("name" in row ? row.name : ""));
        description = String(
          row.body || ("intro" in row ? row.intro : ""),
        ).slice(0, 150);
      }
    } catch {
      /* Preview configuration errors surface on the page. */
    }
  }
  if (parts[0] === "guides" && parts.length === 2) {
    const guide = (await readGuides()).find((g) => g.slug === parts[1]);
    if (!guide) notFound();
    title = guide.title;
    description = guide.intro;
  }
  return {
    title: !parts.length ? { absolute: homeTitle } : title || siteConfig.name,
    description: !parts.length ? homeDescription : description,
    alternates: { canonical: siteUrl + "/" + parts.join("/") },
    robots: {
      index: searchEnabled() && (!parts.length || parts[0] === "guides"),
      follow: searchEnabled() && (!parts.length || parts[0] === "guides"),
    },
    openGraph: {
      title: title || siteConfig.name,
      description,
      locale: "ko_KR",
      siteName: "해죠",
      url: siteUrl + "/" + parts.join("/"),
      images: [
        {
          url: siteUrl + "/brand/candidate-1.webp",
          alt: "해죠 · 필요한 일이 있나요? 일단 올려죠.",
        },
      ],
      type: "website",
    },
  };
}
export default async function Page({ params }: Props) {
  const parts = (await params).path || [];
  if (
    !isReleasedPath("/" + parts.join("/")) &&
    !(parts.length === 1 && ["quotes", "providers", "biz"].includes(parts[0]))
  )
    notFound();
  if (
    parts.length &&
    !(parts.join("/") in titles) &&
    !(
      (["posts", "providers", "chat", "guides"].includes(parts[0]) &&
        parts.length === 2) ||
      (parts[0] === "biz" &&
        ["rfqs", "tenders"].includes(parts[1]) &&
        parts.length === 3)
    )
  )
    notFound();
  if (
    parts[0] === "guides" &&
    parts.length === 2 &&
    !(await readGuides()).some((g) => g.slug === parts[1])
  )
    notFound();
  const articles = parts[0] === "guides" ? await readGuides() : undefined;
  const guide = articles?.find((g) => g.slug === parts[1]);
  const structured = guide
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: guide.title,
        description: guide.intro,
        dateModified: guide.updatedAt,
        author: { "@type": "Organization", name: "해죠 운영팀" },
        publisher: { "@type": "Organization", name: "해죠" },
        mainEntityOfPage: siteUrl + "/guides/" + guide.slug,
        image: siteUrl + "/brand/candidate-1.webp",
      }
    : !parts.length
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "해죠",
          url: siteUrl + "/",
        }
      : null;
  return (
    <>
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <Workspace initialGuides={articles} />
    </>
  );
}
