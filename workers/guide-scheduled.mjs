// Invoke the existing app through its self binding so Next request context
// and Cloudflare runtime secrets are initialized normally.
export async function scheduled(_controller, env) {
  if (env.GUIDE_AUTOMATION_ENABLED !== "true") return;
  if (!env.GUIDE_CRON_SECRET || env.GUIDE_CRON_SECRET.length < 32)
    throw new Error("GUIDE_CRON_SECRET missing");
  const response = await env.WORKER_SELF_REFERENCE.fetch(
    "https://matda.net/api/guides/generate",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GUIDE_CRON_SECRET}` },
      signal: AbortSignal.timeout(120000),
    },
  );
  await response.body?.cancel();
  if (!response.ok)
    throw new Error(`Guide generation HTTP ${response.status}`);
  console.log("Guide daily generation request completed");
}
