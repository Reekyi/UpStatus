function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Expected " + JSON.stringify(expected) + ", received " + JSON.stringify(actual));
  }
}
function assertStringIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) throw new Error("Expected string to include: " + expected);
}

(globalThis as any).EdgeRuntime = {
  waitUntil(promise: Promise<unknown>) { void promise; }
};
Deno.env.set("SUPABASE_URL", "https://mock-project.supabase.co");
Deno.env.set("SUPABASE_SECRET_KEYS", JSON.stringify({ default: "offline-test-key" }));
Deno.env.set("LUCCA_PASSWORD", "lucca-deno-test");
Deno.env.set("YCARO_PASSWORD", "ycaro-deno-test");

const referenceServer = new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "--config", "scripts/deno-entrypoint-test/deno.json",
    "--allow-env=SUPABASE_URL,SUPABASE_SECRET_KEYS,LUCCA_PASSWORD,YCARO_PASSWORD",
    "--allow-net=0.0.0.0:8001,127.0.0.1:8001",
    "scripts/deno-entrypoint-test/reference-server.ts"
  ],
  stdout: "inherit",
  stderr: "inherit"
}).spawn();

const base = "http://127.0.0.1:8000";
const referenceBase = "http://127.0.0.1:8001";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request(path: string, init?: RequestInit) {
  return await fetch(base + path, init);
}
async function requestReference(path: string, init?: RequestInit) {
  return await fetch(referenceBase + path, init);
}
async function compareWithRecovered(path: string, init?: RequestInit) {
  const [modular, recovered] = await Promise.all([
    request(path, init), requestReference(path, init)
  ]);
  assertEquals(modular.status, recovered.status);
  for (const header of ["content-type", "access-control-allow-origin", "cache-control", "content-disposition"]) {
    assertEquals(modular.headers.get(header), recovered.headers.get(header));
  }
  assertEquals(await modular.text(), await recovered.text());
}
async function compareJsonPair(
  path: string,
  modularInit: RequestInit,
  referenceInit: RequestInit,
  normalize: (value: any) => unknown = value => value,
  referencePath: string = path
) {
  const [modular, recovered] = await Promise.all([
    request(path, modularInit), requestReference(referencePath, referenceInit)
  ]);
  assertEquals(modular.status, recovered.status);
  const [modularBody, recoveredBody] = await Promise.all([modular.json(), recovered.json()]);
  assertEquals(normalize(modularBody), normalize(recoveredBody));
  return { modularBody, recoveredBody, modularStatus: modular.status };
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

  let referenceReady = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await requestReference("/health");
      if (response.status === 200) { referenceReady = true; break; }
    } catch { await sleep(100); }
  }
  assert(referenceReady, "Recovered monolith reference server did not become available on port 8001");

  // Compare the same HTTP contracts against the exact recovered monolith.
  for (const path of [
    "/health", "/api/me", "/api/status", "/api/not-a-route",
    "/api/account?name=Ricardo", "/api/members", "/api/update-info",
    "/upstatus.user.js", "/lucca", "/lucca.html", "/ycaro", "/ycaro.html", "/upstatus/health",
    "/api/account?name=Unknown"
  ]) await compareWithRecovered(path);
  await compareWithRecovered("/api/chat", { method: "OPTIONS" });
  await compareWithRecovered("/api/lucca/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "wrong-reference-password" })
  });
  await compareWithRecovered("/api/ycaro/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "wrong-reference-password" })
  });

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
    const updateInfo = await request("/api/update-info");
    assertEquals(updateInfo.status, 200);
    assertEquals(await updateInfo.json(), { version: "3.4.7", updateUrl: "/upstatus.user.js" });
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
    const tooShort = await request("/api/setup", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "123" })
    });
    assertEquals(tooShort.status, 400);
    assertEquals(await tooShort.json(), { error: "Use um usuário válido e uma senha de pelo menos 6 caracteres." });
  }
  let firstToken = "";
  {
    const setup = await request("/api/setup", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "deno-test-password" })
    });
    assertEquals(setup.status, 200);
    const body = await setup.json();
    assertEquals(body.name, "Ricardo");
    assertEquals(body.role, "implementation_admin");
    assertEquals(body.canViewHistory, true);
    assert(typeof body.token === "string" && body.token.length > 20, "setup should issue a session token");
    firstToken = body.token;
  }
  {
    const badLogin = await request("/api/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "wrong-password" })
    });
    assertEquals(badLogin.status, 401);
    assertEquals(await badLogin.json(), { error: "Nome ou senha incorretos." });
  }
  {
    const me = await request("/api/me", { headers: { "x-upstatus-token": firstToken } });
    assertEquals(me.status, 200);
    assertEquals(await me.json(), {
      authenticated: true, name: "Ricardo", role: "implementation_admin",
      canViewHistory: true, needsSetup: false
    });
  }
  {
    const logout = await request("/api/logout", {
      method: "POST", headers: { "x-upstatus-token": firstToken }
    });
    assertEquals(logout.status, 200);
    assertEquals(await logout.json(), { ok: true });
    const me = await request("/api/me", { headers: { "x-upstatus-token": firstToken } });
    assertEquals(await me.json(), {
      authenticated: false, name: null, role: null, canViewHistory: false, needsSetup: false
    });
  }
  let authToken = "";
  {
    const login = await request("/api/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "deno-test-password" })
    });
    assertEquals(login.status, 200);
    const body = await login.json();
    assertEquals(body.name, "Ricardo");
    assertEquals(body.role, "implementation_admin");
    authToken = body.token;
  }
  const authHeaders = { "x-upstatus-token": authToken };
  {
    const status = await request("/api/status", { headers: { ...authHeaders, "x-upstatus-version": "3.4.7" } });
    assertEquals(status.status, 200);
    const body = await status.json();
    assertEquals(body.members.Ricardo.status, "offline");
    assertEquals(body.members.Ricardo.version, "3.4.7");
  }
  {
    const invalid = await request("/api/status", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ status: "unknown" })
    });
    assertEquals(invalid.status, 400);
    assertEquals(await invalid.json(), { error: "Status inválido." });

    const missingReason = await request("/api/status", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ status: "busy" })
    });
    assertEquals(missingReason.status, 400);
    assertEquals(await missingReason.json(), { error: "Informe um motivo." });

    const changed = await request("/api/status", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ status: "busy", reason: "Deno harness" })
    });
    assertEquals(changed.status, 200);
    assertEquals((await changed.json()).status, "busy");
    const history = await request("/api/history?limit=10", { headers: authHeaders });
    assertEquals(history.status, 200);
    assertEquals((await history.json()).history.length, 1);

    const health = await request("/api/health", { headers: authHeaders });
    assertEquals(health.status, 200);
    const healthBody = await health.json();
    assertEquals(healthBody.ok, true);
    assertEquals(healthBody.service, "UpStatus");
    assertEquals(healthBody.members.length, 4);
  }
  let guilhermeToken = "";
  {
    const setup = await request("/api/setup", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Guilherme", password: "guilherme-test-password" })
    });
    assertEquals(setup.status, 200);
    guilhermeToken = (await setup.json()).token;
    assert(typeof guilhermeToken === "string" && guilhermeToken.length > 20);
  }
  let testerToken = "";
  {
    const setup = await request("/api/setup", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Tester", password: "tester-test-password" })
    });
    assertEquals(setup.status, 200);
    const body = await setup.json();
    assertEquals(body.role, "implementation_user");
    assertEquals(body.canViewHistory, false);
    testerToken = body.token;
  }
  const testerHeaders = { "x-upstatus-token": testerToken };
  {
    const outsiderChange = await request("/api/status", {
      method: "POST", headers: { ...testerHeaders, "content-type": "application/json" },
      body: JSON.stringify({ status: "away", reason: "Tester presence", actor: "Ricardo", target: "Tester" })
    });
    assertEquals(outsiderChange.status, 200);
    assertEquals((await outsiderChange.json()).status, "away");
    const afterOutsider = await request("/api/history?limit=10", { headers: authHeaders });
    const entries = (await afterOutsider.json()).history;
    const testerEntry = entries.find((entry: any) => entry.user === "Tester");
    assertEquals(testerEntry.actor, "Tester");
    assertEquals(testerEntry.target, "Tester");
  }
  {
    const me = await request("/api/me", { headers: testerHeaders });
    assertEquals((await me.json()).role, "implementation_user");

    const health = await request("/api/health", { headers: testerHeaders });
    assertEquals(health.status, 403);
    assertEquals(await health.json(), { error: "Seu perfil não possui acesso à saúde do sistema." });

    const history = await request("/api/history", { headers: testerHeaders });
    assertEquals(history.status, 403);
    assertEquals(await history.json(), { error: "Seu perfil não possui acesso ao histórico." });

    const remoteRead = await request("/api/remote-status/result?id=missing", { headers: testerHeaders });
    assertEquals(remoteRead.status, 403);
    assertEquals(await remoteRead.json(), { error: "Somente administradores podem consultar resultados." });

    const remoteWrite = await request("/api/remote-status", {
      method: "POST", headers: { ...testerHeaders, "content-type": "application/json" },
      body: JSON.stringify({ target: "Guilherme", status: "busy", reason: "spoof attempt" })
    });
    assertEquals(remoteWrite.status, 403);
    assertEquals(await remoteWrite.json(), { error: "Somente administradores podem controlar a fila de outro usuário." });

    const nonRicardoAdminClear = await request("/api/chat/clear", {
      method: "POST", headers: { "x-upstatus-token": guilhermeToken }
    });
    assertEquals(nonRicardoAdminClear.status, 403);
    assertEquals(await nonRicardoAdminClear.json(), { error: "Somente Ricardo pode limpar o chat." });
  }
  {
    const command = await request("/api/remote-status", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ target: "Guilherme", status: "away", reason: "Teste remoto" })
    });
    assertEquals(command.status, 200);
    const commandBody = await command.json();
    assertEquals(commandBody.command.target, "Guilherme");

    const pending = await request("/api/remote-status", {
      headers: { "x-upstatus-token": guilhermeToken }
    });
    assertEquals((await pending.json()).pending, true);

    const ack = await request("/api/remote-status/result", {
      method: "POST", headers: { "x-upstatus-token": guilhermeToken, "content-type": "application/json" },
      body: JSON.stringify({ commandId: commandBody.commandId, ok: true })
    });
    assertEquals(ack.status, 200);
    assertEquals(await ack.json(), { ok: true });

    const result = await request("/api/remote-status/result?id=" + commandBody.commandId, {
      headers: authHeaders
    });
    assertEquals(result.status, 200);
    assertEquals((await result.json()).result.ok, true);
  }
  let messageId = "";
  {
    const empty = await request("/api/chat", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "   " })
    });
    assertEquals(empty.status, 400);
    assertEquals(await empty.json(), { error: "Digite uma mensagem ou envie um arquivo." });

    const sent = await request("/api/chat", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "Teste pelo dispatcher @Lohan" })
    });
    assertEquals(sent.status, 200);
    const sentBody = await sent.json();
    assertEquals(sentBody.message.user, "Ricardo");
    assertEquals(sentBody.message.mentions, ["Lohan"]);
    messageId = sentBody.message.id;
  }
  {
    const history = await request("/api/chat", { headers: authHeaders });
    assertEquals(history.status, 200);
    const body = await history.json();
    assertEquals(body.messages.length, 1);
    assertEquals(body.messages[0].id, messageId);

    const read = await request("/api/chat/read", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageIds: [messageId] })
    });
    assertEquals(read.status, 200);
    assertEquals(await read.json(), { ok: true });

    const typing = await request("/api/chat/typing", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ typing: true })
    });
    assertEquals(await typing.json(), { ok: true });
    const typingList = await request("/api/chat/typing", { headers: authHeaders });
    assertEquals((await typingList.json()).typing, []);

    const forbiddenEdit = await request("/api/chat/" + messageId, {
      method: "PATCH", headers: { ...testerHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "unauthorized edit" })
    });
    assertEquals(forbiddenEdit.status, 403);
    assertEquals(await forbiddenEdit.json(), { error: "Você só pode editar suas próprias mensagens." });

    const forbiddenDelete = await request("/api/chat/" + messageId, {
      method: "DELETE", headers: testerHeaders
    });
    assertEquals(forbiddenDelete.status, 403);
    assertEquals(await forbiddenDelete.json(), { error: "Você só pode excluir suas próprias mensagens." });

    const outsiderPost = await request("/api/chat", {
      method: "POST", headers: { ...testerHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "Mensagem criada por conta padrão" })
    });
    assertEquals(outsiderPost.status, 200);
    const outsiderMessageId = (await outsiderPost.json()).message.id;

    const adminDelete = await request("/api/chat/" + outsiderMessageId, {
      method: "DELETE", headers: { "x-upstatus-token": guilhermeToken }
    });
    assertEquals(adminDelete.status, 200);
    assertEquals(await adminDelete.json(), { ok: true, id: outsiderMessageId, deletedByAdmin: true });
  }
  {
    const reaction = await request("/api/chat/reaction", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageId, emoji: "👍" })
    });
    assertEquals(reaction.status, 200);
    assertEquals((await reaction.json()).reactions, { "👍": ["Ricardo"] });

    const edited = await request("/api/chat/" + messageId, {
      method: "PATCH", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "Mensagem editada no Deno" })
    });
    assertEquals(edited.status, 200);
    assertEquals((await edited.json()).message.message, "Mensagem editada no Deno");

    const deleted = await request("/api/chat/" + messageId, {
      method: "DELETE", headers: authHeaders
    });
    assertEquals(deleted.status, 200);
    assertEquals(await deleted.json(), { ok: true, id: messageId, deletedByAdmin: false });
  }
  let uploadedImageUrl = "";
  {
    const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];
    const pngDataUrl = "data:image/png;base64," + btoa(String.fromCharCode(...pngBytes));
    const avatar = await request("/api/profile/avatar", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: pngDataUrl })
    });
    assertEquals(avatar.status, 200);
    const avatarBody = await avatar.json();
    assertEquals(avatarBody.ok, true);
    const profiles = await request("/api/profiles", { headers: authHeaders });
    assertEquals((await profiles.json()).profiles.Ricardo, avatarBody.avatarUrl);

    const image = await request("/api/chat/image", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: pngDataUrl })
    });
    assertEquals(image.status, 200);
    const imageBody = await image.json();
    assertEquals(imageBody.type, "image");
    uploadedImageUrl = imageBody.imageUrl;
    const imageMessage = await request("/api/chat", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "", imageUrl: uploadedImageUrl })
    });
    assertEquals(imageMessage.status, 200);

    const pdfDataUrl = "data:application/pdf;base64," + btoa("%PDF-1.4\n");
    const documentUpload = await request("/api/chat/document", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: pdfDataUrl })
    });
    assertEquals(documentUpload.status, 200);
    assertEquals((await documentUpload.json()).type, "document");

    const oggDataUrl = "data:audio/ogg;base64," + btoa("OggS" + "deno-audio");
    const audioUpload = await request("/api/chat/audio", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: oggDataUrl })
    });
    assertEquals(audioUpload.status, 200);
    assertEquals((await audioUpload.json()).type, "audio");

    const mp4Bytes = [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0];
    const mp4DataUrl = "data:video/mp4;base64," + btoa(String.fromCharCode(...mp4Bytes));
    const videoUpload = await request("/api/chat/image", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: mp4DataUrl })
    });
    assertEquals(videoUpload.status, 200);
    assertEquals((await videoUpload.json()).type, "video");
  }
  {
    const signed = await request("/api/chat/upload-url", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/pdf", size: 2048, name: "test.pdf" })
    });
    assertEquals(signed.status, 200);
    const body = await signed.json();
    assertEquals(body.bucket, "chat-images");
    assertEquals(body.mime, "application/pdf");
    assert(body.uploadUrl.includes("deno-test-upload-token"));

    const unsupported = await request("/api/chat/upload-url", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/x-msdownload", size: 1024, name: "payload.exe" })
    });
    assertEquals(unsupported.status, 400);
    assertEquals(await unsupported.json(), { error: "Tipo de arquivo não suportado." });

    const tooLarge = await request("/api/chat/upload-url", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/pdf", size: 20 * 1024 * 1024 + 1, name: "large.pdf" })
    });
    assertEquals(tooLarge.status, 400);
    assertEquals(await tooLarge.json(), { error: "O arquivo deve ter no máximo 20 MB." });
  }
  {
    Deno.env.set("LUCCA_PASSWORD", "lucca-deno-test");
    const noGuestHeartbeat = await request("/api/lucca/heartbeat", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}"
    });
    assertEquals(noGuestHeartbeat.status, 401);
    const denied = await request("/api/lucca/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "incorrect" })
    });
    assertEquals(denied.status, 401);

    const login = await request("/api/lucca/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "lucca-deno-test" })
    });
    assertEquals(login.status, 200);
    const session = await login.json();
    const cookie = "lucca_session=" + session.token;
    const setCookie = login.headers.get("set-cookie") || "";
    assertStringIncludes(setCookie, "HttpOnly");
    assertStringIncludes(setCookie, "SameSite=Lax");
    assertStringIncludes(setCookie, "Max-Age=86400");

    const me = await request("/api/lucca/me", { headers: { cookie } });
    assertEquals((await me.json()).authenticated, true);
    const heartbeat = await request("/api/lucca/heartbeat", {
      method: "POST", headers: { cookie, "content-type": "application/json" },
      body: "{}"
    });
    assertEquals(await heartbeat.json(), { ok: true, online: true });

    const logout = await request("/api/lucca/logout", {
      method: "POST", headers: { cookie, "content-type": "application/json" },
      body: "{}"
    });
    assertEquals(logout.status, 200);
    assertStringIncludes(logout.headers.get("set-cookie") || "", "Max-Age=0");
    assertEquals((await (await request("/api/lucca/me", { headers: { cookie } })).json()).authenticated, false);
  }
  {
    Deno.env.set("YCARO_PASSWORD", "ycaro-deno-test");
    const badLogin = await request("/api/ycaro/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong-ycaro-password" })
    });
    assertEquals(badLogin.status, 401);
    const noGuestHeartbeat = await request("/api/ycaro/heartbeat", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}"
    });
    assertEquals(noGuestHeartbeat.status, 401);
    const login = await request("/api/ycaro/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "ycaro-deno-test" })
    });
    assertEquals(login.status, 200);
    const session = await login.json();
    const cookie = "ycaro_session=" + session.token;
    assertStringIncludes(login.headers.get("set-cookie") || "", "Max-Age=86400");
    const me = await request("/api/ycaro/me", { headers: { cookie } });
    assertEquals((await me.json()).authenticated, true);
    const logout = await request("/api/ycaro/logout", {
      method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}"
    });
    assertEquals(logout.status, 200);
    assertStringIncludes(logout.headers.get("set-cookie") || "", "Max-Age=0");
  }
  {
    (globalThis as any).__upstatusMockStorageFailure = { bucket: "chat-images", operation: "remove" };
    const clear = await request("/api/chat/clear", {
      method: "POST", headers: authHeaders
    });
    assertEquals(clear.status, 200);
    assertEquals(await clear.json(), { ok: true, removedFiles: 0 });
    (globalThis as any).__upstatusMockStorageFailure = undefined;
  }
  {
    const concurrentMessages = await Promise.all(Array.from({ length: 12 }, (_, index) =>
      request("/api/chat", {
        method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({ message: "Concorrência Deno " + index })
      })
    ));
    assert(concurrentMessages.every(response => response.status === 200), "all concurrent chat requests should succeed");
    const concurrentIds: string[] = [];
    for (const response of concurrentMessages) concurrentIds.push((await response.json()).message.id);
    assertEquals(new Set(concurrentIds).size, 12);
  }
  {
    const malformed = await request("/api/chat", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" }, body: "{"
    });
    assertEquals(malformed.status, 500);
    assertEquals(await malformed.json(), { error: "Pedido inválido." });
  }
  {
    (globalThis as any).__upstatusMockDbFailure = { table: "messages", operation: "insert" };
    const response = await request("/api/chat", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "DB insert failure" })
    });
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock messages insert failure" });
    (globalThis as any).__upstatusMockDbFailure = undefined;
  }
  {
    (globalThis as any).__upstatusMockDbFailure = { table: "chat_reads", operation: "upsert" };
    const response = await request("/api/chat/read", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageIds: [] })
    });
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock chat_reads upsert failure" });
    (globalThis as any).__upstatusMockDbFailure = undefined;
  }
  {
    (globalThis as any).__upstatusMockDbFailure = { table: "status_history", operation: "select" };
    const response = await request("/api/history", { headers: authHeaders });
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock status_history select failure" });
    (globalThis as any).__upstatusMockDbFailure = undefined;
  }
  {
    (globalThis as any).__upstatusMockDbFailure = { table: "upstatus_state", operation: "upsert" };
    const response = await request("/api/remote-status", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ target: "Guilherme", status: "busy", reason: "DB failure" })
    });
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock upstatus_state upsert failure" });
    (globalThis as any).__upstatusMockDbFailure = undefined;
  }
  {
    const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];
    const pngDataUrl = "data:image/png;base64," + btoa(String.fromCharCode(...pngBytes));
    (globalThis as any).__upstatusMockStorageFailure = { bucket: "chat-images", operation: "upload" };
    const response = await request("/api/chat/image", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: pngDataUrl })
    });
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock chat-images upload failure" });
    (globalThis as any).__upstatusMockStorageFailure = undefined;
  }
  {
    (globalThis as any).__upstatusMockStorageFailure = { bucket: "chat-images", operation: "signed-upload" };
    const response = await request("/api/chat/upload-url", {
      method: "POST", headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/pdf", size: 1024, name: "fail.pdf" })
    });
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock chat-images signed-upload failure" });
    (globalThis as any).__upstatusMockStorageFailure = undefined;
  }
  {
    const logout = await request("/api/logout", {
      method: "POST", headers: authHeaders
    });
    assertEquals(logout.status, 200);
    const protectedAfterLogout = await request("/api/status", { headers: authHeaders });
    assertEquals(protectedAfterLogout.status, 401);
  }
  // Differential authenticated flows: each server owns an independent DB mock,
  // so only volatile tokens, IDs and timestamps are normalized.
  const referenceSetup = await requestReference("/api/setup", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ricardo", password: "diff-test-password" })
  });
  const modularLogin = await request("/api/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ricardo", password: "deno-test-password" })
  });
  assertEquals(referenceSetup.status, 200);
  assertEquals(modularLogin.status, 200);
  const referenceAdminBody = await referenceSetup.json();
  const modularAdminBody = await modularLogin.json();
  const omitToken = ({ token, ...rest }: any) => rest;
  assertEquals(omitToken(modularAdminBody), omitToken(referenceAdminBody));
  const modularAdminHeaders = { "x-upstatus-token": modularAdminBody.token };
  const referenceAdminHeaders = { "x-upstatus-token": referenceAdminBody.token };

  await compareJsonPair("/api/me",
    { headers: modularAdminHeaders }, { headers: referenceAdminHeaders });

  const differentialReason = "DIFFERENTIAL_STATUS_CONTRACT";
  await compareJsonPair("/api/status",
    {
      method: "POST", headers: { ...modularAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ status: "away", reason: differentialReason })
    },
    {
      method: "POST", headers: { ...referenceAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ status: "away", reason: differentialReason })
    },
    body => ({ ...body, updatedAt: "<timestamp>" })
  );
  await compareJsonPair("/api/status",
    { headers: { ...modularAdminHeaders, "x-upstatus-version": "3.4.7" } },
    { headers: { ...referenceAdminHeaders, "x-upstatus-version": "3.4.7" } },
    body => {
      const member = { ...body.members.Ricardo, updatedAt: "<timestamp>", seenAt: "<timestamp>" };
      return { member };
    }
  );
  await compareJsonPair("/api/history?limit=500",
    { headers: modularAdminHeaders }, { headers: referenceAdminHeaders },
    body => {
      const entry = body.history.find((item: any) => item.reason === differentialReason);
      assert(entry, "modular status history should contain the differential event");
      return { entry: { ...entry, createdAt: "<timestamp>" } };
    }
  );
  await compareJsonPair("/api/health",
    { headers: modularAdminHeaders }, { headers: referenceAdminHeaders },
    body => ({
      ok: body.ok,
      service: body.service,
      version: body.version,
      db: { ok: body.db.ok, error: body.db.error },
      chat: { ok: body.chat.ok, error: body.chat.error },
      state: { ok: body.state.ok, error: body.state.error },
      members: body.members
        .filter((member: any) => ["Ricardo", "Guilherme", "Lohan"].includes(member.name))
        .map((member: any) => ({
          name: member.name, status: member.status, version: member.version, connected: member.connected
        }))
    })
  );
  await compareJsonPair("/api/account?name=Ricardo", {}, {});
  await compareJsonPair("/api/setup",
    {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "another-password" })
    },
    {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "another-password" })
    }
  );
  await compareJsonPair("/api/login",
    {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "wrong-differential-password" })
    },
    {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "wrong-differential-password" })
    }
  );
  await compareJsonPair("/api/not-a-route", { headers: modularAdminHeaders }, { headers: referenceAdminHeaders });

  const referenceGuilhermeSetup = await requestReference("/api/setup", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Guilherme", password: "diff-guilherme-password" })
  });
  const modularGuilhermeLogin = await request("/api/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Guilherme", password: "guilherme-test-password" })
  });
  assertEquals(referenceGuilhermeSetup.status, 200);
  assertEquals(modularGuilhermeLogin.status, 200);
  const referenceGuilherme = await referenceGuilhermeSetup.json();
  const modularGuilherme = await modularGuilhermeLogin.json();
  assertEquals(omitToken(modularGuilherme), omitToken(referenceGuilherme));
  const modularGuilhermeHeaders = { "x-upstatus-token": modularGuilherme.token };
  const referenceGuilhermeHeaders = { "x-upstatus-token": referenceGuilherme.token };

  const remoteReason = "DIFFERENTIAL_REMOTE_CONTRACT";
  const remotePair = await compareJsonPair("/api/remote-status",
    {
      method: "POST", headers: { ...modularAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ target: "Guilherme", status: "busy", reason: remoteReason })
    },
    {
      method: "POST", headers: { ...referenceAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ target: "Guilherme", status: "busy", reason: remoteReason })
    },
    body => ({
      ok: body.ok,
      commandId: "<id>",
      command: { ...body.command, id: "<id>", createdAt: "<timestamp>" }
    })
  );
  await compareJsonPair("/api/remote-status",
    { headers: modularGuilhermeHeaders }, { headers: referenceGuilhermeHeaders },
    body => ({
      pending: body.pending,
      command: { ...body.command, id: "<id>", createdAt: "<timestamp>" }
    })
  );
  await compareJsonPair("/api/remote-status/result",
    {
      method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ commandId: remotePair.modularBody.commandId, ok: true })
    },
    {
      method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ commandId: remotePair.recoveredBody.commandId, ok: true })
    }
  );
  await compareJsonPair(
    "/api/remote-status/result?id=" + encodeURIComponent(remotePair.modularBody.commandId),
    { headers: modularAdminHeaders },
    { headers: referenceAdminHeaders },
    body => ({
      ready: body.ready,
      result: { ...body.result, commandId: "<id>", createdAt: "<timestamp>" }
    }),
    "/api/remote-status/result?id=" + encodeURIComponent(remotePair.recoveredBody.commandId)
  );

  const differentialMessage = "DIFFERENTIAL_CHAT_CONTRACT @Lohan";
  const chatPair = await compareJsonPair("/api/chat",
    {
      method: "POST", headers: { ...modularAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: differentialMessage })
    },
    {
      method: "POST", headers: { ...referenceAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: differentialMessage })
    },
    body => ({
      ok: body.ok,
      message: { ...body.message, id: "<id>", createdAt: "<timestamp>" }
    })
  );
  const modularMessageId = chatPair.modularBody.message.id;
  const referenceMessageId = chatPair.recoveredBody.message.id;
  await compareJsonPair("/api/chat/read",
    {
      method: "POST", headers: { ...modularAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageIds: [modularMessageId] })
    },
    {
      method: "POST", headers: { ...referenceAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageIds: [referenceMessageId] })
    }
  );
  await compareJsonPair("/api/chat/reaction",
    {
      method: "POST", headers: { ...modularAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageId: modularMessageId, emoji: "👍" })
    },
    {
      method: "POST", headers: { ...referenceAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageId: referenceMessageId, emoji: "👍" })
    }
  );
  await compareJsonPair("/api/chat/" + modularMessageId,
    {
      method: "PATCH", headers: { ...modularAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "DIFFERENTIAL_CHAT_EDIT" })
    },
    {
      method: "PATCH", headers: { ...referenceAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "DIFFERENTIAL_CHAT_EDIT" })
    },
    body => ({ ...body, message: { ...body.message, id: "<id>", editedAt: "<timestamp>" } }),
    "/api/chat/" + referenceMessageId
  );
  await compareJsonPair("/api/chat/" + modularMessageId,
    { method: "DELETE", headers: modularAdminHeaders },
    { method: "DELETE", headers: referenceAdminHeaders },
    body => ({ ...body, id: "<id>" }),
    "/api/chat/" + referenceMessageId
  );

  const [modularLogout, referenceLogout] = await Promise.all([
    request("/api/logout", { method: "POST", headers: modularAdminHeaders }),
    requestReference("/api/logout", { method: "POST", headers: referenceAdminHeaders })
  ]);
  assertEquals(modularLogout.status, referenceLogout.status);
  assertEquals(await modularLogout.json(), await referenceLogout.json());
  await compareJsonPair("/api/me", {}, {});

  // Differential guest-session contracts, including cookie attributes.
  for (const guest of ["lucca", "ycaro"] as const) {
    const password = guest === "lucca" ? "lucca-deno-test" : "ycaro-deno-test";
    const loginPath = "/api/" + guest + "/login";
    const [modularLogin, referenceLogin] = await Promise.all([
      request(loginPath, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      }),
      requestReference(loginPath, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      })
    ]);
    assertEquals(modularLogin.status, referenceLogin.status);
    const [modularBody, referenceBody] = await Promise.all([modularLogin.json(), referenceLogin.json()]);
    const normalizeGuestLogin = (body: any) => ({
      ...body, token: "<token>", joinedAt: "<timestamp>"
    });
    assertEquals(normalizeGuestLogin(modularBody), normalizeGuestLogin(referenceBody));
    const cookieName = guest + "_session";
    const modularSetCookie = modularLogin.headers.get("set-cookie") || "";
    const referenceSetCookie = referenceLogin.headers.get("set-cookie") || "";
    const normalizeSetCookie = (value: string) => value.replace(
      new RegExp("^(" + cookieName + ")=[^;]*"), "$1=<token>"
    );
    assertEquals(normalizeSetCookie(modularSetCookie), normalizeSetCookie(referenceSetCookie));
    const modularCookie = modularSetCookie.split(";")[0];
    const referenceCookie = referenceSetCookie.split(";")[0];

    await compareJsonPair("/api/" + guest + "/me",
      { headers: { cookie: modularCookie } },
      { headers: { cookie: referenceCookie } },
      body => ({ ...body, joinedAt: body.joinedAt ? "<timestamp>" : body.joinedAt })
    );
    await compareJsonPair("/api/" + guest + "/heartbeat",
      { method: "POST", headers: { cookie: modularCookie, "content-type": "application/json" }, body: "{}" },
      { method: "POST", headers: { cookie: referenceCookie, "content-type": "application/json" }, body: "{}" }
    );
    const [modularLogout, referenceLogout] = await Promise.all([
      request("/api/" + guest + "/logout", {
        method: "POST", headers: { cookie: modularCookie, "content-type": "application/json" }, body: "{}"
      }),
      requestReference("/api/" + guest + "/logout", {
        method: "POST", headers: { cookie: referenceCookie, "content-type": "application/json" }, body: "{}"
      })
    ]);
    assertEquals(modularLogout.status, referenceLogout.status);
    assertEquals(modularLogout.headers.get("set-cookie"), referenceLogout.headers.get("set-cookie"));
    assertEquals(await modularLogout.json(), await referenceLogout.json());
  }

  // Differential direct and signed media uploads; normalize only generated URLs/paths.
  const differentialPng = "data:image/png;base64," + btoa(String.fromCharCode(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3));
  const differentialPdf = "data:application/pdf;base64," + btoa("%PDF-1.4\n");
  const differentialOgg = "data:audio/ogg;base64," + btoa("OggS" + "diff-audio");
  const differentialMp4 = "data:video/mp4;base64," + btoa(String.fromCharCode(0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,0,0,0,0));
  const normalizeUploadUrl = (body: any) => ({
    ...body,
    imageUrl: body.imageUrl ? "<public-url>" : body.imageUrl,
    avatarUrl: body.avatarUrl ? "<public-url>" : body.avatarUrl,
    uploadUrl: body.uploadUrl ? "<signed-upload-url>" : body.uploadUrl,
    signedUrl: body.signedUrl ? "<signed-upload-url>" : body.signedUrl,
    publicUrl: body.publicUrl ? "<public-url>" : body.publicUrl,
    path: body.path ? "<storage-path>" : body.path
  });
  await compareJsonPair("/api/profile/avatar",
    {
      method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: differentialPng })
    },
    {
      method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: differentialPng })
    },
    normalizeUploadUrl
  );
  await compareJsonPair("/api/profiles",
    { headers: modularGuilhermeHeaders },
    { headers: referenceGuilhermeHeaders },
    body => ({
      profiles: {
        Guilherme: body.profiles.Guilherme ? "<avatar-url>" : null
      }
    })
  );
  let differentialImageUrls: { modular: string; reference: string } | null = null;
  for (const [route, dataUrl, expectedType] of [
    ["/api/chat/image", differentialPng, "image"],
    ["/api/chat/document", differentialPdf, "document"],
    ["/api/chat/audio", differentialOgg, "audio"],
    ["/api/chat/image", differentialMp4, "video"]
  ] as const) {
    const pair = await compareJsonPair(route,
      {
        method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
        body: JSON.stringify({ dataUrl })
      },
      {
        method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
        body: JSON.stringify({ dataUrl })
      },
      body => {
        assertEquals(body.type, expectedType);
        return normalizeUploadUrl(body);
      }
    );
    if (route === "/api/chat/image" && expectedType === "image") {
      differentialImageUrls = {
        modular: pair.modularBody.imageUrl,
        reference: pair.recoveredBody.imageUrl
      };
    }
  }
  assert(differentialImageUrls, "differential image uploads should return public URLs");
  for (const [route, mime] of [
    ["/api/profile/avatar-upload-url", "image/png"],
    ["/api/chat/upload-url", "application/pdf"]
  ] as const) {
    await compareJsonPair(route,
      {
        method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
        body: JSON.stringify({ mime, size: 1024, name: "differential-file" })
      },
      {
        method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
        body: JSON.stringify({ mime, size: 1024, name: "differential-file" })
      },
      normalizeUploadUrl
    );
  }

  // Differential typing, fast-sync and chat cleanup contracts.
  const referenceTesterSetup = await requestReference("/api/setup", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Tester", password: "diff-tester-password" })
  });
  const modularTesterLogin = await request("/api/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Tester", password: "tester-test-password" })
  });
  assertEquals(referenceTesterSetup.status, 200);
  assertEquals(modularTesterLogin.status, 200);
  const referenceTester = await referenceTesterSetup.json();
  const modularTester = await modularTesterLogin.json();
  assertEquals(omitToken(modularTester), omitToken(referenceTester));
  const modularTesterHeaders = { "x-upstatus-token": modularTester.token };
  const referenceTesterHeaders = { "x-upstatus-token": referenceTester.token };

  // Differential negative authorization and validation contracts.
  await compareJsonPair("/api/health",
    { headers: modularTesterHeaders }, { headers: referenceTesterHeaders });
  await compareJsonPair("/api/history",
    { headers: modularTesterHeaders }, { headers: referenceTesterHeaders });
  await compareJsonPair("/api/remote-status/result?id=missing",
    { headers: modularTesterHeaders }, { headers: referenceTesterHeaders });
  await compareJsonPair("/api/remote-status",
    {
      method: "POST", headers: { ...modularTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ target: "Lohan", status: "busy", reason: "unauthorized" })
    },
    {
      method: "POST", headers: { ...referenceTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ target: "Lohan", status: "busy", reason: "unauthorized" })
    }
  );
  await compareJsonPair("/api/chat/clear",
    { method: "POST", headers: modularGuilhermeHeaders },
    { method: "POST", headers: referenceGuilhermeHeaders }
  );

  for (const statusPayload of [
    { status: "not-a-status" },
    { status: "busy", reason: "   " }
  ]) {
    await compareJsonPair("/api/status",
      {
        method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
        body: JSON.stringify(statusPayload)
      },
      {
        method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
        body: JSON.stringify(statusPayload)
      }
    );
  }
  await compareJsonPair("/api/chat",
    {
      method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: " " })
    },
    {
      method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: " " })
    }
  );
  await compareJsonPair("/api/chat/reaction",
    {
      method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageId: "missing", emoji: "🤡" })
    },
    {
      method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ messageId: "missing", emoji: "🤡" })
    }
  );
  const forbiddenMessagePair = await compareJsonPair("/api/chat",
    {
      method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "DIFFERENTIAL_FORBIDDEN_EDIT" })
    },
    {
      method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "DIFFERENTIAL_FORBIDDEN_EDIT" })
    },
    body => ({ ...body, message: { ...body.message, id: "<id>", createdAt: "<timestamp>" } })
  );
  await compareJsonPair("/api/chat/" + forbiddenMessagePair.modularBody.message.id,
    {
      method: "PATCH", headers: { ...modularTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "spoofed edit" })
    },
    {
      method: "PATCH", headers: { ...referenceTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "spoofed edit" })
    },
    undefined,
    "/api/chat/" + forbiddenMessagePair.recoveredBody.message.id
  );
  await compareJsonPair("/api/chat/" + forbiddenMessagePair.modularBody.message.id,
    { method: "DELETE", headers: modularTesterHeaders },
    { method: "DELETE", headers: referenceTesterHeaders },
    undefined,
    "/api/chat/" + forbiddenMessagePair.recoveredBody.message.id
  );
  await compareJsonPair("/api/chat/upload-url",
    {
      method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/x-msdownload", size: 1024, name: "invalid.exe" })
    },
    {
      method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/x-msdownload", size: 1024, name: "invalid.exe" })
    }
  );
  await compareJsonPair("/api/chat/upload-url",
    {
      method: "POST", headers: { ...modularGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/pdf", size: 20 * 1024 * 1024 + 1, name: "oversized.pdf" })
    },
    {
      method: "POST", headers: { ...referenceGuilhermeHeaders, "content-type": "application/json" },
      body: JSON.stringify({ mime: "application/pdf", size: 20 * 1024 * 1024 + 1, name: "oversized.pdf" })
    }
  );
  for (const guest of ["lucca", "ycaro"] as const) {
    await compareJsonPair("/api/" + guest + "/heartbeat",
      { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }
    );
    await compareJsonPair("/api/" + guest + "/login",
      {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "invalid-guest-password" })
      },
      {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "invalid-guest-password" })
      }
    );
  }

  const finalAdminPair = await compareJsonPair("/api/login",
    {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "deno-test-password" })
    },
    {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ricardo", password: "diff-test-password" })
    },
    omitToken
  );
  const finalModularAdminHeaders = { "x-upstatus-token": finalAdminPair.modularBody.token };
  const finalReferenceAdminHeaders = { "x-upstatus-token": finalAdminPair.recoveredBody.token };

  const fastMessageText = "DIFFERENTIAL_FAST_SYNC_MARKER";
  const fastSince = new Date(Date.now() - 60_000).toISOString();
  await compareJsonPair("/api/chat",
    {
      method: "POST", headers: { ...modularTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: fastMessageText })
    },
    {
      method: "POST", headers: { ...referenceTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: fastMessageText })
    },
    body => ({ ...body, message: { ...body.message, id: "<id>", createdAt: "<timestamp>" } })
  );
  await compareJsonPair("/api/chat/typing",
    {
      method: "POST", headers: { ...modularTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ typing: true })
    },
    {
      method: "POST", headers: { ...referenceTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ typing: true })
    }
  );
  await compareJsonPair("/api/chat/typing",
    { headers: finalModularAdminHeaders }, { headers: finalReferenceAdminHeaders });
  await compareJsonPair("/api/chat?fast=1&since=" + encodeURIComponent(fastSince),
    { headers: finalModularAdminHeaders }, { headers: finalReferenceAdminHeaders },
    body => {
      const message = body.messages.find((item: any) => item.message === fastMessageText);
      assert(message, "fast sync should include the differential message");
      return {
        message: { ...message, id: "<id>", createdAt: "<timestamp>" },
        unreadCount: body.unreadCount,
        typing: body.typing,
        luccaOnline: body.luccaOnline,
        profile: body.profiles.Guilherme ? "<avatar-url>" : null
      };
    }
  );
  await compareJsonPair("/api/chat/typing",
    {
      method: "POST", headers: { ...modularTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ typing: false })
    },
    {
      method: "POST", headers: { ...referenceTesterHeaders, "content-type": "application/json" },
      body: JSON.stringify({ typing: false })
    }
  );

  const imageMessagePair = await compareJsonPair("/api/chat",
    {
      method: "POST", headers: { ...finalModularAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "", imageUrl: differentialImageUrls.modular })
    },
    {
      method: "POST", headers: { ...finalReferenceAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ message: "", imageUrl: differentialImageUrls.reference })
    },
    body => ({
      ...body,
      message: { ...body.message, id: "<id>", createdAt: "<timestamp>", imageUrl: "<public-url>", image_url: "<public-url>" }
    })
  );
  assert(imageMessagePair.modularBody.message.imageUrl);
  await compareJsonPair("/api/chat/clear",
    { method: "POST", headers: finalModularAdminHeaders },
    { method: "POST", headers: finalReferenceAdminHeaders }
  );

  {
    (globalThis as any).__upstatusMockDbError = true;
    const response = await request("/api/account?name=Ricardo");
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock database failure" });
    assertEquals(response.headers.get("access-control-allow-origin"), "*");
  }

  console.log("PASS: Deno route matrix plus positive/negative public, authenticated, guest-cookie, media, typing, fast-sync, cleanup, health and fallback differential contracts against recovered monolith");
} catch (error) {
  console.error(error);
  throw error;
} finally {
  try { referenceServer.kill("SIGTERM"); } catch { /* already exited */ }
}
Deno.exit(0);
