type QueryResult = { data: any; error: Error | null; count?: number };
declare global {
  var __upstatusMockDbError: boolean | undefined;
  var __upstatusMockDbFailure: { table: string; operation: string } | undefined;
  var __upstatusMockStorageFailure: { bucket: string; operation: string } | undefined;
}

const tables: Record<string, any[]> = {
  users: [
    { name: "Ricardo", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" },
    { name: "Guilherme", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" },
    { name: "Lohan", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" },
    { name: "Tester", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" }
  ],
  upstatus_sessions: [],
  upstatus_state: [],
  messages: [],
  status_history: [],
  upstatus_profiles: [],
  upstatus_typing: [],
  chat_reads: []
};

function dbFailure(table: string, operation: string) {
  return globalThis.__upstatusMockDbFailure?.table === table &&
    globalThis.__upstatusMockDbFailure?.operation === operation;
}
function storageFailure(bucket: string, operation: string) {
  return globalThis.__upstatusMockStorageFailure?.bucket === bucket &&
    globalThis.__upstatusMockStorageFailure?.operation === operation;
}

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
          if (dbFailure(table, "select")) {
            return Promise.resolve({ data: null, error: new Error("mock " + table + " select failure") });
          }
          if (globalThis.__upstatusMockDbError && table === "users") {
            return Promise.resolve({ data: null, error: new Error("mock database failure") });
          }
          return Promise.resolve({ data: selected()[0] || null, error: null });
        },
        single(): Promise<QueryResult> { return this.maybeSingle(); },
        insert(payload: any) {
          query.action = "insert";
          if (dbFailure(table, "insert")) {
            return Promise.resolve({ data: null, error: new Error("mock " + table + " insert failure") });
          }
          const items = Array.isArray(payload) ? payload : [payload];
          rows().push(...items.map(item => structuredClone(item)));
          return Promise.resolve({ data: items, error: null });
        },
        update(payload: any) { query.action = "update"; query.payload = payload; return this; },
        delete() { query.action = "delete"; return this; },
        upsert(payload: any, options?: { onConflict?: string }) {
          if (dbFailure(table, "upsert")) {
            return Promise.resolve({ error: new Error("mock " + table + " upsert failure") });
          }
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
          if (dbFailure(table, query.action)) {
            return Promise.resolve({ data: null, error: new Error("mock " + table + " " + query.action + " failure") }).then(resolve, reject);
          }
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
          upload: async (path: string, body: ArrayBuffer, options: unknown) => storageFailure(bucket, "upload")
            ? ({ data: null, error: new Error("mock " + bucket + " upload failure") })
            : ({ data: { path }, error: null }),
          createSignedUploadUrl: async (path: string) => storageFailure(bucket, "signed-upload")
            ? ({ data: null, error: new Error("mock " + bucket + " signed-upload failure") })
            : ({
              data: { token: "deno-test-upload-token", path, signedUrl: "/storage/v1/object/upload/sign/" + bucket + "/" + path },
              error: null
            }),
          getPublicUrl: (path: string) => ({
            data: { publicUrl: "https://mock-project.supabase.co/storage/v1/object/public/" + bucket + "/" + path }
          }),
          remove: async (_paths: string[]) => storageFailure(bucket, "remove")
            ? ({ data: null, error: new Error("mock " + bucket + " remove failure") })
            : ({ data: [], error: null })
        };
      }
    }
  };
  return db;
}
