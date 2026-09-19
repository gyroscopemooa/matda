import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "tests/*.test.ts"],
  { stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_RELEASE_PHASE: "8" } },
);
process.exit(result.status ?? 1);
