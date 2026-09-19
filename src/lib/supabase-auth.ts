import { createServerClient } from "@supabase/ssr";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AppError } from "./types";

function settings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new AppError("Supabase 로그인 설정이 아직 완료되지 않았습니다.", 503);
  return { url, key };
}

/** Creates an OAuth server client and forwards its PKCE/session cookies to response. */
export async function supabaseAuth(response: NextResponse) {
  const cookieStore = await cookies();
  const { url, key } = settings();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        for (const { name, value, options } of items)
          response.cookies.set(name, value, options);
      },
    },
  });
}
