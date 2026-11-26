# Normal 3.4.7 source fragments

These files are an exact, ordered split of `src/server/normal-3.4.7.recovered.template.ts`.

**Important:** the `.part` files are source fragments, not standalone TypeScript modules. They intentionally share one lexical scope because the recovered runtime currently relies on shared top-level bindings and state. Do not add imports/exports, rename functions, change execution order, or edit the fragments independently without updating the offline reconstruction test.

Order and responsibility:

1. `00-runtime-config.part`: imports, runtime config, embedded userscript loader.
2. `01-http-auth-core.part`: HTTP helpers and authentication/session core.
3. `02-members-status-history.part`: members, health, status, history.
4. `03-chat-data.part`: message normalization and chat data helpers.
5. `04-shared-state.part`: shared state helpers.
6. `05-guest-session-core.part`: Lucca/Ycaro session helpers.
7. `06-media-core.part`: profile/media/upload primitives.
8. `07-auth-context.part`: request context resolution.
9. `08-chat-routes.part`: chat and message routes.
10. `09-media-routes.part`: profile and media routes.
11. `10-remote-status.part`: remote status route.
12. `11-guest-routes.part`: guest routes.
13. `12-http-entrypoint.part`: Deno entrypoint, dispatch, embedded guest HTML, error boundary.

The order is part of the runtime contract. The assembler in `scripts/verify-normal-runtime-recovery.mjs` joins the fragments and proves that they reconstruct the recovered template and the original deployed snapshot exactly.

This is an intermediate structural step. It creates clear source sections without changing the generated runtime. True ES-module isolation and dependency injection are later work and require their own characterization tests.
