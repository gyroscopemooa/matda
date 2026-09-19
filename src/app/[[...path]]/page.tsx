import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Workspace from "@/components/workspace";
import { transact } from "@/lib/store";
import { siteConfig, isReleasedPath } from "@/lib/config";
import { remoteEnabled } from "@/lib/community-repository";
import { createClient } from "@supabase/supabase-js";
const titles: Record<string, string> = {
  "": "가까운 이웃과 더 나은 일상",
  community: "우리 동네 이야기",
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
  if (!isReleasedPath("/" + parts.join("/"))) notFound();
  let title = titles[parts.join("/")];
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
  return {
    title: title || siteConfig.name,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: title || siteConfig.name,
      description,
      locale: "ko_KR",
      type: "website",
    },
  };
}
export default async function Page({ params }: Props) {
  const parts = (await params).path || [];
  if (!isReleasedPath("/" + parts.join("/"))) notFound();
  if (
    parts.length &&
    !(parts.join("/") in titles) &&
    !(
      (["posts", "providers", "chat"].includes(parts[0]) &&
        parts.length === 2) ||
      (parts[0] === "biz" &&
        ["rfqs", "tenders"].includes(parts[1]) &&
        parts.length === 3)
    )
  )
    notFound();
  return <Workspace />;
}
