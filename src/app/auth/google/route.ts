import { NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    requestUrl.host;
  const requestOrigin = `${requestUrl.protocol}//${requestHost}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestOrigin;
  // PKCE stores its verifier in a host-only cookie. Begin OAuth on the same
  // configured host that will receive the callback, even if a developer used
  // localhost to open the preview.
  if (requestOrigin !== new URL(siteUrl).origin)
    return NextResponse.redirect(new URL("/auth/google", siteUrl));
  const callback = new URL("/auth/callback", siteUrl).toString();
  const response = NextResponse.redirect(new URL("/", request.url));
  try {
    const supabase = await supabaseAuth(response);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
        queryParams: { prompt: "select_account" },
      },
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
