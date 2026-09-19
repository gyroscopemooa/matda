import { AppError } from "./types";
export function validateEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  const adapter = env.DATA_ADAPTER || "local";
  if (adapter !== "local")
    throw new AppError(
      "원격 어댑터는 아직 연결되지 않았습니다. DATA_ADAPTER=local로 로컬 검증을 진행하세요.",
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
