import { spawn } from "node:child_process";
const portIndex = process.argv.indexOf("--port");
const port = portIndex === -1 ? "3107" : process.argv[portIndex + 1];
if (!port || !/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
  throw new Error("Use a local port between 1024 and 65535.");
const releasePreview = process.argv.includes("--release-preview");
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
      LOCAL_DATA_DIR: port === "3000" ? ".local/dev" : ".local/preview",
      NEXT_DIST_DIR: port === "3000" ? ".next" : ".next-preview",
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
      NEXT_PUBLIC_RELEASE_PHASE: releasePreview ? "1" : "8",
      NEXT_PUBLIC_QUOTES_ENABLED: "true",
      NEXT_PUBLIC_PROVIDERS_ENABLED: "true",
      NEXT_PUBLIC_BIZ_ENABLED: "true",
      TENDERS_ENABLED: releasePreview ? "false" : "true",
      PAYMENTS_ENABLED: "false",
      SEARCH_INDEXING_ENABLED: "false",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
