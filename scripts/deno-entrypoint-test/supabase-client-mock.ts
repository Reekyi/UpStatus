type QueryResult = { data: any; error: Error | null; count?: number };
declare global {
  var __upstatusMockDbError: boolean | undefined;
}

const tables: Record<string, any[]> = {
  users: [
    { name: "Ricardo", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" },
    { name: "Guilherme", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" },
    { name: "Lohan", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" }
  ],
  upstatus_sessions: [],
  upstatus_state: [],
  messages: [],
  status_history: [],
  upstatus_profiles: [],
  upstatus_typing: [],
  chat_reads: []
};

function matches(row: any, filters: Array<[string, string, unknown]>) {
  return filters.every(([op, column, value]) => {
    const actual = row[column];
    if (op === "eq") return actual === value;
    if (op === "neq") return actual !== value;
    if (op === "in") return Array.isArray(value) && value.includes(actual);
    if (op === "lt") return actual < value;
    if (op === "gt") return actual > value;
    if (op === "gte") return actual >= value;
    return true;
  });
}

export function createClient(_url: string, _key: string, _options: unknown = {}) {
  const db = {
    from(table: string) {
      const query: {
        action: string;
        filters: Array<[string, string, unknown]>;
        payload: any;
        orderBy: string;
        ascending: boolean;
        limitValue: number | null;
        countMode: boolean;
      } = {
        action: "select", filters: [], payload: null, orderBy: "",
        ascending: true, limitValue: null, countMode: false
      };
      const rows = () => tables[table] || (tables[table] = []);
      const selected = () => rows().filter(row => matches(row, query.filters));
      const builder: any = {
        select(_columns?: string, options?: { count?: string; head?: boolean }) {
          query.action = "select";
          query.countMode = options?.count === "exact";
          return this;
        },
        eq(column: string, value: unknown) { query.filters.push(["eq", column, value]); return this; },
        neq(column: string, value: unknown) { query.filters.push(["neq", column, value]); return this; },
        in(column: string, value: unknown[]) { query.filters.push(["in", column, value]); return this; },
        lt(column: string, value: unknown) { query.filters.push(["lt", column, value]); return this; },
        gt(column: string, value: unknown) { query.filters.push(["gt", column, value]); return this; },
        gte(column: string, value: unknown) { query.filters.push(["gte", column, value]); return this; },
        order(column: string, options?: { ascending?: boolean }) {
          query.orderBy = column;
          query.ascending = options?.ascending !== false;
          return this;
        },
        limit(value: number) { query.limitValue = value; return this; },
        maybeSingle(): Promise<QueryResult> {
          if (globalThis.__upstatusMockDbError && table === "users") {
            return Promise.resolve({ data: null, error: new Error("mock database failure") });
          }
          return Promise.resolve({ data: selected()[0] || null, error: null });
        },
        single(): Promise<QueryResult> { return this.maybeSingle(); },
        insert(payload: any) {
          query.action = "insert";
          const items = Array.isArray(payload) ? payload : [payload];
          rows().push(...items.map(item => structuredClone(item)));
          return Promise.resolve({ data: items, error: null });
        },
        update(payload: any) { query.action = "update"; query.payload = payload; return this; },
        delete() { query.action = "delete"; return this; },
        upsert(payload: any, options?: { onConflict?: string }) {
          const items = Array.isArray(payload) ? payload : [payload];
          const key = options?.onConflict || (
            table === "upstatus_state" ? "state_key" :
            table === "upstatus_sessions" ? "token_hash" :
            table === "messages" ? "id" : "user_name"
          );
          for (const item of items) {
            const existing = rows().find(row => row[key] === item[key]);
            if (existing) Object.assign(existing, structuredClone(item));
            else rows().push(structuredClone(item));
          }
          return Promise.resolve({ error: null });
        },
        then(resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) {
          if (globalThis.__upstatusMockDbError && table === "users") {
            return Promise.resolve({ data: null, error: new Error("mock database failure") }).then(resolve, reject);
          }
          let data: any = null;
          if (query.action === "update") {
            for (const row of selected()) Object.assign(row, structuredClone(query.payload));
          } else if (query.action === "delete") {
            const remove = new Set(selected());
            tables[table] = rows().filter(row => !remove.has(row));
          } else {
            data = selected().map(row => structuredClone(row));
            if (query.orderBy) {
              data.sort((a: any, b: any) => {
                const comparison = String(a[query.orderBy] ?? "").localeCompare(String(b[query.orderBy] ?? ""));
                return comparison * (query.ascending ? 1 : -1);
              });
            }
            if (query.limitValue !== null) data = data.slice(0, query.limitValue);
          }
          return Promise.resolve({
            data,
            error: null,
            ...(query.countMode ? { count: selected().length } : {})
          }).then(resolve, reject);
        }
      };
      return builder;
    },
    storage: {
      from(bucket: string) {
        return {
          upload: async (path: string, body: ArrayBuffer, options: unknown) => ({
            data: { path }, error: null
          }),
          createSignedUploadUrl: async (path: string) => ({
            data: { token: "deno-test-upload-token", path, signedUrl: "/storage/v1/object/upload/sign/" + bucket + "/" + path },
            error: null
          }),
          getPublicUrl: (path: string) => ({
            data: { publicUrl: "https://mock-project.supabase.co/storage/v1/object/public/" + bucket + "/" + path }
          }),
          remove: async (_paths: string[]) => ({ data: [], error: null })
        };
      }
    }
  };
  return db;
}
