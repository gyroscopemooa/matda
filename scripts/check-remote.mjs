import { createClient } from "@supabase/supabase-js";
const env = process.env;
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BUCKET",
  "R2_PUBLIC_URL",
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
    ["posts", "id,images,schedule,budget"],
    ["comments", "id,status"],
    ["media", "id,object_key,created_at"],
  ]) {
    const { error } = await client.from(table).select(columns).limit(0);
    console.log(
      `${error ? "FAIL" : "OK"} schema ${table}${error ? ` (${error.code})` : ""}`,
    );
    if (error) failures++;
  }
}
console.log(
  "Read-only check. No accounts, posts, files or settings were changed. RLS/auth/email/R2 live flows still require staging verification.",
);
process.exitCode = failures ? 1 : 0;
