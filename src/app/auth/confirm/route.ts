import { NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { ensureProfile, remoteEnabled } from "@/lib/community-repository";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const token_hash = url.searchParams.get("token_hash");
  const target = new URL(
    type === "recovery" ? "/reset-password" : "/my",
    process.env.NEXT_PUBLIC_SITE_URL || url.origin,
  );
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "private, no-store");
  if (
    !remoteEnabled() ||
    !token_hash ||
    (type !== "signup" && type !== "recovery" && type !== "email")
  )
    return NextResponse.redirect(new URL("/?auth=confirmation-failed", target));
  try {
    const client = await supabaseAuth(response);
    const { data, error } = await client.auth.verifyOtp({ type, token_hash });
    if (error || !data.user) throw new Error("Invalid confirmation");
    await ensureProfile(client, data.user);
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/?auth=confirmation-failed", target),
      { headers: response.headers },
    );
  }
}
