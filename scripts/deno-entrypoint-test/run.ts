import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

(globalThis as any).EdgeRuntime = {
  waitUntil(promise: Promise<unknown>) { void promise; }
};
Deno.env.set("SUPABASE_URL", "https://mock-project.supabase.co");
Deno.env.set("SUPABASE_SECRET_KEYS", JSON.stringify({ default: "offline-test-key" }));

const base = "http://127.0.0.1:8000";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request(path: string, init?: RequestInit) {
  return await fetch(base + path, init);
}

try {
  await import("../../dist/modular-normal-candidate/index.ts");

  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await request("/health");
      if (response.status === 200) { ready = true; break; }
    } catch { await sleep(100); }
  }
  assert(ready, "Deno.serve entrypoint did not become available on port 8000");

  {
    const response = await request("/health");
    assertEquals(response.status, 200);
    assertEquals(response.headers.get("content-type"), "application/json; charset=utf-8");
    assertEquals(response.headers.get("access-control-allow-origin"), "*");
    assertEquals(await response.json(), { ok: true, service: "UpStatus", version: "3.4.7" });
  }
  {
    const response = await request("/api/chat", { method: "OPTIONS" });
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "ok");
    assertEquals(response.headers.get("access-control-allow-origin"), "*");
  }
  {
    const response = await request("/api/me");
    assertEquals(response.status, 200);
    assertEquals(await response.json(), {
      authenticated: false, name: null, role: null, canViewHistory: false, needsSetup: false
    });
  }
  {
    const response = await request("/api/status");
    assertEquals(response.status, 401);
    assertEquals(await response.json(), { error: "Faça login para continuar." });
  }
  {
    const response = await request("/api/not-a-route");
    assertEquals(response.status, 401); // Authentication gate intentionally precedes protected 404.
  }
  {
    const response = await request("/api/account?name=Ricardo");
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { needsSetup: true });
  }
  {
    const response = await request("/api/members");
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { members: [{ name: "Guilherme" }, { name: "Lohan" }, { name: "Ricardo" }] });
  }
  {
    const response = await request("/upstatus.user.js");
    assertEquals(response.status, 200);
    assertStringIncludes(response.headers.get("content-type") || "", "text/javascript");
    assertStringIncludes(await response.text(), "UpStatus");
  }
  {
    const response = await request("/lucca");
    assertEquals(response.status, 200);
    assertStringIncludes(response.headers.get("content-type") || "", "text/html");
    assertStringIncludes(await response.text(), "Lucca Maluco");
  }
  {
    const response = await request("/ycaro");
    assertEquals(response.status, 200);
    assertStringIncludes(response.headers.get("content-type") || "", "text/html");
  }
  {
    (globalThis as any).__upstatusMockDbError = true;
    const response = await request("/api/account?name=Ricardo");
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock database failure" });
    assertEquals(response.headers.get("access-control-allow-origin"), "*");
  }

  console.log("PASS: isolated Deno entrypoint HTTP, CORS, auth gate, static assets and global error boundary");
} catch (error) {
  console.error(error);
  Deno.exit(1);
}
Deno.exit(0);
