import { AppError } from "./types";
export function validateEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  const adapter = env.DATA_ADAPTER || "local";
  if (adapter !== "local")
    throw new AppError(
      "로컬 저장소는 DATA_ADAPTER=local에서만 사용할 수 있습니다.",
      503,
    );
  if (env.PAYMENTS_ENABLED === "true")
    throw new AppError(
      "실제 결제 어댑터가 연결되지 않아 결제를 활성화할 수 없습니다.",
      503,
    );
  if (env.NODE_ENV === "production" && env.ALLOW_LOCAL_PREVIEW !== "true")
    throw new AppError("로컬 어댑터의 실서비스 실행은 차단되어 있습니다.", 503);
  return { adapter, payments: false, remoteConnected: false };
}

export function validateCommunityEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.DATA_ADAPTER !== "supabase" ||
    !(
      Number(env.NEXT_PUBLIC_RELEASE_PHASE || "1") === 1 ||
      (Number(env.NEXT_PUBLIC_RELEASE_PHASE) === 2 &&
        env.CONSUMER_QUOTES_REMOTE_ENABLED === "true")
    ) ||
    env.PAYMENTS_ENABLED === "true" ||
    env.TENDERS_ENABLED === "true"
  )
    throw new AppError("원격 공개 단계와 견적 연결 설정을 확인해주세요.", 503);
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !env.NEXT_PUBLIC_SITE_URL
  )
    throw new AppError("서비스 연결 설정을 확인해주세요.", 503);
  const site = new URL(env.NEXT_PUBLIC_SITE_URL);
  if (env.NODE_ENV === "production" && site.protocol !== "https:")
    throw new AppError("공개 서비스에는 HTTPS 주소가 필요합니다.", 503);
}
