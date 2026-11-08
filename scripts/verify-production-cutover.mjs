#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PRODUCTION_HOST = "dlfvkawaiqduhlazsszm.supabase.co";
export const DEPLOYED_STABLE_VERSION = "3.4.7";
export const REQUIRED_SETUP_MIGRATIONS = [
  "20261107010000_setup_invites.sql",
  "20261107060000_normalize_setup_invite_role.sql",
  "20261107062000_preserve_setup_invite_roles_verbatim.sql",
];
export const REQUIRED_RT01_MIGRATIONS = [
  "20261029170500_restrict_trigger_function_execute.sql",
  "20261029183000_revoke_unused_public_table_grants.sql",
  "20261029205000_server_mediated_signaling.sql",
  "20261030120000_signal_room_invitation_consent.sql",
  "20261030150000_signal_membership_legacy_default.sql",
  "20261030190000_allow_legacy_signaling_envelopes.sql",
  "20261030192000_signal_room_bindings.sql",
  "20261103160000_minimize_public_chat_broadcast.sql",
  "20261103170000_minimize_public_status_broadcasts.sql",
  "20261103171000_index_signal_room_bindings_created_by.sql",
  "20261105150000_revoke_public_default_privileges_postgres.sql",
  "20261105160000_merge_chat_read_receipts.sql",
  "20261105190000_open_voice_room_membership.sql",
  "20261106080200_call_room_attempt_recovery.sql",
  "20261106111000_call_attempt_foreign_key_indexes.sql",
  "20261106120500_voice_room_attempt_recovery.sql",
  "20261107170000_pin_empty_search_path_trigger_broadcasts.sql",
  "20261108010000_voice_attempt_singleton.sql",
  "20261108050751_voice_attempt_account_scoped_lock.sql",
  "20261108190000_distributed_signaling_rate_limit.sql",
];
export const REQUIRED_PRODUCTION_MIGRATIONS = [...REQUIRED_SETUP_MIGRATIONS, ...REQUIRED_RT01_MIGRATIONS];
export const REQUIRED_SIGNALING_FUNCTION = "upstatus-signal";

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

export function isStableReleaseVersion(version, preRelease = "") {
  if (String(preRelease || "").trim()) return false;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(String(version || "").trim());
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  if (!parts.every(Number.isSafeInteger)) return false;
  const deployed = DEPLOYED_STABLE_VERSION.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (parts[index] !== deployed[index]) return parts[index] > deployed[index];
  }
  return false;
}

function functionWindow(source, name, limit = 2400) {
  const start = source.indexOf("function " + name + "(");
  return start >= 0 ? source.slice(start, start + limit) : "";
}

export function inspectAuthenticatedMediaSignaling(userscriptSource) {
  const source = String(userscriptSource || "");
  const issues = [];
  const flagAssignments = [...source.matchAll(/\b(?:var|let|const)\s+signalTransportFlag\s*=\s*([^;]+);/g)];
  if (flagAssignments.length !== 1 || flagAssignments[0][1].trim() !== "true") {
    issues.push("RT-01 is not release-ready: authenticated media signaling must be forced on; missing, configurable, or default-off flags are unsafe.");
  }
  if (/GM_(?:get|set)Value\s*\(\s*key\s*\+\s*["']signaling_transport_enabled["']/.test(source)) {
    issues.push("RT-01 is not release-ready: userscript storage must not be able to disable authenticated media signaling.");
  }
  if (!/signalTransportEndpoint\s*=\s*[^;]*["']\/functions\/v1\/upstatus-signal["']/.test(source)) {
    issues.push("RT-01 is not release-ready: the client must pin the production /functions/v1/upstatus-signal endpoint.");
  }
  if (!["signalTransport.sendSignal", "signalTransport.sendToRoom", "signalTransport.startPolling"].every(marker => source.includes(marker))) {
    issues.push("RT-01 is not release-ready: calls, voice rooms, and screen sharing must use the authenticated server-mediated transport.");
  }

  const receiverPresent = /(?:async\s+)?function\s+receiveCallSignal\s*\(\s*p\s*,\s*authenticatedSource\s*\)/.test(source);
  const outOfBandGate = /signalTransportFlag\s*&&\s*!authenticatedSource\s*&&\s*!isAllowedPublicCallDiscoverySignal\s*\(\s*p\s*\)/.test(source);
  if (!receiverPresent || !outOfBandGate) {
    issues.push("RT-01 is not release-ready: call-signal provenance must be passed out-of-band and checked separately from the payload.");
  }
  if (source.includes("_authenticatedTransport")) {
    issues.push("RT-01 is not release-ready: payload-controlled _authenticatedTransport markers must not be trusted or present.");
  }

  const allowlistMatch = /(?:export\s+)?function\s+isAllowedPublicCallDiscoverySignal\s*\(\s*signal\s*\)\s*\{([\s\S]*?)\n\s*\}/.exec(source);
  if (!allowlistMatch) {
    issues.push("RT-01 is not release-ready: the public call-discovery allowlist is missing.");
  } else {
    const body = allowlistMatch[1];
    const ownType = /Object\.prototype\.hasOwnProperty\.call\(signal,\s*["']type["']\)/.test(body);
    const ownDiscovery = /Object\.prototype\.hasOwnProperty\.call\(signal,\s*["']discoveryOnly["']\)/.test(body);
    const allowedTypes = /\(\s*signal\.type\s*===\s*["']presence["']\s*\|\|\s*signal\.type\s*===\s*["']ended["']\s*\)/.test(body);
    const discoveryOnly = /signal\.discoveryOnly\s*===\s*true/.test(body);
    if (!ownType || !ownDiscovery || !allowedTypes || !discoveryOnly || /join_declined/.test(body)) {
      issues.push("RT-01 is not release-ready: public call discovery must allow only own-property presence/ended hints with discoveryOnly=true.");
    }
  }

  if (!source.includes("await receiveCallSignal(p,true);")) {
    issues.push("RT-01 is not release-ready: authenticated room polling must mark provenance out-of-band.");
  }
  if (!/receiveCallSignal\(\s*\{[^;]{0,1200}\}\s*,\s*true\s*\)/.test(source)) {
    issues.push("RT-01 is not release-ready: authenticated invitations must mark provenance out-of-band.");
  }
  if (!source.includes("receiveCallSignal(payload&&payload.payload||{},false);")) {
    issues.push("RT-01 is not release-ready: public Realtime call signals must always enter the untrusted receive path.");
  }

  const discoveryTypes = [...source.matchAll(/sendRealtimeEvent\s*\(\s*["']call_signal["']\s*,\s*\{\s*type\s*:\s*["']([^"']+)["'][^}]*?discoveryOnly\s*:\s*true[^}]*\}\s*\)/g)]
    .map(match => match[1])
    .sort();
  if (discoveryTypes.join(",") !== "ended,presence") {
    issues.push("RT-01 is not release-ready: public call-signal publishers must emit only presence and ended discovery hints.");
  }

  const endedHandler = /if\s*\(\s*p\.type\s*===\s*["']ended["']\s*\)\s*\{([^}]*)\}/.exec(source);
  if (!endedHandler || !/delete\s+upCallDirectory\[p\.callId\]\s*;/.test(endedHandler[1]) ||
      /callCleanup|upCall\.active|voiceRoomLeave|screenShare/i.test(endedHandler[1])) {
    issues.push("RT-01 is not release-ready: public ended hints may only remove a call-directory entry, never control an active call.");
  }

  if (!source.includes("if(!signalTransportFlag)voiceRoomReceive(")) {
    issues.push("RT-01 is not release-ready: public voice-room broadcasts must never be consumed as media signaling.");
  }
  if (!source.includes("if(!signalTransportFlag)screenShareReceive(")) {
    issues.push("RT-01 is not release-ready: public screen-share broadcasts must never be consumed as media signaling.");
  }

  const callSend = functionWindow(source, "callSendTo");
  const callSendAll = functionWindow(source, "callSendAll");
  const voiceSend = functionWindow(source, "voiceRoomSend");
  const screenSend = functionWindow(source, "screenShareSend");
  if (!callSend.includes("signalTransport.sendSignal") || !callSendAll.includes("signalTransport.sendToRoom")) {
    issues.push("RT-01 is not release-ready: one-to-one and room call signals must use authenticated server-side delivery.");
  }
  if (!voiceSend.includes("signalTransport.sendSignal") || !voiceSend.includes("signalTransport.sendToRoom")) {
    issues.push("RT-01 is not release-ready: voice-room signaling must use authenticated server-side delivery.");
  }
  if (!screenSend.includes("signalTransport.sendSignal") || !screenSend.includes("signalTransport.sendToRoom")) {
    issues.push("RT-01 is not release-ready: screen-share signaling must use authenticated server-side delivery.");
  }
  return { ready: issues.length === 0, issues };
}
export function evaluateProductionCutover({
  manifest,
  workflow,
  availableSources = [],
  serverSource = "",
  availableMigrations = [],
  authEnrollmentTestPresent = false,
  userscriptSource = "",
  releaseVersion = "",
  releasePreRelease = "",
}) {
  const issues = [];
  if (!isStableReleaseVersion(releaseVersion, releasePreRelease)) {
    issues.push("Production release version must be a stable semantic version greater than deployed " + DEPLOYED_STABLE_VERSION + "; do not republish changed code under the current userscript version.");
  }
  const distributionFunction = String(manifest?.productionFunction || "").trim();
  const apiFunction = String(manifest?.productionApiFunction || "").trim();
  const apiBase = String(manifest?.productionApiBase || "").trim();
  const deployedFunctions = parseDeployedFunctions(workflow);
  const sourceSet = new Set(availableSources);
  const migrationSet = new Set(availableMigrations);

  const validSlug = value => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
  if (!validSlug(distributionFunction)) issues.push("productionFunction is missing or invalid.");
  if (!validSlug(apiFunction)) issues.push("productionApiFunction is missing or invalid.");

  const requiredFunctions = new Set([distributionFunction, apiFunction, REQUIRED_SIGNALING_FUNCTION].filter(Boolean));
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
  const signalingIndex = deployedFunctions.indexOf(REQUIRED_SIGNALING_FUNCTION);
  const apiIndex = deployedFunctions.indexOf(apiFunction);
  const distributionIndex = deployedFunctions.indexOf(distributionFunction);
  if (signalingIndex >= 0 && apiIndex >= 0 && signalingIndex > apiIndex) {
    issues.push("Authenticated signaling runtime must be deployed before the product API runtime.");
  }
  if (signalingIndex >= 0 && distributionIndex >= 0 && signalingIndex > distributionIndex) {
    issues.push("Authenticated signaling runtime must be deployed before userscript distribution.");
  }

  const mediaSignaling = inspectAuthenticatedMediaSignaling(userscriptSource);
  if (!mediaSignaling.ready) issues.push(...mediaSignaling.issues);

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

  for (const migration of REQUIRED_PRODUCTION_MIGRATIONS) {
    if (!migrationSet.has(migration)) {
      issues.push("Required production security/signaling migration source is missing: supabase/migrations/" + migration);
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
  const userscriptTemplatePath = path.join(ROOT, "src", "userscript", "upstatus.user.template.js");
  const signalingAdapterPath = path.join(ROOT, "src", "userscript", "signaling-transport.mjs");
  const validateScriptPath = path.join(ROOT, "scripts", "validate.mjs");
  const authTestPath = path.join(ROOT, "scripts", "auth-enrollment.test.mjs");
  const migrationsPath = path.join(ROOT, "supabase", "migrations");
  if (!fs.existsSync(manifestPath) || !fs.existsSync(workflowPath) ||
      !fs.existsSync(serverTemplatePath) || !fs.existsSync(userscriptTemplatePath) || !fs.existsSync(validateScriptPath) ||
      !fs.existsSync(migrationsPath)) {
    throw new Error("Build manifest, production workflow, server template, validate script or migration directory is missing; refusing to assume cutover readiness.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const release = JSON.parse(fs.readFileSync(path.join(ROOT, "release.json"), "utf8"));
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const serverSource = fs.readFileSync(serverTemplatePath, "utf8");
  const userscriptSource = fs.readFileSync(userscriptTemplatePath, "utf8");
  const signalingAdapterSource = fs.existsSync(signalingAdapterPath) ? fs.readFileSync(signalingAdapterPath, "utf8") : "";
  const validateScript = fs.readFileSync(validateScriptPath, "utf8");
  const authEnrollmentTestPresent =
    fs.existsSync(authTestPath) && hasAuthEnrollmentTestInvocation(validateScript);
  const required = [...new Set([
    String(manifest.productionFunction || ""),
    String(manifest.productionApiFunction || ""),
    REQUIRED_SIGNALING_FUNCTION,
  ].filter(Boolean))];
  const availableSources = required.filter(fn =>
    fs.existsSync(path.join(ROOT, "supabase", "functions", fn, "index.ts"))
  );
  const availableMigrations = fs.readdirSync(migrationsPath);
  const result = evaluateProductionCutover({
    manifest,
    workflow,
    releaseVersion: release.version,
    releasePreRelease: release.preRelease,
    availableSources,
    serverSource,
    userscriptSource: userscriptSource + "\n" + signalingAdapterSource,
    availableMigrations,
    authEnrollmentTestPresent,
  });

  if (result.ready) {
    console.log("PASS production signaling/API/distribution order, mandatory authenticated media signaling, AUTH-03, stored-role chat authorization, and required production migration sources.");
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
