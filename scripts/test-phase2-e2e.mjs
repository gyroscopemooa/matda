import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/@playwright/test/cli.js",
    "test",
    "tests/consumer-quotes.e2e.ts",
    "tests/quote-conversion.e2e.ts",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PHASE2_TEST_URL: "http://127.0.0.1:3118",
      PHASE2_ONLY: "true",
    },
  },
);
process.exit(result.status ?? 1);
