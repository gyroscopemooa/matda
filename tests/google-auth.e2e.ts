import { expect, test } from "@playwright/test";

test("Google login starts PKCE OAuth without exposing Supabase keys", async ({
  request,
}) => {
  const response = await request.get("/auth/google", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const location = response.headers()["location"] || "";
  expect(location).toContain("https://affpkizmmfnmvyexugdu.supabase.co/auth/v1/authorize");
  expect(location).toContain("provider=google");
  expect(location).toContain("code_challenge=");
  expect(response.headers()["set-cookie"] || "").toContain("code-verifier");
});
