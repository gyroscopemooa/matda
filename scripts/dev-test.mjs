import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const dataDir = ".local/e2e-" + Date.now();
const phase2 = process.argv.includes("--phase2");
const port = phase2 ? "3118" : "3108";
await mkdir(".local", { recursive: true });
await writeFile(
  phase2 ? ".local/test-phase2-runtime.json" : ".local/test-runtime.json",
  JSON.stringify({ dataDir }),
);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATA_ADAPTER: "local",
      NEXT_PUBLIC_RELEASE_PHASE: phase2 ? "2" : "8",
      NEXT_PUBLIC_QUOTES_ENABLED: "true",
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
      NEXT_DIST_DIR: phase2 ? ".next-phase2" : ".next-e2e",
      LOCAL_DATA_DIR: dataDir,
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
