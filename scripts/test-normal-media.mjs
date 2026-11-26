import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createMediaStore } from "../src/server/normal-3.4.7/modules/media.js";

function makeDataUrl(mime, bytes) {
  return "data:" + mime + ";base64," + Buffer.from(bytes).toString("base64");
}

{
  const calls = [];
  const db = { from(table) { calls.push(["from", table]); return { select(columns) { calls.push(["select", columns]); return Promise.resolve({ data: [{ user_name: "Ricardo", avatar_url: "https://img/1" }, { user_name: "Guilherme", avatar_url: null }], error: null }); } }; } };
  const { profileMap } = createMediaStore({ db, randomBytes: () => Buffer.from("abcdef") });
  assert.deepEqual(await profileMap(), { Ricardo: "https://img/1" });
  assert.deepEqual(calls, [["from", "upstatus_profiles"], ["select", "user_name,avatar_url"]]);
}

{
  const { decodeDataUrl } = createMediaStore({ db: {}, randomBytes: () => Buffer.from("abcdef") });
  const decoded = decodeDataUrl(makeDataUrl("IMAGE/PNG", [0x89, 0x50, 0x4e, 0x47]));
  assert.equal(decoded.mime, "image/png");
  assert.deepEqual([...decoded.bytes], [0x89, 0x50, 0x4e, 0x47]);
  assert.throws(() => decodeDataUrl("not-a-data-url"), /Arquivo inválido/);
  assert.throws(() => decodeDataUrl("data:image/png,AAAA"), /Arquivo inválido/);
}

{
  const { sniffMime, ext } = createMediaStore({ db: {}, randomBytes: () => Buffer.from("abcdef") });
  assert.equal(sniffMime(new Uint8Array([0xff, 0xd8, 0xff]), "image/png"), "image/jpeg");
  assert.equal(sniffMime(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), "application/octet-stream"), "image/png");
  assert.equal(sniffMime(new Uint8Array([0x47,0x49,0x46,0x38,0x39,0x61]), "application/octet-stream"), "image/gif");
  assert.equal(sniffMime(new Uint8Array([0x4f,0x67,0x67,0x53]), "application/octet-stream"), "audio/ogg");
  assert.equal(sniffMime(new Uint8Array([0x49,0x44,0x33]), "application/octet-stream"), "audio/mpeg");
  assert.equal(ext("application/pdf"), "pdf");
  assert.equal(ext("audio/x-m4a"), "m4a");
  assert.equal(ext("unknown/type"), "");
}

{
  const calls = [];
  const db = { storage: { from(bucket) { calls.push(["bucket", bucket]); return {
    upload: async (path, body, options) => { calls.push(["upload", path, [...new Uint8Array(body)], options]); return { error: null }; },
    getPublicUrl: (path) => ({ data: { publicUrl: "https://storage.test/" + bucket + "/" + path } })
  }; } } };
  const { uploadFile } = createMediaStore({ db, randomBytes: () => Buffer.from([1,2,3,4,5,6]) });
  const dataUrl = makeDataUrl("image/png", [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const result = await uploadFile("chat-images", dataUrl, 100, new Set(["image/png"]));
  assert.equal(result.mime, "image/png");
  assert.match(result.url, /^https:\/\/storage\.test\/chat-images\//);
  const upload = calls.find((x) => x[0] === "upload");
  assert.deepEqual(upload[2], [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  assert.deepEqual(upload[3], { contentType: "image/png", cacheControl: "31536000", upsert: false });
  await assert.rejects(uploadFile("chat-images", dataUrl, 2, new Set(["image/png"])), /Arquivo acima do limite/);
  await assert.rejects(uploadFile("chat-images", dataUrl, 100, new Set(["image/jpeg"])), /Tipo de arquivo/);
}

console.log("PASS: profile/media decoding, sniffing, and upload helpers");
