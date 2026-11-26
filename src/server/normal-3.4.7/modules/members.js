export function createMembersStore(db) {
  let membersCache = null;

  async function members() {
    const now = Date.now();
    if (membersCache && now - membersCache.at < 10000) return membersCache.data;
    const { data, error } = await db.from("users").select("name").order("name");
    if (error) throw error;
    const officialTeam = new Set(["Ricardo", "Guilherme", "Lohan"]);
    const out = (data || [])
      .filter((x) => officialTeam.has(String(x.name)))
      .map((x) => ({ name: String(x.name) }));
    membersCache = { at: now, data: out };
    return out;
  }

  return { members };
}
