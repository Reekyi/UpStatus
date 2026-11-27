export function createChatDataStore({ db, members }) {
  async function mentions(text) {
    const names = (await members()).map((x) => x.name);
    const found = [];
    for (const match of String(text).matchAll(/@([\p{L}\p{N}_-]+)/gu)) {
      const raw = match[1].toLowerCase();
      if (raw === "todos") {
        for (const name of names) if (!found.includes(name)) found.push(name);
        continue;
      }
      const hit = names.find((name) => name.toLowerCase() === raw);
      if (hit && !found.includes(hit)) found.push(hit);
    }
    return found;
  }

  async function chatRows(name, since) {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    let query = db.from("messages")
      .select("id,user_name,message,type,system_type,created_at,edited_at,image_url,mentions,reply_to,reactions")
      .gte("created_at", cutoff);
    if (since) query = query.gt("created_at", since);
    const { data, error } = await query.order("created_at", { ascending: true }).limit(since ? 200 : 1000);
    if (error) throw error;
    return (data || []).map((message) => ({
      id: String(message.id),
      user: message.user_name,
      message: message.message || "",
      type: message.type || "text",
      systemType: message.system_type || "",
      createdAt: message.created_at,
      imageUrl: message.image_url || "",
      mentions: Array.isArray(message.mentions) ? message.mentions : [],
      replyTo: message.reply_to || null,
      reactions: message.reactions || {},
      readBy: []
    }));
  }

  return { mentions, chatRows };
}
