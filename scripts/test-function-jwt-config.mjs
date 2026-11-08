#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function readFunctionVerifyJwt(configText, functionSlug) {
  const slug = String(functionSlug || "").trim();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    throw new Error("Function slug is missing or invalid.");
  }

  const lines = String(configText || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const header = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/.exec(line);
    if (header) {
      const sectionName = header[1].trim();
      const match = /^functions\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/.exec(sectionName);
      current = match ? match[1] : null;
      if (current === slug) {
        sections.push({ slug: current, verifyJwt: [] });
      }
      continue;
    }

    if (current !== slug) continue;
    if (!/^\s*verify_jwt\b/.test(line)) continue;

    const setting = /^\s*verify_jwt\s*=\s*(true|false)\s*(?:#.*)?$/.exec(line);
    if (!setting) {
      throw new Error("Function " + slug + " has a malformed verify_jwt setting.");
    }
    sections[sections.length - 1].verifyJwt.push(setting[1] === "true");
  }

  if (sections.length !== 1) {
    throw new Error("supabase/config.toml must contain exactly one [functions." + slug + "] section.");
  }
  if (sections[0].verifyJwt.length !== 1) {
    throw new Error("Function " + slug + " must define verify_jwt exactly once.");
  }
  return sections[0].verifyJwt[0];
}

export function assertFunctionUsesCustomHandlerAuth(configText, functionSlug) {
  const verifyJwt = readFunctionVerifyJwt(configText, functionSlug);
  if (verifyJwt !== false) {
    throw new Error("Function " + functionSlug + " must keep verify_jwt = false because its handler validates the custom UpStatus session token.");
  }
  return true;
}

function expectThrow(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) throw new Error("Expected rejection: " + label);
  console.log("PASS rejects " + label);
}

function run() {
  const configPath = path.join(ROOT, "supabase", "config.toml");
  const configText = fs.readFileSync(configPath, "utf8");
  const slugs = process.argv.slice(2);
  if (!slugs.length) slugs.push("upstatus-team-lite");

  for (const slug of slugs) {
    assertFunctionUsesCustomHandlerAuth(configText, slug);
    console.log("PASS " + slug + " has exactly one verify_jwt = false setting.");
  }

  const valid = "[functions.example]\nverify_jwt = false\n";
  if (readFunctionVerifyJwt(valid, "example") !== false) {
    throw new Error("Valid false setting was not parsed.");
  }
  expectThrow("missing function section", () => readFunctionVerifyJwt("", "example"));
  expectThrow("missing verify_jwt setting", () => readFunctionVerifyJwt("[functions.example]\n", "example"));
  expectThrow("verify_jwt = true", () => assertFunctionUsesCustomHandlerAuth("[functions.example]\nverify_jwt = true\n", "example"));
  expectThrow("duplicate function section", () => readFunctionVerifyJwt(valid + valid, "example"));
  expectThrow("duplicate verify_jwt setting", () => readFunctionVerifyJwt("[functions.example]\nverify_jwt = false\nverify_jwt = false\n", "example"));
  expectThrow("malformed verify_jwt setting", () => readFunctionVerifyJwt("[functions.example]\nverify_jwt = maybe\n", "example"));
  expectThrow("comment-only verify_jwt", () => readFunctionVerifyJwt("[functions.example]\n# verify_jwt = false\n", "example"));

  console.log("Team Lite deploy JWT configuration guard passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    console.error("Team Lite deploy JWT configuration guard failed: " + error.message);
    process.exitCode = 1;
  }
}
