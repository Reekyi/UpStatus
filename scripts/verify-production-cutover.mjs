#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PRODUCTION_HOST = "dlfvkawaiqduhlazsszm.supabase.co";

export function parseDeployedFunctions(workflow) {
  const matches = [...String(workflow || "").matchAll(
    /^\s*(?:run:\s*)?supabase\s+functions\s+deploy\s+([a-z0-9-]+)\b/gm
  )];
  return [...new Set(matches.map(match => match[1]))];
}

export function evaluateProductionCutover({ manifest, workflow, availableSources = [] }) {
  const issues = [];
  const distributionFunction = String(manifest?.productionFunction || "").trim();
  const apiFunction = String(manifest?.productionApiFunction || "").trim();
  const apiBase = String(manifest?.productionApiBase || "").trim();
  const deployedFunctions = parseDeployedFunctions(workflow);
  const sourceSet = new Set(availableSources);

  const validSlug = value => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
  if (!validSlug(distributionFunction)) issues.push("productionFunction is missing or invalid.");
  if (!validSlug(apiFunction)) issues.push("productionApiFunction is missing or invalid.");

  for (const fn of [...new Set([distributionFunction, apiFunction].filter(Boolean))]) {
    if (!deployedFunctions.includes(fn)) {
      issues.push('Required runtime "' + fn + '" is not deployed by deploy-production.yml.');
    }
    if (!sourceSet.has(fn)) {
      issues.push('Required runtime source "supabase/functions/' + fn + '/index.ts" is not versioned/generated.');
    }
  }

  try {
    const url = new URL(apiBase);
    if (url.protocol !== "https:" || url.hostname !== EXPECTED_PRODUCTION_HOST ||
        url.pathname !== "/functions/v1/" + apiFunction || url.search || url.hash || url.username || url.password) {
      issues.push("productionApiBase does not resolve exactly to the approved production API function.");
    }
  } catch {
    issues.push("productionApiBase is missing or invalid.");
  }

  return {
    ready: issues.length === 0,
    distributionFunction,
    apiFunction,
    deployedFunctions,
    issues,
  };
}

function main() {
  const enforce = process.argv.includes("--enforce");
  const manifestPath = path.join(ROOT, "dist", "build-manifest.json");
  const workflowPath = path.join(ROOT, ".github", "workflows", "deploy-production.yml");
  if (!fs.existsSync(manifestPath) || !fs.existsSync(workflowPath)) {
    throw new Error("Build manifest or production workflow is missing; refusing to assume cutover readiness.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const required = [...new Set([
    String(manifest.productionFunction || ""),
    String(manifest.productionApiFunction || ""),
  ].filter(Boolean))];
  const availableSources = required.filter(fn =>
    fs.existsSync(path.join(ROOT, "supabase", "functions", fn, "index.ts"))
  );
  const result = evaluateProductionCutover({ manifest, workflow, availableSources });

  if (result.ready) {
    console.log("PASS production distribution and API runtimes are both included in the deploy workflow and have versioned sources.");
    return;
  }

  console.error("PRODUCTION CUTOVER BLOCKED: artifact and API runtime are not deployable as one coordinated release.");
  for (const issue of result.issues) console.error("- " + issue);
  if (enforce) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error("Production cutover preflight failed: " + error.message);
    process.exitCode = 1;
  }
}
