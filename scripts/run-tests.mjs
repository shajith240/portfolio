// Runs every lib/*.test.ts as its own Node process (native type stripping,
// node:assert). Exits non-zero if any file fails.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const libDir = fileURLToPath(new URL("../lib", import.meta.url));
const files = readdirSync(libDir).filter((f) => f.endsWith(".test.ts")).sort();
let failed = 0;

for (const file of files) {
  const path = join(libDir, file);
  const { status } = spawnSync(process.execPath, ["--no-warnings", path], { stdio: "inherit" });
  console.log(`${status === 0 ? "pass" : "FAIL"}  lib/${file}`);
  if (status !== 0) failed++;
}

console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
