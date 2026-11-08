#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const source = fs.readFileSync("team-lite/upstatus-team-lite.user.js", "utf8");
const testOrigin = "https://team-lite-smoke.invalid";
const testApi = testOrigin + "/functions/v1/upstatus-team-lite";
let smokeSource = source;

function replaceRuntimeString(name, value) {
  const pattern = new RegExp("(var\\s+" + name + "\\s*=\\s*)'[^']*'(?=;)");
  const matches = smokeSource.match(new RegExp(pattern.source, "g")) || [];
  assert.equal(matches.length, 1, "expected exactly one runtime config declaration for " + name);
  smokeSource = smokeSource.replace(pattern, (_match, prefix) => prefix + JSON.stringify(value));
}

replaceRuntimeString("CLOUD_SERVER", testApi);
replaceRuntimeString("UP_REALTIME_URL", testOrigin);
replaceRuntimeString("UP_REALTIME_KEY", "test-public-key");
replaceRuntimeString("UP_REALTIME_TOPIC", "upstatus-team-lite-smoke");
replaceRuntimeString("UPDATE_URL", testOrigin + "/upstatus-team-lite.user.js");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  const blockedPageRequests = [];
  page.on("pageerror", error => pageErrors.push(error.stack || error.message));

  await page.addInitScript(() => {
    const values = new Map();
    window.__upstatusGmWrites = [];
    window.__upstatusGmRequests = [];
    window.__upstatusRealtimeCreateClientCalls = 0;

    window.GM_getValue = (key, fallback) => values.has(key) ? values.get(key) : fallback;
    window.GM_setValue = (key, value) => {
      values.set(key, value);
      window.__upstatusGmWrites.push([key, value]);
    };
    window.GM_xmlhttpRequest = options => {
      const url = String(options.url || "");
      window.__upstatusGmRequests.push({ method: String(options.method || "GET").toUpperCase(), url });
      let pathname = "";
      try { pathname = new URL(url).pathname; } catch (_) {}
      const isMembers = pathname.endsWith("/api/members");
      const body = isMembers
        ? { members: [{ name: "Lucca" }, { name: "Ycaro" }] }
        : { error: "Not found" };
      const response = {
        status: isMembers ? 200 : 404,
        responseText: JSON.stringify(body),
        responseHeaders: "Content-Type: application/json\r\n",
        finalUrl: url
      };
      queueMicrotask(() => {
        if (typeof options.onload === "function") options.onload(response);
      });
      return {
        abort() {
          if (typeof options.onabort === "function") options.onabort();
        }
      };
    };
    window.GM_openInTab = () => ({ close() {} });
    window.supabase = {
      createClient() {
        window.__upstatusRealtimeCreateClientCalls++;
        throw new Error("Realtime must stay idle without a restored session in this smoke test");
      }
    };
  });

  await page.route("**/*", async route => {
    const request = route.request();
    if (request.isNavigationRequest()) {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><head><title>Salesmartly smoke</title></head><body><div id='app'></div></body></html>"
      });
    }
    blockedPageRequests.push(request.url());
    return route.abort("blockedbyclient");
  });

  await page.goto("https://www.salesmartly.com/", { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: smokeSource });
  await page.waitForSelector("#upstatus-team-lite-root", { timeout: 5000 });
  await page.waitForSelector("#upstatus-card #up-enter", { timeout: 5000 });
  await page.waitForTimeout(100);

  const state = await page.evaluate(() => {
    const nameSelect = document.querySelector("#upstatus-card #up-name");
    const serverWrites = window.__upstatusGmWrites.filter(([key]) => key === "upstatus_team_lite_server");
    return {
      rootPresent: !!document.querySelector("#upstatus-team-lite-root"),
      loginButtonPresent: !!document.querySelector("#upstatus-card #up-enter"),
      loginOptions: nameSelect ? Array.from(nameSelect.options).map(option => option.value) : [],
      server: serverWrites.length ? serverWrites[serverWrites.length - 1][1] : null,
      gmRequests: window.__upstatusGmRequests,
      realtimeCreateClientCalls: window.__upstatusRealtimeCreateClientCalls
    };
  });

  assert.equal(state.rootPresent, true, "full userscript IIFE must mount the Team Lite root");
  assert.equal(state.loginButtonPresent, true, "full userscript IIFE must render the login action");
  assert.ok(state.loginOptions.includes("Lucca") && state.loginOptions.includes("Ycaro"),
    "login roster must be populated from the stubbed members response");
  assert.equal(state.server, testApi, "startup must persist the injected test-only API endpoint");
  assert.ok(state.gmRequests.some(request => request.url === testApi + "/api/members"),
    "startup must issue the members request through the Tampermonkey bridge");
  assert.ok(state.gmRequests.every(request => new URL(request.url).hostname === "team-lite-smoke.invalid"),
    "all GM requests must use the inert test-only host");
  assert.equal(state.realtimeCreateClientCalls, 0,
    "Realtime must not initialize while no authenticated session is restored");
  assert.equal(pageErrors.length, 0,
    "full userscript IIFE must initialize without uncaught exceptions: " + pageErrors.join("\n"));
  assert.ok(blockedPageRequests.every(url => !url.includes("dlfvkawaiqduhlazsszm")),
    "the browser smoke must not send page-world requests to the production Supabase project");

  console.log("PASS full Team Lite userscript IIFE mounted the login UI with injected inert endpoints, stubbed GM APIs, no production network, and no uncaught exceptions.");
} finally {
  await browser.close();
}
