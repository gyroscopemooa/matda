import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const dataDir = ".local/e2e-" + Date.now();
await mkdir(".local", { recursive: true });
await writeFile(".local/test-runtime.json", JSON.stringify({ dataDir }));
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3108",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_RELEASE_PHASE: "8",
      NEXT_DIST_DIR: ".next-e2e",
      LOCAL_DATA_DIR: dataDir,
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
