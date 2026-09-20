import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Read inside a request: deployed Worker bindings take precedence over local env. */
export function serverSetting(name: string): string | undefined {
  try {
    const env = getCloudflareContext().env as unknown as Record<
      string,
      unknown
    >;
    const value = env[name];
    if (typeof value === "string") return value.trim() || undefined;
  } catch {
    // Plain next dev / Node tests have no Worker context.
  }
  return process.env[name]?.trim() || undefined;
}
