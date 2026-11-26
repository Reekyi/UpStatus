type QueryResult = { data: unknown; error: Error | null };
declare global {
  var __upstatusMockDbError: boolean | undefined;
}
export function createClient(_url: string, _key: string, _options: unknown = {}) {
  return {
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      const builder: any = {
        select(_columns?: string) { return this; },
        eq(column: string, value: unknown) { filters.push([column, value]); return this; },
        order(_column: string, _options?: unknown) { return this; },
        maybeSingle(): Promise<QueryResult> {
          if (globalThis.__upstatusMockDbError && table === "users") {
            return Promise.resolve({ data: null, error: new Error("mock database failure") });
          }
          if (table === "users") {
            const name = filters.find(([key]) => key === "name")?.[1];
            return Promise.resolve({
              data: name === "Ricardo"
                ? { name: "Ricardo", password_hash: null, role: null, status: "offline", reason: "", sync: "not_configured" }
                : null,
              error: null
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) {
          if (globalThis.__upstatusMockDbError && table === "users") {
            return Promise.resolve({ data: null, error: new Error("mock database failure") }).then(resolve, reject);
          }
          const data = table === "users"
            ? [{ name: "Ricardo" }, { name: "Guilherme" }, { name: "Lohan" }]
            : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        }
      };
      return builder;
    }
  };
}
