#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(ROOT, "src/server/normal-3.4.7.recovered.template.ts");
const helperPath = path.join(ROOT, "src/server/normal-3.4.7/modules/http.js");
const statePath = path.join(ROOT, "src/server/normal-3.4.7/modules/state.js");
const userscriptPath = path.join(ROOT, "recovery/runtime-2026-11-26/userscripts/original-project-normal-3.4.7.user.js");
const ycaroPath = path.join(ROOT, "ycaro.html");
const outputRoot = path.join(ROOT, "dist/modular-normal-candidate");
const outputPath = path.join(outputRoot, "index.ts");

let source = fs.readFileSync(templatePath, "utf8");
const helperModule = fs.readFileSync(helperPath, "utf8");
if (!helperModule.includes("export function createHttpHelpers")) throw new Error("HTTP helper module export not found.");
const stateModule = fs.readFileSync(statePath, "utf8");
if (!stateModule.includes("export function createStateStore")) throw new Error("State store module export not found.");
const userscript = fs.readFileSync(userscriptPath, "utf8");
const ycaro = fs.readFileSync(ycaroPath, "utf8");

const httpStart = source.indexOf("function response(body:unknown");
const httpEnd = source.indexOf("function token(req:Request)", httpStart);
if (httpStart < 0 || httpEnd < 0) throw new Error("Could not isolate the original HTTP helper block.");
source = source.slice(0, httpStart) +
  "const { response, readBody } = createHttpHelpers(CORS);\n" +
  source.slice(httpEnd);

const stateStart = source.indexOf("async function stateValue(key:string, fallback:any) {");
const stateEnd = source.indexOf("function cookie(req:Request,name:string)", stateStart);
if (stateStart < 0 || stateEnd < 0) throw new Error("Could not isolate the original shared state block.");
source = source.slice(0, stateStart) +
  "const { stateValue, setState } = createStateStore(db);\n" +
  source.slice(stateEnd);

const importAnchor = 'import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";';
if (!source.includes(importAnchor)) throw new Error("Crypto import anchor not found.");
source = source.replace(importAnchor, () =>
  importAnchor +
  '\nimport { createHttpHelpers } from "./modules/http.js";' +
  '\nimport { createStateStore } from "./modules/state.js";'
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
fs.copyFileSync(statePath, path.join(outputRoot, "modules/state.js"));
fs.writeFileSync(
  path.join(outputRoot, "README.txt"),
  "NON-PRODUCTION CANDIDATE. Generated offline for review only. Never deploy this output automatically.\n",
  "utf8"
);

console.log("Built isolated modular Normal candidate.");
console.log("Output: " + path.relative(ROOT, outputPath));
console.log("HTTP helpers: " + (source.includes('createHttpHelpers(CORS)') ? "extracted" : "missing"));
console.log("State store: " + (source.includes('createStateStore(db)') ? "extracted" : "missing"));
console.log("Supabase/deploy actions: none");
