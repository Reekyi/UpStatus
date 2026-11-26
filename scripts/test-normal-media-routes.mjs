import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createMediaRoutes } from "../src/server/normal-3.4.7/modules/media-routes.js";
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
function harness({ body = {}, profile = {}, upload = { url: "https://storage.test/file", mime: "image/png" }, signed = {} } = {}) {
  const calls = [];
  const db = {
    from(table) { calls.push(["from", table]); return { upsert: async (...args) => { calls.push(["upsert", ...args]); return { error: null }; } }; },
    storage: { from(bucket) { calls.push(["bucket", bucket]); return { createSignedUploadUrl: async (path, options) => { calls.push(["signed", path, options]); return { data: { token: "token-123", path, signedUrl: "https://storage.test/upload/" + path + "?token=token-123", ...signed }, error: null }; }, getPublicUrl: (path) => ({ data: { publicUrl: "https://storage.test/public/" + path } }) }; } }
  };
  const routes = createMediaRoutes({ response, readBody: async () => body, profileMap: async () => profile, uploadFile: async (...args) => { calls.push(["uploadFile", ...args]); return upload; }, db, randomBytes: () => Buffer.from("12345678"), PROJECT_URL: "https://project.supabase.co" });
  return { routes, calls };
}
{
  const { routes } = harness({ profile: { Ricardo: "https://img.test/a.png" } });
  const r = await routes.profileRoute(new Request("https://example.test/api/profile", { method: "GET" }), "Ricardo");
  assert.deepEqual(await r.json(), { profiles: { Ricardo: "https://img.test/a.png" } });
}
{
  const { routes, calls } = harness({ body: { dataUrl: "data:image/png;base64,AAAA" } });
  const r = await routes.profileRoute(new Request("https://example.test/api/profile", { method: "POST" }), "Ricardo");
  assert.deepEqual(await r.json(), { ok: true, avatarUrl: "https://storage.test/file" });
  assert.equal(calls.find(x => x[0] === "uploadFile")[3], 2 * 1024 * 1024);
  assert.equal(calls.find(x => x[0] === "upsert")[2].user_name, "Ricardo");
}
{
  const { routes, calls } = harness({ body: { dataUrl: "data:video/mp4;base64,AAAA" }, upload: { url: "https://storage.test/video", mime: "video/mp4" } });
  const r = await routes.mediaRoute(new Request("https://example.test/api/media", { method: "POST" }), "image");
  assert.deepEqual(await r.json(), { ok: true, imageUrl: "https://storage.test/video", type: "video" });
  assert.equal(calls.find(x => x[0] === "uploadFile")[3], 25 * 1024 * 1024);
}
{
  const { routes, calls } = harness({ body: { dataUrl: "data:audio/webm;base64,AAAA" }, upload: { url: "https://storage.test/audio", mime: "audio/webm" } });
  const r = await routes.mediaRoute(new Request("https://example.test/api/media", { method: "POST" }), "audio");
  assert.deepEqual(await r.json(), { ok: true, imageUrl: "https://storage.test/audio", type: "audio" });
  assert.equal(calls.find(x => x[0] === "uploadFile")[3], 5 * 1024 * 1024);
}
{
  const { routes } = harness({ body: { mime: "image/png", size: 10, name: "../../hello world.png" } });
  const r = await routes.signedUploadRoute(new Request("https://example.test/api/upload", { method: "POST" }), "avatar");
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.bucket, "profile-images");
  assert.match(body.path, /^[0-9]+-3132333435363738-hello_world\.png$/);
  assert.equal(body.uploadUrl, "https://storage.test/upload/" + body.path + "?token=token-123");
  assert.equal(body.expiresIn, 7200);
}
{
  const { routes } = harness({ body: { mime: "application/x-msdownload", size: 10, name: "x.exe" } });
  const r = await routes.signedUploadRoute(new Request("https://example.test/api/upload", { method: "POST" }), "chat");
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: "Tipo de arquivo não suportado." });
}
{
  const { routes } = harness({ body: { mime: "image/png", size: 20 * 1024 * 1024 + 1, name: "x.png" } });
  const r = await routes.signedUploadRoute(new Request("https://example.test/api/upload", { method: "POST" }), "chat");
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: "O arquivo deve ter no máximo 20 MB." });
}
{
  const { routes } = harness({ body: { mime: "image/png", size: 10, name: "x.png" }, signed: { path: "unexpected-path" } });
  await assert.rejects(routes.signedUploadRoute(new Request("https://example.test/api/upload", { method: "POST" }), "chat"), /URL assinada válida/);
}
console.log("PASS: media routes profile, direct uploads, and signed uploads");
