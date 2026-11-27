(globalThis as any).EdgeRuntime = {
  waitUntil(promise: Promise<unknown>) { void promise; }
};
await import("../../dist/recovered-normal-reference/index.ts");
