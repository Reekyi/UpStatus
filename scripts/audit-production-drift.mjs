#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archivePath = path.join(ROOT, "archive/production-3.0.29/index.ts");
const manifestPath = path.join(ROOT, "archive/production-3.0.29/README.md");
const serverTemplatePath = path.join(ROOT, "src/server/index.template.ts");
const userTemplatePath = path.join(ROOT, "src/userscript/upstatus.user.template.js");
const LIVE_SOURCE_SHA256 = "ad3ba7f776d1ca49129d8fa1b2a1944710695908ef630ac736ee72ce279dd442";
const EXPECTED_ARCHIVE_FILE_SHA256 = "a60b8c5249cf418b0e7a55720799f4bebb82a1daa2c6c50e9f08e1ced3978da8";
const strict = process.argv.includes("--strict");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeUserscript(source, label) {
  const match = source.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);
  assert(match, label + ": USERSCRIPT_HEX missing");
  return Buffer.from(match[1], "hex").toString("utf8");
}

function normalizeServer(source, isTemplate) {
  let normalized = source
    .replace(/const VERSION = "[^"]+";/, 'const VERSION = "__VERSION__";')
    .replace(/const USERSCRIPT_HEX = "(?:[0-9a-fA-F]*|__UPSTATUS_USERSCRIPT_HEX__)";/, 'const USERSCRIPT_HEX = "__USERSCRIPT_HEX__";');
  if (isTemplate) {
    normalized = normalized.replaceAll(
      'const marker="__UPSTATUS_PATH_MARKER__";',
      'const marker="/upstatus";'
    );
  }
  return normalized;
}

try {
  const archive = fs.readFileSync(archivePath, "utf8");
  const manifest = fs.readFileSync(manifestPath, "utf8");
  const serverTemplate = fs.readFileSync(serverTemplatePath, "utf8");
  const userTemplate = fs.readFileSync(userTemplatePath, "utf8");

  const archiveHash = createHash("sha256").update(archive, "utf8").digest("hex");
  assert(manifest.includes(LIVE_SOURCE_SHA256), "Archive manifest no longer records the expected live-source fingerprint.");
  assert(archiveHash === EXPECTED_ARCHIVE_FILE_SHA256,
    "Archived repository snapshot changed unexpectedly. Expected file SHA-256 " + EXPECTED_ARCHIVE_FILE_SHA256 + ", got " + archiveHash + ".");

  const archivedVersion = (archive.match(/const VERSION = "([^"]+)";/) || [])[1];
  const archivedUser = decodeUserscript(archive, "Archived production source");
  const userHeaderVersion = (archivedUser.match(/^\/\/ @version\s+(\S+)/m) || [])[1];
  assert(archivedVersion === "3.0.29", "Archive VERSION marker changed unexpectedly: " + archivedVersion);
  assert(userHeaderVersion === archivedVersion, "Archive backend and embedded userscript versions differ.");

  const backendMatches = normalizeServer(serverTemplate, true) === normalizeServer(archive, false);
  assert(backendMatches,
    "Server template backend differs from the archived production backend beyond generated VERSION/userscript/path substitutions.");

  const missingProductionCoordination = [
    ["GM_addValueChangeListener grant", "// @grant        GM_addValueChangeListener"],
    ["GM_removeValueChangeListener grant", "// @grant        GM_removeValueChangeListener"],
    ["cross-tab leader lock", "__upLeaderKey"],
    ["cross-tab follower mode", "__upFollowerMode"],
    ["follower event handler", "__upHandleFollowerEvent"]
  ].filter(([, marker]) => !userTemplate.includes(marker)).map(([label]) => label);

  const lines = [
    "Archived repository snapshot integrity: OK (" + archiveHash + "); recorded live-source fingerprint: " + LIVE_SOURCE_SHA256,
    "Backend template: matches archived production backend after build substitutions",
    "Archived production userscript: " + archivedUser.length.toLocaleString("en-US") + " characters / " + archivedUser.split("\n").length + " lines",
    "Current userscript template: " + userTemplate.length.toLocaleString("en-US") + " characters / " + userTemplate.split("\n").length + " lines",
    "Production-only coordination markers missing from current template: " +
      (missingProductionCoordination.length ? missingProductionCoordination.join(", ") : "none")
  ];
  console.log(lines.join("\n"));

  if (strict && missingProductionCoordination.length) {
    throw new Error(
      "Refusing production release: reconcile the archived production cross-tab coordination behavior before deployment."
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
