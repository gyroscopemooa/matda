import { matchesRegion } from "./regions";
export const onlineRegion = "전국 · 온라인";
export type ServiceFilter = "all" | "local" | "online";
export function isOnline(post: Record<string, unknown>) {
  return post.serviceMode === "online" || post.region === onlineRegion;
}
export function matchesService(
  post: Record<string, unknown>,
  filter: ServiceFilter,
  region: string,
) {
  const online = isOnline(post);
  if (filter === "online") return online;
  if (filter === "local" && online) return false;
  return matchesRegion(String(post.region || ""), region);
}
