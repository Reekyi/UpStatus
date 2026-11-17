# UpStatus Current State

> This is a handoff snapshot, not a substitute for checking live state. Re-verify branches, PRs, checks, and deployments before acting.

## Verified baseline at documentation setup

- Repository: `Reekyi/UpStatus`.
- Release file on `master`: `release.json` reports version `3.0.31`, no prerelease suffix.
- README release policy: `master` is production/stable; `develop` is integration/TEST; normal feature branches and PRs target `develop`; production deployment is manual.
- Latest relevant merged change observed: PR #11, "Fix Lucca call controls and improve call startup reliability", merge commit `c509277911b862d8624310f4d0acff56bea98b8c`.
- Its release version follow-up PR #12 was merged as `1e81a39d436b6e854a3e5172c0247a23e2f20ac5`.
- Vercel status check for commit `c509277911b862d8624310f4d0acff56bea98b8c` reported success and its production deployment metadata showed READY, alias `upstatus-lucca.vercel.app`, production target.
- Supabase production Edge Function `upstatus` was deployed to ACTIVE version 393 with version `3.0.31` and the updated userscript embedded. The active function source was retrieved and checked to contain the userscript update.
- Latest Lucca call fixes: corrected microphone icon state, removed injected call controls from the top header, and waited for Supabase Realtime subscription before outgoing call startup, with a clear timeout message.
- User reported the Lucca calls were working "100%" after the previous fixes. This is user-reported real-world success, not a universal connectivity guarantee.

## Known architectural constraints

- Lucca portal: `lucca-site/index.html`, served by Vercel project `upstatus-lucca`.
- Userscript source: `src/userscript/upstatus.user.template.js`.
- Supabase function source template: `src/server/index.template.ts`.
- Build/version authority: `release.json` and `scripts/build.mjs`; validation: `scripts/validate.mjs`.
- Supabase project ID: `dlfvkawaiqduhlazsszm`.
- Production function slug: `upstatus`; TEST function slug: `upstatus-test`.
- Do not print or store credentials/secrets in this file.
- README specifies feature PRs to `develop`, separate TEST identifiers and manual production deployment. Confirm the current release strategy before making future production changes.

## Stable Ycaro release preparation (2026-10-09)

- Created release branch `release/ycaro-3.0.32` from stable `master` commit `1e81a39d436b6e854a3e5172c0247a23e2f20ac5`, and opened draft PR #18 targeting `master`: https://github.com/Reekyi/UpStatus/pull/18.
- PR #18 bumps the stable version from `3.0.31` to `3.0.32`, adds `ycaro.html`, embeds it through the build script, and ports independent Ycaro login/session routes without replacing the stable Lucca implementation.
- The release branch preserves shared chat history: Ycaro login, logout, and expiry do not delete messages. The frontend sends/persists/clears its separate `upstatus_ycaro_token`.
- GitHub Actions `UpStatus Validate` run #100 passed for PR #18 head `5be9f8f2e5a2825aa1dc6fe3d26092f46bbb4d23`. The source preflight also confirmed the route, secret lookup, separate session, frontend token handling, and absence of Ycaro message deletion. This is not a live browser/login test.
- Vercel preview check `upstatus-ycaro` still fails with the known `STATIC_BUILD_NO_OUT_DIR` / missing `public` output directory configuration. Lucca's Vercel check passes. Do not change Vercel settings as part of this release; the corrected Ycaro HTML should be manually redeployed using the known manual-upload path after backend release approval.
- Production remains unchanged: Supabase Edge Function `upstatus` is ACTIVE version 394 and still serves backend version `3.0.31` without Ycaro routes. The live Ycaro Vercel alias still serves the older frontend and is not yet functional against production.
- The user reports setting `YCARO_PASSWORD` in the Supabase Dashboard, but the connected tools cannot verify secret names. Before deployment, confirm that the secret name exists in the Dashboard; never ask for or expose its value.
- PR #17 remains open against `develop`; its latest head `ec49a99c45068ff930a1ba62057c0fc0df913a1e` has a successful `UpStatus Validate` run, while its Ycaro Vercel preview check fails for the same project output-directory configuration.
- No PR was merged and no production function or frontend deployment was performed after the stable-version mismatch was discovered. Next step: review PR #18, verify the secret name in Dashboard, and only then follow the explicitly approved release sequence.

## Open items

- No known user-reported call bug is currently open; user said calls are working perfectly.
- Continuity documentation PR #13 was merged into `develop` as `b0f4bed3f635d6b6a68c1898286cd519907b632d`.
- Consider adding a link to these documents from README in a later small documentation change; the permanent prompt is already available in `docs/PROJECT_GUIDE.md`.
- Before any future WebRTC change, re-check current browser behavior and consider TURN only if real networks still fail.

## Bonfire note

The current chat is establishing durable continuity docs so a new chat can continue without rebuilding the whole conversation. The permanent prompt is in `docs/PROJECT_GUIDE.md`. The continuity docs are merged into `develop`. No production deployment was performed for this documentation-only change. At the start of the next task, read the guide and this file, then verify live repository and runtime state before implementation.

## Last updated

2026-10-09. Updated with the Ycaro stable-release preparation checkpoint. Re-check live GitHub, Supabase, and Vercel state before any merge or deployment.


## Reconstruction foundation checkpoint — 2026-11-17 13:30 BRT

A read-only audit was completed and documented in docs/RECONSTRUCTION_FOUNDATION.md on branch docs/reconstruction-foundation-2026-11-17.

Verified:
- master is at 9d40461; develop is at 6b33e1e; the branches are materially diverged (114 ahead / 147 behind).
- Production Normal is upstatus v480 / 3.4.7; its distributed userscript calls the legacy beta10 API runtime. Team Lite is upstatus-team-lite v15 / 3.4.30 and calls its own API runtime.
- The deployed Normal and Team Lite clients share the same public Realtime topic despite separate storage prefixes.
- Production has 38 active Edge Functions (2 official, 12 TEST/history, 13 screen-share beta, 11 backups); no legacy function was deleted.
- The production database has 10 public RLS-enabled tables with no policies, 3 client-executable SECURITY DEFINER broadcast functions, 106 public Realtime messages, 2 public Storage buckets, 188 objects and no Storage policies.
- The production migration ledger has 7 entries; four migration source files are absent from the inspected branches. Supabase managed branch main reports MIGRATIONS_FAILED.
- The only separate lab project upstatus-security-test is currently INACTIVE and is not a Full-Product TEST environment.
- Build/deploy configuration has environment-isolation and Team Lite function-slug defects documented in the reconstruction foundation.

No production writes, migrations, deploys, secret changes, merges or deletions occurred. No local build or tests were run. The architecture document is a draft map, not a readiness declaration.

Next: reconcile the exact source of each deployed runtime, including embedded userscripts and client endpoint consumers; then define the isolated Full-Product TEST contract before beginning modular code changes.


### TEST isolation finding — 2026-11-17 13:35 BRT

Decoded the embedded userscripts from production Normal, Team Lite, TEST and legacy beta10:
- Normal 3.4.7 distributes from upstatus but calls beta10 for API.
- TEST 3.3.28 distributes from upstatus-test but also calls beta10, uses the Normal Realtime topic and the Normal local storage prefix.
- Team Lite 3.4.30 calls its own API and has a separate local prefix, but still uses the same Realtime topic as Normal.
- The beta10 function embeds a beta8 script that points its update/API URLs to the beta8 slug.

The current TEST client is therefore not isolated from production. This is now documented in the reconstruction foundation addendum. No runtime or configuration was changed.


### Team Lite source divergence — 2026-11-17

The current team-lite-official branch HEAD is 9065bc1536fde64f437f6f12b7abb9b072cb8281 and its release.json is 3.0.40-beta.22, while the deployed upstatus-team-lite runtime is 3.4.30. PR #76 is based on that older branch and is not a drop-in replacement for the deployed Team Lite runtime. This distinction is recorded in the reconstruction foundation document.


### Realtime topic split-brain — 2026-11-17 13:40 BRT

Active database triggers publish db_change, user_status, remote_command and remote_result to upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Current Normal, Team Lite and TEST userscripts subscribe to upstatus-screen-share-live-3-1-1-beta10; the embedded beta10 script is actually beta8 and subscribes to the beta8 topic. Develop's build topic matches the database triggers, while master/current clients use beta10. This split-brain is documented in the reconstruction foundation. No channel or trigger was changed.


### Build/validator contradiction — 2026-11-17

master build.mjs points the Normal update/API URL at beta10, while master validate.mjs requires the update URL to use /upstatus/. The existing QA checkpoint for PR #82 recorded the resulting production updateURL mismatch. The production ledger also has seven migrations while master/develop contain only the first three SQL files; PR #176 recovers the remaining four statements from the ledger. Details are in RECONSTRUCTION_FOUNDATION.md.


### Existing candidate test/signaling foundation — 2026-11-17

PR #74's branch already contains an isolated authenticated-signaling vertical slice: 25 test scripts, a separate signaling transport module and Edge Function, explicit project guards, and candidate migrations for grants, broadcast minimization, call/voice room lifecycle and setup invites. The lab project used by its smoke tests is INACTIVE, and the candidate guard correctly rejects using that lab as the Full-Product TEST project. The candidate is useful groundwork but remains Draft and is not a complete modular reconstruction. No candidate migrations were applied.


### TEST userscript identity collision — 2026-11-17

The deployed upstatus-test 3.3.28 script declares the same @name and @namespace as Normal 3.4.7 (UpStatus - Sale Smartly / upseller). Both build scripts currently inspected expect the TEST namespace to be upseller-test, so the deployed TEST artifact is also not reproducible from those build templates. This is documented; no userscript was installed or changed.


### Runtime and database ACL verification — 2026-11-17 14:35 BRT

- Re-read the full deployed Edge Function sources for Normal (v480), Team Lite (v15), beta10 (v6), and TEST (v281); decoded the embedded userscripts.
- Confirmed Normal 3.4.7 and TEST 3.3.28 share the same Tampermonkey name/namespace, local storage prefix, API runtime (beta10), and Realtime topic. Team Lite 3.4.30 uses its own API and local prefix but shares the beta10 Realtime topic. The beta10 function embeds a beta8 client that points to beta8 for API/update and listens on the beta8 topic.
- Reconfirmed all 10 public tables have RLS enabled and no policies exist in public/realtime/storage. Nine public tables grant broad privileges to anon and authenticated; the public schema has six broad default-ACL entries across tables/functions/sequences for postgres and supabase_admin owners. Three SECURITY DEFINER broadcast trigger functions grant EXECUTE to PUBLIC/anon/authenticated; Security Advisor warns on anon/authenticated access.
- Confirmed the public database triggers publish full message records to the database topic while deployed clients subscribe to the beta10 topic. No exploit test was performed; no permissions or runtime were changed.
- Compared all four recovered migration files in PR #176 with the single SQL statements retained in the production migration ledger. SQL statements match; original Git blobs/comments/formatting are not recoverable from the ledger.
- Rechecked environment status: production managed branch main is MIGRATIONS_FAILED (preview ACTIVE_HEALTHY); isolated upstatus-security-test project is INACTIVE.
- No local build, automated test, browser E2E, migration, deploy, secret/grant/policy change, merge, or deletion was performed.

Next: finish source provenance and route/consumer parity across deployed runtimes and Git templates, then define a safe Full-Product TEST environment contract. Reconstruction foundation remains in progress.


### Candidate source reconciliation — 2026-11-17 14:45 BRT

- Normal candidate PRs #74/#161: candidate backend template contains all 34 literal route paths observed in deployed Normal plus /api/setup-invite. PR #161 changes the Normal API target from legacy beta10 to the deployed upstatus function and adds validator assertions tying API, update URL and production deploy target together. It remains Draft and unmerged; this API cutover requires isolated Full-Product TEST.
- Team Lite candidate PR #76: branch team-lite/signaling-transport-candidate adds an 814-line backend template and a Team Lite 3.4.31 script/release manifest. Its backend contains all 34 literal route paths observed in deployed Team Lite plus /api/setup-invite. Its script uses the database Realtime topic and its own upstatus-team-lite API.
- PR #76 build creates Normal TEST with a separate configured project and production Team Lite, but does not create a Team Lite TEST function/client variant. Full-Product TEST therefore remains incomplete for the two-product system.
- Candidate PRs #74, #76 and #161 remain Draft; no workflows were triggered and no tests/builds were run in this round.
- Route comparison is name-level only; it does not prove behavioral parity. Preserve the candidate branches for domain-by-domain review rather than merging them wholesale.

Next: compare runtime and candidate implementations by domain (auth/session, chat/media, presence/Realtime, voice/screen share, guests/admin), then specify a dual-product isolated TEST contract. Production remains unchanged.


### Candidate migration inventory — 2026-11-17 15:00 BRT

- Read the 23 candidate application migrations in the Normal #74/#161 line. Grouped them into ACL hardening, Realtime payload minimization, server-mediated signaling, call/voice attempt recovery, atomic chat receipts, and first-access invite/rate-limit work.
- Confirmed none of the candidate signaling tables/functions exists in production and the production migration ledger has no entries from 20261029170500 onward. These are unapplied architectural changes, not recovery of applied migrations.
- Preflight for the candidate unique index on users.name: 5 users, 0 NULL/blank names, 0 duplicate groups; users_name_unique index absent. Recheck in isolated TEST and before any approved migration.
- Identified an ACL hardening gap: candidate migration 20261105150000 only revokes defaults for owner postgres; current production also has broad public-schema default ACLs owned by supabase_admin. That owner needs a separate supported remediation plan.
- Realtime payload minimization requires coordinated client/backend rollout. Voice attempt singleton and account-scoped lock migrations replace the same RPC in order; setup invite columns, consume RPC, role semantics and rate limit are a dependency chain.
- No migration, DDL, grant, policy, function or production data was changed. No local tests or browser E2E were run.

Next: build the per-migration dependency/rollback graph and resolve a Full-Product TEST environment for both Normal and Team Lite before any database change.
