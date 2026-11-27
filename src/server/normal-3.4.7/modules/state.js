export function createStateStore(db) {
  async function stateValue(key, fallback) {
    const { data, error } = await db
      .from("upstatus_state")
      .select("value")
      .eq("state_key", key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? fallback;
  }

  async function setState(key, value) {
    const { error } = await db
      .from("upstatus_state")
      .upsert(
        {
          state_key: key,
          value,
          updated_at: new Date().toISOString()
        },
        { onConflict: "state_key" }
      );
    if (error) throw error;
  }

  return { stateValue, setState };
}
