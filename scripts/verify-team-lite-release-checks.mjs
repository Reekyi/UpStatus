#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_TEAM_LITE_RELEASE_CHECKS = Object.freeze(["offline_guard", "validate"]);
const ALLOWED_SKIPPED_CHECKS = new Set(["deploy", "Supabase Preview"]);

export function assertSuccessfulTeamLiteReleaseChecks(payload, { releaseSha } = {}) {
  const expectedSha = String(releaseSha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
    throw new Error("Exact merged Team Lite release SHA is required to verify checks.");
  }

  const checks = payload?.check_runs;
  const total = Number(payload?.total_count);
  if (!Array.isArray(checks) || !Number.isInteger(total) || total < 1 || total >= 100 || checks.length !== total) {
    throw new Error("GitHub Team Lite check-run history is empty, truncated or invalid.");
  }
  if (checks.some(check => String(check?.head_sha || "").toLowerCase() !== expectedSha)) {
    throw new Error("GitHub returned Team Lite checks that are not bound to the exact merged release SHA.");
  }

  for (const check of checks) {
    const name = String(check?.name || "");
    if (!name) throw new Error("An unnamed Team Lite release check cannot be accepted.");
    if (check?.status !== "completed") {
      throw new Error("Check " + name + " is not completed.");
    }
    if (check.conclusion === "success") continue;
    if (check.conclusion === "skipped" && ALLOWED_SKIPPED_CHECKS.has(name)) continue;
    throw new Error("Check " + name + " must succeed; only deploy and Supabase Preview may be skipped.");
  }

  for (const requiredName of REQUIRED_TEAM_LITE_RELEASE_CHECKS) {
    const matches = checks.filter(check =>
      check?.name === requiredName &&
      check?.app?.slug === "github-actions" &&
      String(check?.head_sha || "").toLowerCase() === expectedSha
    );
    if (!matches.some(check => check.status === "completed" && check.conclusion === "success")) {
      throw new Error("Required Team Lite release check " + requiredName + " is missing or not successful on the exact release SHA.");
    }
  }

  return checks.length;
}

async function main() {
  const [checksPath, releaseSha] = process.argv.slice(2);
  if (!checksPath || !releaseSha) {
    throw new Error("Usage: verify-team-lite-release-checks.mjs <check-runs.json> <release-sha>");
  }
  const payload = JSON.parse(fs.readFileSync(path.resolve(checksPath), "utf8"));
  const count = assertSuccessfulTeamLiteReleaseChecks(payload, { releaseSha });
  console.log("Verified " + count + " successful/explicitly optional Team Lite check-runs on exact release SHA " + releaseSha + ".");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("Team Lite release-check provenance failed: " + error.message);
    process.exitCode = 1;
  });
}
