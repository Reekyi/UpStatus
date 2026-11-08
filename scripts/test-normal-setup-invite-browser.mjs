#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builtPath = path.join(ROOT, "dist", "upstatus.user.js");
if (!fs.existsSync(builtPath)) throw new Error("Build dist/upstatus.user.js before running the Normal Full-IIFE smoke.");

const original = fs.readFileSync(builtPath, "utf8");
const prefixMatch = original.match(/var key='([^']+)';/);
assert.ok(prefixMatch, "built Normal userscript must contain its rendered storage prefix");
const storagePrefix = prefixMatch[1];

const testOrigin = "https://normal-invite-smoke.invalid";
const testApi = testOrigin + "/functions/v1/upstatus-screen-share-3-1-1-beta10";
const testUpdate = testOrigin + "/upstatus.user.js";
const smokeSource = original
  .replaceAll("https://dlfvkawaiqduhlazsszm.supabase.co", testOrigin)
  .replace(/var CLOUD_SERVER='[^']*';/, "var CLOUD_SERVER='" + testApi + "';")
  .replace(/var UP_REALTIME_TOPIC='[^']*';/, "var UP_REALTIME_TOPIC='upstatus-normal-invite-smoke';")
  .replace(/var UPDATE_URL='[^']*';/, "var UPDATE_URL='" + testUpdate + "';");
assert.ok(smokeSource.includes(testApi), "Normal API endpoint must be replaced with the inert smoke host");
assert.ok(!smokeSource.includes("dlfvkawaiqduhlazsszm"), "production Supabase host must not remain in the injected Full-IIFE");

const browser = await chromium.launch({ headless: true });
const tokenFor = role => role === "implementation_admin" ? "inert-normal-admin-session" : "inert-normal-user-session";

async function createScenario(role, member) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  const blockedPageRequests = [];
  page.on("pageerror", error => pageErrors.push(error.stack || error.message));

  await page.addInitScript(({ role, member, storagePrefix }) => {
    const sessionToken = role === "implementation_admin" ? "inert-normal-admin-session" : "inert-normal-user-session";
    const values = new Map([
      [storagePrefix + "token", sessionToken],
      [storagePrefix + "member", member],
      [storagePrefix + "last_member", member],
      [storagePrefix + "role", role]
    ]);
    window.__normalGmRequests = [];
    window.__normalGmWrites = [];
    window.__normalSetupInviteBodies = [];
    window.__normalClipboard = null;
    window.__normalConsole = [];
    const originalConsole = window.console;
    ["log", "warn", "error"].forEach(name => {
      originalConsole[name] = (...args) => window.__normalConsole.push(args.map(value => String(value)).join(" "));
    });

    window.GM_getValue = (key, fallback) => values.has(key) ? values.get(key) : fallback;
    window.GM_setValue = (key, value) => {
      values.set(key, value);
      window.__normalGmWrites.push([key, value]);
    };
    window.GM_listValues = () => Array.from(values.keys());
    window.GM_deleteValue = key => values.delete(key);
    window.GM_setClipboard = (value, type) => {
      window.__normalClipboard = { value: String(value), type: String(type || "") };
    };
    window.GM_openInTab = () => ({ close() {} });

    window.GM_xmlhttpRequest = options => {
      const url = String(options.url || "");
      const method = String(options.method || "GET").toUpperCase();
      const headers = options.headers || {};
      let parsed;
      try { parsed = new URL(url); } catch (_) {
        if (typeof options.onerror === "function") queueMicrotask(() => options.onerror({ status: 0 }));
        return { abort() {} };
      }
      window.__normalGmRequests.push({ method, url, headers, data: String(options.data || "") });
      if (parsed.hostname !== "normal-invite-smoke.invalid") {
        if (typeof options.onerror === "function") queueMicrotask(() => options.onerror({ status: 0 }));
        return { abort() {} };
      }

      let responseText = JSON.stringify({ ok: true });
      let responseHeaders = "Content-Type: application/json\\r\\n";
      if (parsed.pathname.endsWith("/api/me")) {
        responseText = JSON.stringify({ authenticated: true, name: member, role, canViewHistory: role === "implementation_admin" });
      } else if (parsed.pathname.endsWith("/api/members")) {
        responseText = JSON.stringify({ members: [{ name: "Ricardo" }, { name: "Lohan" }, { name: "Guilherme" }] });
      } else if (parsed.pathname.endsWith("/api/status")) {
        responseText = JSON.stringify({
          members: {
            Ricardo: { name: "Ricardo", status: "online", version: "3.4.7", connected: true, updatedAt: new Date().toISOString() },
            Lohan: { name: "Lohan", status: "away", version: "3.4.7", connected: true, updatedAt: new Date().toISOString() },
            Guilherme: { name: "Guilherme", status: "busy", version: "3.4.7", connected: false, updatedAt: new Date().toISOString() }
          }
        });
      } else if (parsed.pathname.endsWith("/api/chat")) {
        responseText = JSON.stringify({ messages: [], profiles: {} });
      } else if (parsed.pathname.endsWith("/api/profiles")) {
        responseText = JSON.stringify({ profiles: {} });
      } else if (parsed.pathname.endsWith("/api/remote-status")) {
        responseText = JSON.stringify({ pending: false });
      } else if (parsed.pathname.endsWith("/api/health")) {
        responseText = JSON.stringify({
          ok: true,
          version: "3.4.7",
          db: { ok: true, ms: 2 },
          chat: { ok: true, ms: 2 },
          state: { ok: true },
          members: [{ name: "Ricardo", version: "3.4.7", connected: true, seenAt: new Date().toISOString() }]
        });
      } else if (parsed.pathname.endsWith("/api/setup-invite") && method === "POST") {
        let requestBody = {};
        try { requestBody = JSON.parse(options.data || "{}"); } catch (_) {}
        window.__normalSetupInviteBodies.push(requestBody);
        responseText = JSON.stringify({
          name: String(requestBody.name || ""),
          setupToken: "c".repeat(64),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        });
      } else if (parsed.pathname.endsWith("/upstatus.user.js")) {
        responseText = "// ==UserScript==\\n// @version 3.4.7\\n// ==/UserScript==";
        responseHeaders = "Content-Type: text/javascript\\r\\n";
      }

      const response = { status: 200, responseText, responseHeaders, finalUrl: url };
      queueMicrotask(() => { if (typeof options.onload === "function") options.onload(response); });
      return { abort() { if (typeof options.onabort === "function") options.onabort(); } };
    };

    const channel = {
      on() { return this; },
      subscribe(callback) { queueMicrotask(() => { if (typeof callback === "function") callback("SUBSCRIBED"); }); return this; },
      send() { return Promise.resolve("ok"); },
      unsubscribe() { return Promise.resolve("ok"); }
    };
    window.supabase = {
      createClient() {
        return {
          channel() { return channel; },
          removeAllChannels() { return Promise.resolve(); },
          removeChannel() { return Promise.resolve(); }
        };
      }
    };
  }, { role, member, storagePrefix });

  await page.route("**/*", async route => {
    const request = route.request();
    if (request.isNavigationRequest()) {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><head><title>Normal invite Full-IIFE smoke</title></head><body><div id='app'></div></body></html>"
      });
    }
    blockedPageRequests.push(request.url());
    return route.abort("blockedbyclient");
  });
  await page.goto("https://www.salesmartly.com/", { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: smokeSource });
  await page.waitForSelector("#upstatus-root", { timeout: 10000 });
  await page.waitForSelector("#upstatus-card .up-settings-btn", { timeout: 10000 });
  return { page, pageErrors, blockedPageRequests };
}

try {
  // Administrator scenario: the complete Normal IIFE must issue an invite only through the inert API and copy it without exposing it.
  const admin = await createScenario("implementation_admin", "Ricardo");
  await admin.page.locator("#upstatus-bubble").click();
  await admin.page.locator("#upstatus-card .up-settings-btn").click();
  await admin.page.locator("#upstatus-card .up-settings-health").click();
  await admin.page.locator("#upstatus-health .up-setup-invite summary").click();
  await admin.page.locator("#upstatus-health .up-setup-invite-name").fill("Guilherme");
  await admin.page.locator("#upstatus-health .up-setup-invite-generate").click();
  await admin.page.waitForFunction(() => !!window.__normalClipboard && String(window.__normalClipboard.value || "").length === 64, { timeout: 10000 });
  await admin.page.waitForFunction(() => {
    const status = document.querySelector("#upstatus-health .up-setup-invite-status");
    return !!status && status.textContent.includes("Código copiado");
  }, { timeout: 10000 });

  const adminState = await admin.page.evaluate(() => ({
    clipboard: window.__normalClipboard,
    requests: window.__normalGmRequests,
    writes: window.__normalGmWrites,
    inviteBodies: window.__normalSetupInviteBodies,
    console: window.__normalConsole,
    bodyText: document.body.innerText,
    bodyHtml: document.body.innerHTML
  }));
  assert.match(adminState.clipboard.value, /^[0-9a-f]{64}$/);
  assert.equal(adminState.clipboard.type, "text");
  assert.equal(adminState.inviteBodies.length, 1);
  assert.deepEqual(adminState.inviteBodies[0], { name: "Guilherme" });
  const inviteRequest = adminState.requests.find(r => r.url.endsWith("/api/setup-invite") && r.method === "POST");
  assert.ok(inviteRequest, "Normal admin Full-IIFE must call the setup-invite endpoint");
  assert.equal(inviteRequest.headers["X-UpStatus-Token"], "inert-normal-admin-session");
  assert.ok(!adminState.bodyText.includes(adminState.clipboard.value), "raw invite token must not appear in visible DOM text");
  assert.ok(!adminState.bodyHtml.includes(adminState.clipboard.value), "raw invite token must not appear in DOM markup");
  assert.ok(!JSON.stringify(adminState.writes).includes(adminState.clipboard.value), "raw invite token must not be persisted through GM_setValue");
  assert.ok(!adminState.console.join("\\n").includes(adminState.clipboard.value), "raw invite token must not be logged");
  assert.ok(adminState.requests.every(r => new URL(r.url).hostname === "normal-invite-smoke.invalid"), "all Normal GM requests must use the inert test host");
  assert.ok(admin.pageErrors.length === 0, "Normal admin Full-IIFE must not throw");
  assert.ok(admin.blockedPageRequests.every(url => !url.includes("dlfvkawaiqduhlazsszm")), "Normal admin browser smoke must not reach production Supabase");
  console.log("PASS Normal administrator Full-IIFE opens health, issues an invite through the inert API, copies the token, and never renders/persists/logs it.");

  // Ordinary-user scenario: the normal settings menu may be present, but openHealth() must enforce the stored role.
  const ordinary = await createScenario("implementation_user", "Guilherme");
  await ordinary.page.locator("#upstatus-bubble").click();
  await ordinary.page.locator("#upstatus-card .up-settings-btn").click();
  await ordinary.page.locator("#upstatus-card .up-settings-health").click();
  await ordinary.page.waitForTimeout(150);
  const ordinaryState = await ordinary.page.evaluate(() => ({
    healthVisible: !!document.querySelector("#upstatus-health:not(.hidden)"),
    invitePanel: !!document.querySelector("#upstatus-health .up-setup-invite"),
    requests: window.__normalGmRequests,
    clipboard: window.__normalClipboard
  }));
  assert.equal(ordinaryState.healthVisible, false, "ordinary Normal user must not open system health");
  assert.equal(ordinaryState.invitePanel, false, "ordinary Normal user must not receive the setup-invite panel");
  assert.ok(!ordinaryState.requests.some(r => r.url.endsWith("/api/health")), "ordinary Normal user must not call admin health");
  assert.ok(!ordinaryState.requests.some(r => r.url.endsWith("/api/setup-invite")), "ordinary Normal user must not call setup-invite");
  assert.equal(ordinaryState.clipboard, null, "ordinary Normal user must not copy an invite token");
  assert.ok(ordinaryState.requests.every(r => new URL(r.url).hostname === "normal-invite-smoke.invalid"), "ordinary Normal GM traffic must remain on the inert test host");
  assert.ok(ordinary.pageErrors.length === 0, "ordinary Normal Full-IIFE must not throw");
  assert.ok(ordinary.blockedPageRequests.every(url => !url.includes("dlfvkawaiqduhlazsszm")), "ordinary Normal browser smoke must not reach production Supabase");
  console.log("PASS Normal ordinary-user Full-IIFE rejects health/invite access and never calls admin endpoints or copies a token.");
} finally {
  await browser.close();
}
