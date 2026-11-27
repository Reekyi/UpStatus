import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";
import { createRemoteStatusHandler } from "../src/server/normal-3.4.7/modules/remote-status.js";

const { response } = createHttpHelpers({});
function harness({ state = { commands: {}, results: {} }, isAdmin = true, roster = [{ name: "Ricardo" }, { name: "Guilherme" }], body = {} } = {}) {
  const writes = [];
  const store = createRemoteStatusHandler({
    stateValue: async () => state,
    setState: async (key, value) => { writes.push({ key, value: structuredClone(value) }); },
    admin: async () => isAdmin,
    response,
    readBody: async () => body,
    members: async () => roster,
    randomBytes: () => Buffer.from("0123456789")
  });
  return { ...store, writes, state };
}

{
  const { remoteRoute } = harness({ state: { commands: { Ricardo: { id: "c1", status: "busy" } }, results: {} } });
  const result = await remoteRoute(new Request("https://example.test/api/remote-status", { method: "GET" }), "Ricardo");
  assert.deepEqual(await result.json(), { pending: true, command: { id: "c1", status: "busy" } });
}

{
  const { remoteRoute } = harness({ isAdmin: false });
  const result = await remoteRoute(new Request("https://example.test/api/remote-status/result?id=x", { method: "GET" }), "Ricardo");
  assert.equal(result.status, 403);
}

{
  const { remoteRoute } = harness({ state: { commands: {}, results: {} }, body: { commandId: "missing", ok: true } });
  const result = await remoteRoute(new Request("https://example.test/api/remote-status/result", { method: "POST" }), "Guilherme");
  assert.equal(result.status, 404);
}

{
  const state = { commands: { Guilherme: { id: "c1", sender: "Ricardo", status: "busy", reason: "Reunião" } }, results: {} };
  const { remoteRoute, writes } = harness({ state, body: { commandId: "c1", ok: false, error: "Falhou" } });
  const result = await remoteRoute(new Request("https://example.test/api/remote-status/result", { method: "POST" }), "Guilherme");
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal(state.commands.Guilherme, undefined);
  assert.equal(state.results.c1.ok, false);
  assert.equal(state.results.c1.error, "Falhou");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, "remote-status");
}

{
  const { remoteRoute } = harness({ isAdmin: false, body: { target: "Guilherme", status: "busy", reason: "Reunião" } });
  const result = await remoteRoute(new Request("https://example.test/api/remote-status", { method: "POST" }), "Ricardo");
  assert.equal(result.status, 403);
}

{
  const { remoteRoute } = harness({ body: { target: "Ricardo", status: "busy", reason: "Reunião" } });
  const result = await remoteRoute(new Request("https://example.test/api/remote-status", { method: "POST" }), "Ricardo");
  assert.equal(result.status, 400);
}

{
  const { remoteRoute } = harness({ body: { target: "Guilherme", status: "busy", reason: "Reunião" } });
  const result = await remoteRoute(new Request("https://example.test/api/remote-status", { method: "POST" }), "Ricardo");
  const payload = await result.json();
  assert.equal(result.status, 200);
  assert.equal(payload.commandId, "30313233343536373839");
  assert.equal(payload.command.sender, "Ricardo");
  assert.equal(payload.command.target, "Guilherme");
  assert.equal(payload.command.status, "busy");
  assert.equal(payload.command.reason, "Reunião");
}

console.log("PASS: remote status queue and result handlers");
