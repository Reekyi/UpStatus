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
    assertEquals((await avatar.json()).ok, true);

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
  }
  {
    Deno.env.set("LUCCA_PASSWORD", "lucca-deno-test");
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
    const logout = await request("/api/logout", {
      method: "POST", headers: authHeaders
    });
    assertEquals(logout.status, 200);
    const protectedAfterLogout = await request("/api/status", { headers: authHeaders });
    assertEquals(protectedAfterLogout.status, 401);
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
    (globalThis as any).__upstatusMockDbError = true;
    const response = await request("/api/account?name=Ricardo");
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: "mock database failure" });
    assertEquals(response.headers.get("access-control-allow-origin"), "*");
  }

  console.log("PASS: isolated Deno dispatcher authorization matrix, auth/session, status/history/health, remote status, chat, media/storage, guest cookies, DB/Storage failures and global error boundary");
} catch (error) {
  console.error(error);
  Deno.exit(1);
}
Deno.exit(0);
