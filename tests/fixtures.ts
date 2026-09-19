import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { Database } from "../src/lib/types";
export async function fixtureUpdate(update: (db: Database) => void) {
  const { dataDir } = JSON.parse(
    await readFile(".local/test-runtime.json", "utf8"),
  );
  const dir = path.resolve(dataDir);
  if (!dir.startsWith(path.resolve(".local") + path.sep + "e2e-"))
    throw new Error("Only isolated generated E2E fixtures may be changed");
  const file = path.join(dir, "database.json");
  const db: Database = JSON.parse(await readFile(file, "utf8"));
  update(db);
  await writeFile(file + ".fixture", JSON.stringify(db), "utf8");
  await rename(file + ".fixture", file);
}
