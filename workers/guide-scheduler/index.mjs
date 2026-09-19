export default {
  async scheduled(_controller, env) {
    if (env.GUIDE_AUTOMATION_ENABLED !== "true") return;
    if (!env.GUIDE_CRON_SECRET || env.GUIDE_CRON_SECRET.length < 32)
      throw new Error("GUIDE_CRON_SECRET missing");
    const response = await env.MATDA.fetch(
      "https://matda.net/api/guides/generate",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GUIDE_CRON_SECRET}` },
        signal: AbortSignal.timeout(120000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Guide generation HTTP ${response.status}`);
    }
    await response.body?.cancel();
    console.log("Guide daily generation request completed");
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
