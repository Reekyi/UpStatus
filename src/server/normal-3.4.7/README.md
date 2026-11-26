# Normal 3.4.7 source fragments and modular candidate

The files in `fragments/` remain an exact, ordered split of `src/server/normal-3.4.7.recovered.template.ts`.

**Important:** the `.part` files are source fragments, not standalone TypeScript modules. They intentionally share one lexical scope because the recovered runtime relies on shared top-level bindings and state. Do not edit them independently without updating the offline reconstruction test.

## Exact recovery source

The ordered fragments are assembled by `scripts/verify-normal-runtime-recovery.mjs`. The verifier proves that they reconstruct the recovered template and the original deployed snapshot exactly. The fragments are the immutable reference for behavior during this cleanup.

## Extracted ES modules

Seventeen dependency-injected modules currently live in `modules/`:

1. `http.js`: HTTP response and body parsing helpers.
2. `state.js`: shared persisted state helpers.
3. `auth-crypto.js`: token and password cryptography.
4. `guest-sessions.js`: Lucca/Ycaro session state, cookies and expiration.
5. `members.js`: official member roster and cache.
6. `status.js`: health, status and history handlers.
7. `remote-status.js`: remote status command/result handling.
8. `chat-data.js`: message normalization, queries and mentions.
9. `media.js`: profile map, media validation and upload primitives.
10. `auth-context.js`: authenticated user/guest context resolution.
11. `chat-route.js`: primary chat route.
12. `media-routes.js`: profile, media and signed-upload routes.
13. `guest-routes.js`: Lucca/Ycaro HTTP routes.
14. `chat-interaction-routes.js`: read, typing, reaction, edit and delete routes.
15. `auth-core.js`: account lookup, token/session validation, login and setup.
16. `auth-routes.js`: account, current-user and logout endpoints.
17. `chat-maintenance.js`: authorized chat cleanup and associated Storage objects.

Each module exposes a factory and receives runtime dependencies explicitly. The existing Supabase client and shared session cache are not duplicated.

## Isolated candidate

Run:

```sh
node scripts/build-normal-modular-candidate.mjs
```

The builder first proves that reversing the extractions and imports reconstructs the recovered template exactly. It then emits the actual module-integrated candidate at `dist/modular-normal-candidate/index.ts` and copies all seventeen modules beside it.

The dedicated GitHub Actions workflow:
- reconstructs the original runtime exactly;
- runs the seventeen offline module characterization tests;
- builds the isolated modular candidate;
- bundles/parses the candidate and its local module graph with esbuild.

## Entry-point boundary and safety

The Deno entrypoint, global error boundary, route dispatch order, embedded HTML/userscript delivery and runtime configuration remain in the entrypoint. This is intentional: preserve the existing execution boundary until integrated behavior is characterized.

The candidate is for offline review only. It is not deployed, not copied to `supabase/functions`, and not wired into the production build. Do not change Supabase schema, RLS, grants, secrets, project settings, migrations, Edge Functions or deployment workflows as part of this cleanup.

## Offline integration characterization

The dedicated workflow also runs four cross-module integration tests with in-memory dependencies:

- `scripts/test-normal-modular-integration.mjs`: HTTP, auth, shared state and guest-session composition.
- `scripts/test-normal-chat-integration.mjs`: members, chat data, message flow, read receipts and interactions.
- `scripts/test-normal-media-integration.mjs`: profile mapping, direct Storage uploads and signed upload flow.
- `scripts/test-normal-status-integration.mjs`: status/history/health and remote command lifecycle.

These tests characterize domain composition without connecting to the live Supabase project. They do not establish full Deno dispatcher execution or production compatibility. The next validation gate is cross-cutting HTTP contract characterization, followed by isolated Deno execution. The modular candidate remains offline and is not deployed.



## Dispatcher contract audit

The modular candidate builder verifies both the presence and the order of the critical `Deno.serve` dispatch branches: OPTIONS, public assets, path normalization, guest pages and endpoints, setup/login, `/api/me` before the authenticated-route gate, logout, protected domain routes, 404 fallback and the global 500 error boundary. This is a static structural guard; it does not replace isolated Deno execution or live-environment validation.
