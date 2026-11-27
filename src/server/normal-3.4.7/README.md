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



## Isolated Deno entrypoint execution

`scripts/deno-entrypoint-test/` provides a local Deno HTTP harness for the generated modular candidate. Its import map replaces the Supabase npm dependency with an in-memory mock, then exercises the real `Deno.serve` entrypoint over localhost. It checks health/CORS, OPTIONS, unauthenticated `/api/me`, protected-route authentication gating, public account/member endpoints, userscript and guest HTML delivery, and the global 500 boundary. Only fake Supabase environment values are used. This is not a live Supabase or managed Edge Runtime test.



The isolated Deno harness now also exercises setup/login and session invalidation, authenticated `/api/me`, status/presence/history/health, remote-status command and acknowledgement across two accounts, chat create/read/typing/reaction/edit/delete, avatar and image uploads, signed uploads, Lucca/Ycaro login/heartbeat/logout cookies, chat cleanup, and the global error boundary. All data and Storage operations are handled by in-memory mocks; credentials are test-only. Run #219 passed on `cc97676d3d482f583cdc6ff5e3bfe658726161c1`. This is still not a live Supabase or managed Edge Runtime test.



The Deno harness now includes a negative authorization matrix for a standard user and a second admin identity, actor/target spoof prevention, DB/Storage fault injection, malformed JSON, `/api/update-info`, profile lookup, direct image/document/audio/video uploads, invalid MIME/size, invalid guest credentials/heartbeat, and twelve concurrent chat inserts with unique IDs. Run #231 passed on `c7afa1bc76f9ec5de19895852956ce4069df7dfa`. Failures are simulated in memory and do not test live Supabase RLS or production load.



## Differential reference server

The builder now emits `dist/recovered-normal-reference/index.ts`, a test-only copy of the exact recovered monolith with only its local `Deno.serve` port changed to 8001. The Deno harness runs that reference and the modular candidate in separate processes with isolated in-memory Supabase mocks, then compares status, selected headers and response bodies exactly for public/unauthenticated routes, OPTIONS, static userscript/guest pages and invalid guest credentials. Run #252 passed on `72dbbd0868700a944a5113c703cd0749feea8de8`. Differential coverage of authenticated flows remains a follow-on gate; neither artifact is deployable.



Differential comparison now also covers normalized authenticated setup/login, `/api/me`, status/presence/history, chat creation/read/reaction/edit/delete, and the remote-status command/pending/ack/result lifecycle. Only tokens, IDs and timestamps are normalized; the remaining response fields are compared. Run #261 passed on `0692e9bd3fa854ecff5ae0a72c7f3ddcd534900d`. Guest cookie and media upload differential scenarios remain to be added; live Supabase and managed Edge Runtime validation remain external gates.



Differential HTTP coverage now includes Lucca/Ycaro valid login, cookie attributes, session lookup, heartbeat and logout, plus profile map, avatar upload, direct image/document/audio/video uploads and signed avatar/chat upload URLs. Tokens, timestamps and generated URLs/paths are normalized; the other response contracts are compared. Run #268 passed on `43eb054fe7d82fd1e872e3664e680e6617c94a4a`. Live Supabase and managed Edge Runtime validation remain external release gates.



Final offline differential coverage also checks negative contracts: standard-user/admin authorization, Ricardo-only chat clear, invalid/missing status reasons, empty chat messages, invalid reactions, forbidden edit/delete, rejected MIME and oversized files, invalid guest credentials/heartbeats, unknown account, duplicate setup (409), invalid login (401), authenticated health and authenticated 404 fallback. `Verify Recovered Normal Runtime` passed all 27 steps in run #278 on `a3aa766b00e30d6282bf26b85a9c9b5b8a242207`. Offline refactor validation is complete; live Supabase/managed Edge Runtime and cutover approval remain external gates and were not attempted.
