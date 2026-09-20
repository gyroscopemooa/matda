import { NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verifyGuideAdmin, generateDailyGuide } from "@/lib/guide-server";
import { validateGuide } from "@/lib/guide-content";
import { checkOrigin } from "@/lib/auth";
import { AppError } from "@/lib/types";
export const dynamic = "force-dynamic";
async function handle(request?: Request) {
  const cookies = new NextResponse();
  cookies.headers.set("Cache-Control", "private, no-store");
  try {
    const client = await supabaseAuth(cookies),
      user = await verifyGuideAdmin(client);
    if (request) {
      checkOrigin(request);
      const body = await request.json();
      if (body.action === "settings") {
        if (!["manual", "draft", "auto"].includes(body.mode))
          throw new AppError("자동화 방식을 선택해주세요.");
        const saved = await client
          .from("guide_automation_settings")
          .update({
            mode: body.mode,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq("id", true)
          .select("mode")
          .single();
        if (saved.error)
          throw new AppError("0013 자동화 설정 SQL을 먼저 적용해주세요.", 503);
        return NextResponse.json(
          { mode: saved.data.mode },
          { headers: cookies.headers },
        );
      }
      if (body.action === "generate")
        return NextResponse.json(await generateDailyGuide(), {
          headers: cookies.headers,
        });
      if (!["draft", "published", "held"].includes(body.status))
        throw new AppError("발행 상태를 확인해주세요.");
      const content = validateGuide(body.content);
      const automationSchema = await client
        .from("guide_automation_settings")
        .select("id")
        .eq("id", true)
        .single();
      if (body.status === "published" && body.reviewed !== true)
        throw new AppError(
          "사실·출처·표현을 확인한 뒤 검수 완료를 선택해주세요.",
        );
      const result = await client
        .from("guide_articles")
        .update({
          content,
          ...(!automationSchema.error ? { publication_mode: "manual" } : {}),
          status: body.status,
          reviewed: body.status === "published",
          reviewed_by: body.status === "published" ? user.id : null,
          published_at:
            body.status === "published" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", String(body.slug))
        .select("slug")
        .single();
      if (result.error)
        throw new AppError(
          "저장 실패: SQL 적용과 관리자 권한을 확인해주세요.",
          503,
        );
    }
    const [articles, runs, settings] = await Promise.all([
      client
        .from("guide_articles")
        .select("*")
        .order("generation_day", { ascending: false })
        .limit(100),
      client
        .from("guide_generation_runs")
        .select("day,status,attempts,error,started_at")
        .order("day", { ascending: false })
        .limit(7),
      client
        .from("guide_automation_settings")
        .select("mode,updated_at")
        .eq("id", true)
        .single(),
    ]);
    if (articles.error || runs.error)
      throw new AppError("0011 가이드 SQL을 먼저 적용해주세요.", 503);
    return NextResponse.json(
      {
        articles: articles.data,
        runs: runs.data,
        automationMode: settings.data?.mode || "manual",
        automationReady: !settings.error,
      },
      { headers: cookies.headers },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AppError
            ? e.message
            : "가이드 요청을 처리하지 못했습니다.",
      },
      {
        status: e instanceof AppError ? e.status : 500,
        headers: cookies.headers,
      },
    );
  }
}
export async function GET() {
  return handle();
}
export async function POST(request: Request) {
  return handle(request);
}
