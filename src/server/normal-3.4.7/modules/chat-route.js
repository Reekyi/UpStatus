export function createChatRouteHandler({ db, response, readBody, chatRows, mentions, expireLucca, randomBytes }) {
  async function chatRoute(req, name) {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const fast = url.searchParams.get("fast") === "1";
      const sinceRaw = url.searchParams.get("since") || "";
      const since = sinceRaw ? new Date(sinceRaw) : null;
      if (fast) {
        const effectiveSince = since && !Number.isNaN(since.getTime()) ? new Date(since.getTime() - 2000).toISOString() : "";
        const cutoffTyping = new Date(Date.now() - 4500).toISOString();
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const [messages, profileRes, typingRes, luccaStateNow, readRes] = await Promise.all([
          chatRows(name, effectiveSince),
          db.from("upstatus_profiles").select("user_name,avatar_url"),
          db.from("upstatus_typing").select("user_name").gt("last_seen_at", cutoffTyping).neq("user_name", name),
          expireLucca(),
          db.from("chat_reads").select("last_read_at").eq("user_name", name).maybeSingle()
        ]);
        const lastReadAt = readRes.data?.last_read_at || cutoff;
        const unreadQuery = db.from("messages").select("id", { count: "exact", head: true })
          .gte("created_at", cutoff).gt("created_at", lastReadAt)
          .neq("user_name", name).neq("type", "system");
        const { count: unreadCount, error: unreadError } = await unreadQuery;
        if (unreadError) throw unreadError;
        const profileMap = {};
        for (const profile of profileRes.data || []) if (profile.avatar_url) profileMap[profile.user_name] = profile.avatar_url;
        return response({
          messages,
          unreadCount: unreadCount || 0,
          profiles: profileMap,
          typing: (typingRes.data || []).map((x) => x.user_name),
          luccaOnline: luccaStateNow.online === true
        });
      }
      const cutoffTyping = new Date(Date.now() - 4500).toISOString();
      const [messages, readRes, profileRes, typingRes, luccaStateNow] = await Promise.all([
        chatRows(name),
        db.from("chat_reads").select("user_name,last_read_at,messages"),
        db.from("upstatus_profiles").select("user_name,avatar_url"),
        db.from("upstatus_typing").select("user_name").gt("last_seen_at", cutoffTyping).neq("user_name", name),
        expireLucca()
      ]);
      const read = readRes.data;
      const readBy = {};
      for (const row of read || []) {
        const map = row.messages && typeof row.messages === "object" ? row.messages : {};
        for (const [id, names] of Object.entries(map)) for (const n of Array.isArray(names) ? names : []) {
          if (!readBy[id]) readBy[id] = [];
          if (!readBy[id].includes(n)) readBy[id].push(n);
        }
      }
      for (const message of messages) message.readBy = readBy[message.id] || [];
      const me = (read || []).find((x) => x.user_name === name);
      const lastRead = me?.last_read_at ? Date.parse(me.last_read_at) : 0;
      const unreadCount = messages.filter((message) => message.type !== "system" && message.user !== name && Date.parse(message.createdAt) > lastRead).length;
      const profileMap = {};
      for (const profile of profileRes.data || []) if (profile.avatar_url) profileMap[profile.user_name] = profile.avatar_url;
      return response({
        messages,
        unreadCount,
        profiles: profileMap,
        typing: (typingRes.data || []).map((x) => x.user_name),
        luccaOnline: luccaStateNow.online === true
      });
    }

    const p = await readBody(req);
    const message = String(p.message || "").trim();
    const imageUrl = String(p.imageUrl || "").trim();
    const type = p.type === "document" ? "document" : p.type === "video" ? "video" : p.type === "audio" ? "audio" : imageUrl ? "image" : "text";
    if (!message && !imageUrl) return response({ error: "Digite uma mensagem ou envie um arquivo." }, 400);
    if (message.length > 1000) return response({ error: "A mensagem deve ter no máximo 1000 caracteres." }, 400);
    let replyTo = null;
    if (p.replyTo?.id) {
      const rows = await chatRows(name);
      const hit = rows.find((x) => x.id === String(p.replyTo.id));
      if (hit) replyTo = { id: hit.id, user: hit.user, message: hit.message, type: hit.type, imageUrl: hit.imageUrl };
    }
    const id = randomBytes(8).toString("hex");
    const createdAt = new Date().toISOString();
    const mentionList = await mentions(message);
    const { error } = await db.from("messages").insert({
      id,
      user_name: name,
      message,
      type,
      system_type: "",
      created_at: createdAt,
      image_url: imageUrl,
      mentions: mentionList,
      reply_to: replyTo,
      reactions: {}
    });
    if (error) throw error;
    return response({
      ok: true,
      message: {
        id,
        user: name,
        user_name: name,
        message,
        type,
        systemType: "",
        system_type: "",
        createdAt,
        imageUrl,
        image_url: imageUrl,
        mentions: mentionList,
        replyTo,
        reactions: {},
        readBy: []
      }
    });
  }

  return { chatRoute };
}
