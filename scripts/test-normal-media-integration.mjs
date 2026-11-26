import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";
import { createMediaStore } from "../src/server/normal-3.4.7/modules/media.js";
import { createMediaRoutes } from "../src/server/normal-3.4.7/modules/media-routes.js";

function memoryDb() {
  const tables = { upstatus_profiles: [] };
  const uploads = [];
  const signed = [];
  const db = {
    tables, uploads, signed,
    from(table) {
      return {
        select() { return Promise.resolve({ data: tables[table] || [], error: null }); },
        upsert(payload, options) {
          const row = tables[table].find(x => x.user_name === payload.user_name);
          if (row) Object.assign(row, payload);
          else tables[table].push({ ...payload });
          return Promise.resolve({ error: null });
        }
      };
    },
    storage: {
      from(bucket) {
        return {
          upload: async (path, body, options) => {
            uploads.push({ bucket, path, bytes: body.byteLength, options });
            return { error: null };
          },
          getPublicUrl: path => ({ data: { publicUrl: "https://storage.test/" + bucket + "/" + path } }),
          createSignedUploadUrl: async path => {
            signed.push({ bucket, path });
            return { data: { token: "signed-token", path, signedUrl: "/storage/v1/object/upload/sign/" + bucket + "/" + path }, error: null };
          }
        };
      }
    }
  };
  return db;
}
const db = memoryDb();
const { response, readBody } = createHttpHelpers({});
const media = createMediaStore({ db, randomBytes: () => Buffer.from("abcdef") });
const routes = createMediaRoutes({
  response, readBody, profileMap: media.profileMap, uploadFile: media.uploadFile,
  db, randomBytes: () => Buffer.from("12345678"), PROJECT_URL: "https://project.test"
});
const dataUrl = "data:image/png;base64," + Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3]).toString("base64");
const request = (url, body) => new Request("https://upstatus.test" + url, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});

{
  const saved = await routes.profileRoute(request("/api/profile", { dataUrl }), "Ricardo");
  const body = await saved.json();
  assert.equal(saved.status, 200);
  assert.equal(body.ok, true);
  assert.match(body.avatarUrl, /profile-images/);
  assert.equal(db.tables.upstatus_profiles[0].user_name, "Ricardo");
  assert.deepEqual(await media.profileMap(), { Ricardo: body.avatarUrl });
}
{
  const saved = await routes.mediaRoute(request("/api/media/image", { dataUrl }), "Ricardo");
  const body = await saved.json();
  assert.equal(saved.status, 200);
  assert.equal(body.type, "image");
  assert.match(body.imageUrl, /chat-images/);
  assert.equal(db.uploads.at(-1).bucket, "chat-images");
  assert.equal(db.uploads.at(-1).options.contentType, "image/png");
  assert.equal(db.uploads.at(-1).options.upsert, false);
}
{
  await assert.rejects(
    routes.mediaRoute(request("/api/media/document", { dataUrl: "data:text/html;base64," + Buffer.from("<script>").toString("base64") }), "Ricardo"),
    /Tipo de arquivo não suportado/
  ); // The global dispatcher owns the HTTP error mapping.
}
{
  const signed = await routes.signedUploadRoute(request("/api/media/signed", {
    mime: "application/pdf", size: 4096, name: "../../invoice final.pdf"
  }), "Ricardo");
  const body = await signed.json();
  assert.equal(signed.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.bucket, "chat-images");
  assert.equal(body.mime, "application/pdf");
  assert.equal(body.token, "signed-token");
  assert.match(body.uploadUrl, /token=signed-token/);
  assert.equal(db.signed.length, 1);
  assert.ok(!body.path.includes("../"));
}
{
  const invalid = await routes.signedUploadRoute(request("/api/media/signed", {
    mime: "application/x-msdownload", size: 100, name: "bad.exe"
  }), "Ricardo");
  assert.equal(invalid.status, 400);
}
console.log("PASS: integrated media storage, profile, direct upload and signed upload flow");
