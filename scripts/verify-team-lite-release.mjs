import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseVersion(value, label) {
  const text = String(value || "").trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (!match) throw new Error(label + " must use stable X.Y.Z semantic versioning.");
  return match.slice(1).map(Number);
}

export function compareStableVersions(left, right) {
  const a = parseVersion(left, "left version");
  const b = parseVersion(right, "right version");
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

function readHeader(script, name) {
  const match = String(script || "").match(new RegExp("^// @" + name + "\\s+([^\\r\\n]+)$", "m"));
  return match ? match[1].trim() : "";
}

export function assertTeamLiteRelease({
  release,
  script,
  expectedCurrentVersion,
  expectedCoreVersion,
  requestedVersion,
}) {
  if (release?.product !== "UpStatus Team Lite") {
    throw new Error("Team Lite release manifest has an unexpected product name.");
  }
  if (release?.channel !== "stable") {
    throw new Error("Only a stable Team Lite release may be deployed.");
  }
  const buildVersion = String(release?.buildVersion || "").trim();
  parseVersion(buildVersion, "Team Lite buildVersion");
  const currentVersion = String(expectedCurrentVersion || "3.4.30").trim();
  parseVersion(currentVersion, "currently deployed Team Lite version");
  if (compareStableVersions(buildVersion, currentVersion) <= 0) {
    throw new Error("Team Lite buildVersion must be newer than the currently deployed version " + currentVersion + ".");
  }
  if (String(release?.coreVersion || "") !== String(expectedCoreVersion || "3.4.7")) {
    throw new Error("Team Lite coreVersion does not match the approved Normal core version.");
  }
  if (requestedVersion && String(requestedVersion).trim() !== buildVersion) {
    throw new Error("The manually supplied release_version does not match team-lite/release.json.");
  }
  const scriptUrl = String(release?.scriptUrl || "");
  if (readHeader(script, "version") !== buildVersion) {
    throw new Error("Team Lite userscript @version does not match the release manifest.");
  }
  if (readHeader(script, "updateURL") !== scriptUrl || readHeader(script, "downloadURL") !== scriptUrl) {
    throw new Error("Team Lite userscript update/download URLs do not match the release manifest.");
  }
  if (scriptUrl !== "https://raw.githubusercontent.com/Reekyi/UpStatus/team-lite-official/team-lite/upstatus-team-lite.user.js") {
    throw new Error("Team Lite release URL must point to the official Team Lite branch.");
  }
  return { buildVersion, coreVersion: String(release.coreVersion), scriptUrl };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const release = JSON.parse(fs.readFileSync(path.join(root, "team-lite/release.json"), "utf8"));
  const script = fs.readFileSync(path.join(root, "team-lite/upstatus-team-lite.user.js"), "utf8");
  const result = assertTeamLiteRelease({
    release,
    script,
    expectedCurrentVersion: process.env.EXPECTED_CURRENT_TEAM_LITE_VERSION || "3.4.30",
    expectedCoreVersion: process.env.EXPECTED_TEAM_LITE_CORE_VERSION || "3.4.7",
    requestedVersion: process.argv[2] || "",
  });
  console.log("Verified Team Lite stable release " + result.buildVersion + " is newer than the deployed version and matches the official manifest.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error("Team Lite release preflight failed: " + error.message);
    process.exitCode = 1;
  }
}
