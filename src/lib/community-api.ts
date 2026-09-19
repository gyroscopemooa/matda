import { storageProvider } from "./community-storage";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAuth } from "./supabase-auth";
import { checkOrigin, rateLimit } from "./auth";
import { AppError, required } from "./types";
import {
  communityAction,
  communitySnapshot,
  ensureProfile,
  identityFor,
  loadCommunity,
} from "./community-repository";
import { imageUrl, putImage, removeImage } from "./community-storage";
import { validateCommunityEnvironment } from "./env";

const responseBody = (
  payload: unknown,
  cookies: NextResponse,
  status = 200,
) => {
  cookies.headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(payload, { status, headers: cookies.headers });
};
const failure = (e: unknown, cookies: NextResponse) =>
  responseBody(
    {
      error:
        e instanceof AppError
          ? e.message
          : "요청 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
    },
    cookies,
    e instanceof AppError ? e.status : 500,
  );
export async function remoteApp(request?: Request) {
  const response = new NextResponse();
  try {
    validateCommunityEnvironment();
    const client = await supabaseAuth(response);
    const identity = await identityFor(client);
    const { db, user } = await loadCommunity(client, identity);
    if (!request) return responseBody(communitySnapshot(db, user), response);
    checkOrigin(request);
    if (!user) throw new AppError("로그인 후 이용해주세요.", 401);
    rateLimit(user.id);
    const payload = await request.json();
    const result = await communityAction(
      client,
      db,
      user,
      payload.action,
      payload.input || {},
    );
    const after = await loadCommunity(client, identity);
    return responseBody(
      { result, ...communitySnapshot(after.db, after.user) },
      response,
    );
  } catch (e) {
    return failure(e, response);
  }
}
export async function remoteAuth(request?: Request) {
  const response = new NextResponse();
  try {
    validateCommunityEnvironment();
    const client = await supabaseAuth(response);
    if (!request) {
      const identity = await identityFor(client);
      const loaded = await loadCommunity(client, identity);
      return responseBody(
        {
          user: communitySnapshot(loaded.db, loaded.user).user,
          mode: "supabase",
        },
        response,
      );
    }
    checkOrigin(request);
    const data = await request.json();
    if (data.action !== "logout") {
      throw new AppError(
        "현재 Google 로그인만 지원합니다. Google로 계속하기를 이용해주세요.",
        403,
      );
    }
    if (data.action === "logout") {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error)
        throw new AppError("로그아웃하지 못했어요. 다시 시도해주세요.", 503);
      response.cookies.set("matda_session", "", { path: "/", maxAge: 0 });
      return responseBody({ user: null }, response);
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) throw new AppError("사이트 주소 설정이 필요합니다.", 503);
    if (data.action === "update-password") {
      const identity = await identityFor(client);
      if (!identity)
        throw new AppError("메일의 재설정 링크를 다시 열어주세요.", 401);
      const password = required(data.password, "비밀번호", 128);
      if (password.length < 10)
        throw new AppError("비밀번호는 10자 이상 입력해주세요.");
      const { error } = await client.auth.updateUser({ password });
      if (error)
        throw new AppError(
          "비밀번호를 변경하지 못했어요. 새 재설정 메일을 요청해주세요.",
        );
      const { error: logoutError } = await client.auth.signOut({
        scope: "global",
      });
      return responseBody(
        {
          message: logoutError
            ? "비밀번호를 변경했어요. 홈에서 로그아웃한 뒤 새 비밀번호로 로그인해주세요."
            : "비밀번호를 변경했어요. 새 비밀번호로 로그인해주세요.",
        },
        response,
      );
    }
    const email = required(data.email, "이메일", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new AppError("이메일 형식을 확인해주세요.");
    rateLimit("remote-auth:" + email, 12);
    if (data.action === "reset") {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/auth/callback?next=/reset-password", site).href,
      });
      if (error)
        throw new AppError(
          "메일을 발송하지 못했어요. 잠시 후 다시 시도해주세요.",
          503,
        );
      return responseBody(
        { message: "가입된 이메일이라면 비밀번호 재설정 메일이 발송됩니다." },
        response,
      );
    }
    const password = required(data.password, "비밀번호", 128);
    if (data.action === "signup") {
      if (password.length < 10)
        throw new AppError("비밀번호는 10자 이상 입력해주세요.");
      const nickname = required(data.name, "닉네임", 20);
      const { data: signup, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
          emailRedirectTo: new URL("/auth/callback", site).href,
        },
      });
      if (error)
        throw new AppError(
          "가입 요청을 처리하지 못했어요. 입력 내용과 메일 발송 설정을 확인해주세요.",
        );
      if (signup.session && signup.user)
        await ensureProfile(client, signup.user);
      return responseBody(
        {
          message: signup.session
            ? "가입이 완료됐어요."
            : "이메일의 인증 링크를 확인해주세요. 이미 가입했다면 로그인해주세요.",
        },
        response,
      );
    }
    if (data.action !== "login")
      throw new AppError("지원하지 않는 인증 요청입니다.");
    const { data: login, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      throw new AppError(
        "이메일·비밀번호 또는 이메일 인증 여부를 확인해주세요.",
        401,
      );
    await ensureProfile(client, login.user);
    return responseBody({ message: "환영합니다!" }, response);
  } catch (e) {
    return failure(e, response);
  }
}
export async function remoteMedia(request: Request) {
  const response = new NextResponse();
  try {
    validateCommunityEnvironment();
    const client = await supabaseAuth(response);
    if (request.method === "GET") {
      const id = new URL(request.url).searchParams.get("id");
      const { data, error } = await client
        .rpc("community_public_image", { target: id })
        .single<{
          object_key: string;
          visibility: string;
          storage_provider: "r2" | "supabase";
        }>();
      if (error || !data || data.visibility !== "public")
        throw new AppError("사진을 찾을 수 없습니다.", 404);
      return NextResponse.redirect(
        imageUrl(data.object_key, data.storage_provider),
        {
          headers: response.headers,
        },
      );
    }
    checkOrigin(request);
    const identity = await identityFor(client);
    if (!identity) throw new AppError("로그인 후 업로드해주세요.", 401);
    await ensureProfile(client, identity);
    rateLimit("remote-upload:" + identity.id, 20);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024)
      throw new AppError("사진은 최대 2MB까지 가능합니다.");
    if (form.get("visibility") !== "public")
      throw new AppError("현재 단계에서는 공개 사진만 지원합니다.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? "image/jpeg"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : "";
    if (!mime) throw new AppError("JPG·PNG·WebP 사진만 가능합니다.");
    const id = randomUUID();
    const key = identity.id + "/" + id;
    await putImage(key, bytes, mime, client);
    const { error } = await client.from("media").insert({
      id,
      owner_id: identity.id,
      object_key: key,
      storage_provider: storageProvider(),
      visibility: "public",
      mime,
      size: bytes.length,
    });
    if (error) {
      try {
        await removeImage(key, client);
      } catch {
        console.error("Orphan image cleanup required", key);
      }
      throw new AppError("사진 정보를 저장하지 못했어요.", 503);
    }
    return responseBody({ media: { id } }, response);
  } catch (e) {
    return failure(e, response);
  }
}
