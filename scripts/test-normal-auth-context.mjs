import assert from "node:assert/strict";
import { createAuthContext } from "../src/server/normal-3.4.7/modules/auth-context.js";

{
  const calls = [];
  const { contextName } = createAuthContext({
    userFromToken: async () => { calls.push("normal"); return "Ricardo"; },
    expireLucca: async () => { calls.push("lucca-expire"); return {}; },
    luccaToken: () => { calls.push("lucca-token"); return ""; },
    expireYcaro: async () => { calls.push("ycaro-expire"); return {}; },
    ycaroToken: () => { calls.push("ycaro-token"); return ""; }
  });
  assert.deepEqual(await contextName(new Request("https://example.test")), { name: "Ricardo", guest: false, joinedAt: 0 });
  assert.deepEqual(calls, ["normal"]);
}

{
  const joinedAt = "2026-11-26T10:00:00.000Z";
  const calls = [];
  const { contextName } = createAuthContext({
    userFromToken: async () => null,
    expireLucca: async () => { calls.push("lucca-expire"); return { online: true, session: "l1", joinedAt }; },
    luccaToken: () => { calls.push("lucca-token"); return "l1"; },
    expireYcaro: async () => { calls.push("ycaro-expire"); return { online: true, session: "y1" }; },
    ycaroToken: () => { calls.push("ycaro-token"); return "y1"; }
  });
  assert.deepEqual(await contextName(new Request("https://example.test")), { name: "Lucca", guest: true, joinedAt: Date.parse(joinedAt) });
  assert.deepEqual(calls, ["lucca-expire", "lucca-token"]);
}

{
  const { contextName } = createAuthContext({
    userFromToken: async () => null,
    expireLucca: async () => ({ online: false, session: null }),
    luccaToken: () => "l1",
    expireYcaro: async () => ({ online: true, session: "y1", joinedAt: null }),
    ycaroToken: () => "y1"
  });
  const result = await contextName(new Request("https://example.test"));
  assert.equal(result.name, "Ycaro");
  assert.equal(result.guest, true);
  assert.ok(result.joinedAt > 0);
}

{
  const { contextName } = createAuthContext({
    userFromToken: async () => null,
    expireLucca: async () => ({ online: false, session: null }),
    luccaToken: () => "wrong",
    expireYcaro: async () => ({ online: false, session: null }),
    ycaroToken: () => "wrong"
  });
  assert.equal(await contextName(new Request("https://example.test")), null);
}

console.log("PASS: authentication context resolution");
