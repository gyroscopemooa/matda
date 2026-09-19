import { NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const callback = new URL("/auth/callback", siteUrl).toString();
  const response = NextResponse.redirect(new URL("/", request.url));
  try {
    const supabase = await supabaseAuth(response);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback },
    });
    if (error || !data.url)
      throw error || new Error("Google 로그인 주소를 만들지 못했습니다.");
    return NextResponse.redirect(data.url, { headers: response.headers });
  } catch {
    return NextResponse.redirect(
      new URL("/?auth=google-unavailable", request.url),
    );
  }
}
