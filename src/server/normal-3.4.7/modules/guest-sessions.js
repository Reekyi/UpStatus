export function createGuestSessionStore({ stateValue, setState, db, randomBytes }) {
  function cookie(req, name) {
    const raw = req.headers.get("cookie") || "";
    const item = raw.split(";").map((x) => x.trim()).find((x) => x.startsWith(name + "="));
    return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
  }

  function luccaToken(req) {
    const auth = req.headers.get("authorization") || "";
    if (/^Bearer\\s+/i.test(auth)) return auth.replace(/^Bearer\\s+/i, "").trim();
    return cookie(req, "lucca_session");
  }

  async function luccaState() {
    return await stateValue("lucca", { online: false, session: null, joinedAt: null, lastSeen: null });
  }

  async function expireLucca() {
    const s = await luccaState();
    if (!s.online || !s.lastSeen || Date.now() - Date.parse(String(s.lastSeen)) < 12000) return s;
    const next = { ...s, online: false, session: null, lastSeen: new Date().toISOString() };
    await setState("lucca", next);

    await db.from("messages").insert({
      id: randomBytes(8).toString("hex"),
      user_name: "Sistema",
      message: "🔴 Lucca Maluco saiu do chat.",
      type: "system",
      system_type: "lucca_leave",
      created_at: new Date().toISOString(),
      image_url: "",
      mentions: [],
      reply_to: null,
      reactions: {}
    });
    return next;
  }

  function ycaroToken(req) {
    const auth = req.headers.get("authorization") || "";
    if (/^Bearer\\s+/i.test(auth)) return auth.replace(/^Bearer\\s+/i, "").trim();
    return cookie(req, "ycaro_session");
  }

  async function ycaroState() {
    return await stateValue("ycaro", { online: false, session: null, joinedAt: null, lastSeen: null });
  }

  async function expireYcaro() {
    const s = await ycaroState();
    if (!s.online || !s.lastSeen || Date.now() - Date.parse(String(s.lastSeen)) < 12000) return s;
    const next = { ...s, online: false, session: null, lastSeen: new Date().toISOString() };
    await setState("ycaro", next);
    await db.from("messages").insert({
      id: randomBytes(8).toString("hex"),
      user_name: "Sistema",
      message: "🟠 Ycaro saiu do chat.",
      type: "system",
      system_type: "ycaro_leave",
      created_at: new Date().toISOString(),
      image_url: "",
      mentions: [],
      reply_to: null,
      reactions: {}
    });
    return next;
  }

  return { cookie, luccaToken, luccaState, expireLucca, ycaroToken, ycaroState, expireYcaro };
}
