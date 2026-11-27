#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(ROOT, "src/server/normal-3.4.7.recovered.template.ts");
const userscriptPath = path.join(ROOT, "recovery/runtime-2026-11-26/userscripts/original-project-normal-3.4.7.user.js");
const ycaroPath = path.join(ROOT, "ycaro.html");
const snapshotPath = path.join(ROOT, "recovery/runtime-2026-11-26/original-project-upstatus/index.ts");
const outputPath = path.join(ROOT, "dist/recovered-normal-3.4.7/index.ts");

const template = fs.readFileSync(templatePath, "utf8");
const fragmentNames = [
  "00-runtime-config.part",
  "01-http-auth-core.part",
  "02-members-status-history.part",
  "03-chat-data.part",
  "04-shared-state.part",
  "05-guest-session-core.part",
  "06-media-core.part",
  "07-auth-context.part",
  "08-chat-routes.part",
  "09-media-routes.part",
  "10-remote-status.part",
  "11-guest-routes.part",
  "12-http-entrypoint.part"
];
const fragments = fragmentNames.map((name) =>
  fs.readFileSync(path.join(ROOT, "src/server/normal-3.4.7/fragments", name), "utf8")
);
const assembled = fragments.join("\n");
if (assembled !== template) {
  let offset = 0;
  while (offset < assembled.length && offset < template.length && assembled[offset] === template[offset]) offset++;
  throw new Error(
    "Source fragments do not exactly reconstruct the recovered template. " +
    "First difference at character " + offset
  );
}
const userscript = fs.readFileSync(userscriptPath, "utf8");
const ycaro = fs.readFileSync(ycaroPath, "utf8");
const snapshot = fs.readFileSync(snapshotPath, "utf8");

const replacements = {
  "__UPSTATUS_VERSION__": "3.4.7",
  "__UPSTATUS_USERSCRIPT_BASE64__": Buffer.from(userscript, "utf8").toString("base64"),
  "__UPSTATUS_YCARO_HTML_EXPR__": JSON.stringify(ycaro)
};

let generated = assembled;
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!generated.includes(placeholder)) throw new Error("Missing placeholder: " + placeholder);
  generated = generated.replaceAll(placeholder, () => value);
}
if (/__UPSTATUS_[A-Z0-9_]+__/.test(generated)) {
  throw new Error("Unresolved runtime placeholder detected.");
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generated, "utf8");

if (generated !== snapshot) {
  let offset = 0;
  while (offset < generated.length && offset < snapshot.length && generated[offset] === snapshot[offset]) offset++;
  throw new Error(
    "Recovered runtime does not match the preserved deployment snapshot. " +
    "First difference at character " + offset +
    "; generated length " + generated.length +
    "; snapshot length " + snapshot.length
  );
}

const sha256 = createHash("sha256").update(generated, "utf8").digest("hex");
console.log("PASS: recovered Normal 3.4.7 runtime exactly matches the original deployment snapshot.");
console.log("SHA-256: " + sha256);
console.log("Output: " + path.relative(ROOT, outputPath));
