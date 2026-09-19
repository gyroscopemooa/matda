import { createClient } from "@supabase/supabase-js";
const env = process.env;
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
];
let failures = 0;
for (const key of required) {
  if (!env[key]) {
    console.error(`MISSING ${key}`);
    failures++;
  }
}
if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  for (const [table, columns] of [
    ["profiles", "id,avatar,disabled"],
    ["posts", "id,images,schedule,budget,service_mode"],
    ["comments", "id,status"],
    ["media", "id,object_key,created_at,storage_provider"],
  ]) {
    const { error } = await client.from(table).select(columns).limit(0);
    console.log(
      `${error?.code === "42501" && table === "media" ? "AUTH_REQUIRED" : error ? "FAIL" : "OK"} schema ${table}${error ? ` (${error.code})` : ""}`,
    );
    if (error && !(table === "media" && error.code === "42501")) failures++;
  }
}
console.log(
  "Read-only check. No accounts, posts, files or settings were changed. RLS/auth/email/R2 live flows still require staging verification.",
);
process.exitCode = failures ? 1 : 0;
