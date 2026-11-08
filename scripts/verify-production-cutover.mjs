#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PRODUCTION_HOST = "dlfvkawaiqduhlazsszm.supabase.co";
export const REQUIRED_SETUP_MIGRATIONS = [
  "20261107010000_setup_invites.sql",
  "20261107060000_normalize_setup_invite_role.sql",
  "20261107062000_preserve_setup_invite_roles_verbatim.sql",
];

export function parseDeployedFunctions(workflow) {
  const matches = [...String(workflow || "").matchAll(
    /^\s*(?:run:\s*)?supabase\s+functions\s+deploy\s+([a-z0-9-]+)\b/gm
  )];
  return [...new Set(matches.map(match => match[1]))];
}

export function hasAuthEnrollmentTestInvocation(validateScript) {
  const source = String(validateScript || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const normalInvocation = /^[ \t]*execFileSync\s*\(\s*process\.execPath\s*,\s*\[\s*path\.join\s*\(\s*ROOT\s*,\s*(?:["']scripts\/auth-enrollment\.test\.mjs["']|["']scripts["']\s*,\s*["']auth-enrollment\.test\.mjs["'])\s*\)\s*,\s*["']normal["']\s*\]\s*,\s*\{\s*stdio\s*:\s*["']inherit["']\s*\}\s*\)\s*;[ \t]*$/m;
  return normalInvocation.test(source);
}

export function evaluateProductionCutover({
  manifest,
  workflow,
  availableSources = [],
  serverSource = "",
  availableMigrations = [],
  authEnrollmentTestPresent = false,
}) {
  const issues = [];
  const distributionFunction = String(manifest?.productionFunction || "").trim();
  const apiFunction = String(manifest?.productionApiFunction || "").trim();
  const apiBase = String(manifest?.productionApiBase || "").trim();
  const deployedFunctions = parseDeployedFunctions(workflow);
  const sourceSet = new Set(availableSources);
  const migrationSet = new Set(availableMigrations);

  const validSlug = value => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
  if (!validSlug(distributionFunction)) issues.push("productionFunction is missing or invalid.");
  if (!validSlug(apiFunction)) issues.push("productionApiFunction is missing or invalid.");

  const requiredFunctions = new Set([distributionFunction, apiFunction].filter(Boolean));
  for (const fn of requiredFunctions) {
    if (!deployedFunctions.includes(fn)) {
      issues.push('Required runtime "' + fn + '" is not deployed by deploy-production.yml.');
    }
    if (!sourceSet.has(fn)) {
      issues.push('Required runtime source "supabase/functions/' + fn + '/index.ts" is not versioned/generated.');
    }
  }
  for (const fn of deployedFunctions) {
    if (!requiredFunctions.has(fn)) {
      issues.push('Unexpected production runtime "' + fn + '" is included in deploy-production.yml.');
    }
  }
  if (apiFunction && distributionFunction && apiFunction !== distributionFunction) {
    const apiIndex = deployedFunctions.indexOf(apiFunction);
    const distributionIndex = deployedFunctions.indexOf(distributionFunction);
    if (apiIndex >= 0 && distributionIndex >= 0 && apiIndex > distributionIndex) {
      issues.push("Production API runtime must be deployed before the userscript distribution runtime.");
    }
  }

  const setupInviteReady =
    serverSource.includes("async function issueSetupInvite(req:Request,adminName:string)") &&
    serverSource.includes("if(!await admin(adminName))") &&
    serverSource.includes('randomBytes(32).toString("hex")') &&
    serverSource.includes("setup_token_hash:tokenHash(raw)") &&
    serverSource.includes("consume_upstatus_setup_invite") &&
    serverSource.includes("p_setup_token_hash:tokenHash(setupToken)") &&
    serverSource.includes('const enrolledRole=String(enrolled.role||"");') &&
    serverSource.includes('const sessionRole=enrolledRole.trim()?enrolledRole:"implementation_user";') &&
    !/if\s*\(\s*setup\s*\)\s*\{\s*if\s*\(\s*a\.password_hash/.test(serverSource);
  if (!setupInviteReady) {
    issues.push("AUTH-03 is not release-ready: first-access setup must use an admin-issued 256-bit invite, atomic consumption, stored-role preservation, and no first-caller claim.");
  }
  if (!authEnrollmentTestPresent) {
    issues.push("AUTH-03 regression test is missing or is not wired into scripts/validate.mjs.");
  }

  const clearStart = serverSource.indexOf('if(path==="/api/chat/clear"&&req.method==="POST"){');
  const clearBlock = clearStart >= 0 ? serverSource.slice(clearStart, clearStart + 700) : "";
  const storedRoleClear = /if\s*\(\s*name\s*!==\s*["']Ricardo["']\s*\|\|\s*!\s*\(?\s*await\s+admin\(name\)\s*\)?\s*\)/.test(clearBlock);
  if (!storedRoleClear) {
    issues.push("Chat clear must require Ricardo and the persisted implementation_admin role.");
  }

  const adminStart = serverSource.indexOf("async function admin(");
  const adminEnd = adminStart >= 0 ? serverSource.indexOf("\nasync function ", adminStart + 1) : -1;
  const adminBlock = adminStart >= 0
    ? serverSource.slice(adminStart, adminEnd > adminStart ? adminEnd : adminStart + 1200)
    : "";
  const storedRoleAdmin = /const a\s*=\s*await account\(name\)\s*;[\s\S]*?return a\?\.role\s*===\s*["']implementation_admin["']\s*;/.test(adminBlock);
  if (!storedRoleAdmin) {
    issues.push("Administrative authorization must derive only from the persisted implementation_admin role.");
  }

  const deleteStart = serverSource.indexOf("async function deleteRoute(");
  const deleteEnd = deleteStart >= 0 ? serverSource.indexOf("\nasync function ", deleteStart + 1) : -1;
  const deleteBlock = deleteStart >= 0
    ? serverSource.slice(deleteStart, deleteEnd > deleteStart ? deleteEnd : deleteStart + 1800)
    : "";
  const storedRoleDelete = storedRoleAdmin &&
    /const isAdmin\s*=\s*await admin\(name\)\s*;/.test(deleteBlock) &&
    /if\s*\(\s*data\.user_name\s*!==\s*name\s*&&\s*!isAdmin\s*\)\s*return response\([\s\S]*?,\s*403\s*\)\s*;/.test(deleteBlock);
  if (!storedRoleDelete) {
    issues.push("Message deletion must allow the owner and require the persisted implementation_admin role for another user's message.");
  }

  if (/\["Ricardo","Lohan","Guilherme"\]\.includes\(name\)\s*\?\s*["']implementation_admin["']/.test(serverSource)) {
    issues.push("Setup must not grant implementation_admin by hard-coded account name.");
  }

  for (const migration of REQUIRED_SETUP_MIGRATIONS) {
    if (!migrationSet.has(migration)) {
      issues.push("Required AUTH-03 migration source is missing: supabase/migrations/" + migration);
    }
  }

  if (/\bsupabase\s+(?:db\s+push|migration\s+up)\b/.test(String(workflow || ""))) {
    issues.push("Production workflow must not apply database migrations automatically.");
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
  const serverTemplatePath = path.join(ROOT, "src", "server", "index.template.ts");
  const validateScriptPath = path.join(ROOT, "scripts", "validate.mjs");
  const authTestPath = path.join(ROOT, "scripts", "auth-enrollment.test.mjs");
  const migrationsPath = path.join(ROOT, "supabase", "migrations");
  if (!fs.existsSync(manifestPath) || !fs.existsSync(workflowPath) ||
      !fs.existsSync(serverTemplatePath) || !fs.existsSync(validateScriptPath) ||
      !fs.existsSync(migrationsPath)) {
    throw new Error("Build manifest, production workflow, server template, validate script or migration directory is missing; refusing to assume cutover readiness.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const serverSource = fs.readFileSync(serverTemplatePath, "utf8");
  const validateScript = fs.readFileSync(validateScriptPath, "utf8");
  const authEnrollmentTestPresent =
    fs.existsSync(authTestPath) && hasAuthEnrollmentTestInvocation(validateScript);
  const required = [...new Set([
    String(manifest.productionFunction || ""),
    String(manifest.productionApiFunction || ""),
  ].filter(Boolean))];
  const availableSources = required.filter(fn =>
    fs.existsSync(path.join(ROOT, "supabase", "functions", fn, "index.ts"))
  );
  const availableMigrations = fs.readdirSync(migrationsPath);
  const result = evaluateProductionCutover({
    manifest,
    workflow,
    availableSources,
    serverSource,
    availableMigrations,
    authEnrollmentTestPresent,
  });

  if (result.ready) {
    console.log("PASS production distribution/API alignment, AUTH-03 setup enrollment regression, stored-role chat clear and message deletion, and required migration sources are present.");
    return;
  }

  console.error("PRODUCTION CUTOVER BLOCKED: runtime alignment or release security gates are incomplete.");
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
