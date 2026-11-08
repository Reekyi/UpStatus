#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildPath = path.join(ROOT, "scripts", "build.mjs");
const build = fs.readFileSync(buildPath, "utf8");
const start = build.indexOf("function writeFunction(fn,source){");
const end = start >= 0 ? build.indexOf("\nconst prodUser", start) : -1;
assert.ok(start >= 0 && end > start, "build writeFunction helper must remain inspectable");
const writeFunction = build.slice(start, end);
assert.doesNotMatch(writeFunction, /fs\.rmSync\s*\(/, "function build must not recursively delete a tracked Supabase function directory");
assert.match(writeFunction, /fs\.mkdirSync\(dir,\{recursive:true\}\)/, "function build must create the directory without replacing it");
assert.match(writeFunction, /fs\.writeFileSync\(path\.join\(dir,"index\.ts"\),source,"utf8"\)/, "function build must update only the generated index.ts entrypoint");

for (const relative of [
  "supabase/functions/upstatus/index_v25_loader.ts",
  "supabase/functions/upstatus/backend_v25_bundle.ts",
]) {
  const file = path.join(ROOT, relative);
  assert.equal(fs.existsSync(file), true, "tracked sidecar must survive build: " + relative);
  assert.ok(fs.statSync(file).size > 0, "tracked sidecar must remain non-empty: " + relative);
}
console.log("PASS build preserves tracked Supabase function sidecars.");
