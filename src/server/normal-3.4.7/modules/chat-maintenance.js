export function createChatMaintenanceRoutes({ db, PROJECT_URL, randomBytes, response, logError = () => {} }) {
  async function clearChatRoute(name) {
    if (name !== "Ricardo") return response({ error: "Somente Ricardo pode limpar o chat." }, 403);
    const { data: oldMessages, error: readError } = await db.from("messages").select("image_url").gte("created_at", "1970-01-01");
    if (readError) throw readError;
    const prefix = PROJECT_URL + "/storage/v1/object/public/chat-images/";
    const objectPaths = Array.from(new Set((oldMessages || [])
      .map(m => String(m.image_url || ""))
      .filter(url => url.startsWith(prefix))
      .map(url => decodeURIComponent(url.slice(prefix.length).split("?")[0]))
      .filter(p => p && !p.includes("..") && !p.startsWith("/"))));
    const { error } = await db.from("messages").delete().gte("created_at", "1970-01-01");
    if (error) throw error;
    let removedFiles = 0;
    for (let i = 0; i < objectPaths.length; i += 100) {
      const batch = objectPaths.slice(i, i + 100);
      const { error: removeError } = await db.storage.from("chat-images").remove(batch);
      if (removeError) logError("Chat media cleanup failed", removeError);
      else removedFiles += batch.length;
    }
    await db.from("messages").insert({
      id: randomBytes(8).toString("hex"),
      user_name: "Sistema",
      message: "🧹 Ricardo limpou o chat.",
      type: "system",
      system_type: "chat_clear",
      created_at: new Date().toISOString(),
      image_url: "",
      mentions: [],
      reply_to: null,
      reactions: {}
    });
    return response({ ok: true, removedFiles });
  }

  return { clearChatRoute };
}
