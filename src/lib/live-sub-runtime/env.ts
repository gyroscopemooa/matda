export const APP_KEY = "matda";
export const RUNTIME_BASE_URL =
  process.env.NEXT_PUBLIC_LIVESUB_RUNTIME_BASE_URLS ||
  "https://runtime.live-sub.com";
export const RUNTIME_ENV =
  process.env.NEXT_PUBLIC_LIVESUB_RUNTIME_ENV || "production";
export const RUNTIME_STORAGE_KEY = `livesub.runtime.v1.${RUNTIME_ENV}`;
export const RUNTIME_DISMISSED_STORAGE_KEY = `livesub.runtime.dismissed.${RUNTIME_ENV}`;
