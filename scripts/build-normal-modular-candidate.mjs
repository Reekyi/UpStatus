#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(ROOT, "src/server/normal-3.4.7.recovered.template.ts");
const helperPath = path.join(ROOT, "src/server/normal-3.4.7/modules/http.js");
const userscriptPath = path.join(ROOT, "recovery/runtime-2026-11-26/userscripts/original-project-normal-3.4.7.user.js");
const ycaroPath = path.join(ROOT, "ycaro.html");
const outputRoot = path.join(ROOT, "dist/modular-normal-candidate");
const outputPath = path.join(outputRoot, "index.ts");

let source = fs.readFileSync(templatePath, "utf8");
const helperModule = fs.readFileSync(helperPath, "utf8");
const userscript = fs.readFileSync(userscriptPath, "utf8");
const ycaro = fs.readFileSync(ycaroPath, "utf8");

const start = source.indexOf("function response(body:unknown");
const end = source.indexOf("function token(req:Request)", start);
if (start < 0 || end < 0) throw new Error("Could not isolate the original HTTP helper block.");

source = source.slice(0, start) +
  "const { response, readBody } = createHttpHelpers(CORS);\n" +
  source.slice(end);

const importAnchor = 'import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";';
if (!source.includes(importAnchor)) throw new Error("Crypto import anchor not found.");
source = source.replace(importAnchor, () =>
  importAnchor + '\nimport { createHttpHelpers } from "./modules/http.js";'
);

const replacements = {
  "__UPSTATUS_VERSION__": "3.4.7",
  "__UPSTATUS_USERSCRIPT_BASE64__": Buffer.from(userscript, "utf8").toString("base64"),
  "__UPSTATUS_YCARO_HTML_EXPR__": JSON.stringify(ycaro)
};
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!source.includes(placeholder)) throw new Error("Missing placeholder: " + placeholder);
  source = source.replaceAll(placeholder, () => value);
}
if (/__UPSTATUS_[A-Z0-9_]+__/.test(source)) throw new Error("Unresolved runtime placeholder detected.");

fs.mkdirSync(path.join(outputRoot, "modules"), { recursive: true });
fs.writeFileSync(outputPath, source, "utf8");
fs.copyFileSync(helperPath, path.join(outputRoot, "modules/http.js"));
fs.writeFileSync(
  path.join(outputRoot, "README.txt"),
  "NON-PRODUCTION CANDIDATE. Generated offline for review only. Never deploy this output automatically.\n",
  "utf8"
);

console.log("Built isolated modular Normal candidate.");
console.log("Output: " + path.relative(ROOT, outputPath));
console.log("HTTP helpers: " + (source.includes('createHttpHelpers(CORS)') ? "extracted" : "missing"));
console.log("Supabase/deploy actions: none");
