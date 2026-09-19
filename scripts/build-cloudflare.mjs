import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// OpenNext packages .env files into the Worker. Build from a clean checkout
// with dashboard variables so local credentials and localhost cannot leak.
const envFiles = [".env", ".env.local", ".env.production", ".env.production.local", ".env.development", ".env.development.local", ".env.test", ".env.test.local"];
if (envFiles.some((file) => existsSync(file))) {
  throw new Error("Use a clean checkout without .env files for Cloudflare builds. Configure environment variables in Cloudflare Builds; keep local development files intact.");
}
const { vars } = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
const env = { ...process.env, ...vars, NEXT_DIST_DIR: ".next" };
if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Cloudflare build variables.");
}
const result = spawnSync(process.execPath, ["node_modules/@opennextjs/cloudflare/dist/cli/index.js", "build"], { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
