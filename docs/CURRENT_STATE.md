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


### CI evidence and isolated lab blocker — 2026-11-17 15:15 BRT

- PR #74 and PR #161 exact-head GitHub Actions runs: UpStatus Validate and UpStatus Signaling Smoke Tests both succeeded. PR #161 smoke logs include 136/136 authenticated integration checks, real-browser WebRTC audio/video negotiation, three-member group mesh, signaling rate-limit, atomic read receipts and setup-invite checks. This is historical CI evidence, not a manual Sale Smartly test or full product validation.
- PR #76 Team Lite Candidate Checks: static/contract steps passed, but isolated endpoint smoke failed with HTTP 402 exceed_edge_functions_invocations_quota; later authenticated/browser tests were skipped.
- Current Supabase project status for upstatus-security-test is INACTIVE. The Supabase error says the owner must upgrade the plan or remove spend caps to restore Edge Function service. Human action is required before rerunning isolated E2E; no credentials should be shared.
- PR #178 documentation-only validation failed on develop with client signed upload helper missing, an inherited base-branch validator inconsistency. The PR changes only docs and remains Draft.
- No workflow was manually dispatched, no plan/spend cap/project setting was changed, and no deploy/merge/production mutation occurred.

Human unblock: restore upstatus-security-test service in the Supabase Dashboard by resolving the invocation quota (owner decision: plan upgrade or spend-cap adjustment). Static review can continue meanwhile.


### Production Normal HTTP 402 log check — 2026-11-17 15:20 BRT

- Read-only ClickHouse logs query: 67,701 function_edge_logs rows in the 24-hour window; HTTP 402s are concentrated on the legacy beta10 API used by Normal 3.4.7.
- In the latest one-hour window queried: /api/chat 3,205; /api/status 1,364; /api/remote-status 1,362; /api/members 2; /api/me 2, all HTTP 402. No upstatus-team-lite requests appeared in that hour; this is not proof Team Lite is healthy.
- The production project management status still reads ACTIVE_HEALTHY, but edge logs also show 402 from infrastructure health/ready endpoints. Current beta10 source has no explicit 402 response branch; its general catch returns 500. Root cause is not confirmed and must not be conflated with the separate lab quota error.
- Likely impact: the Normal client sends chat/status/remote-status requests to beta10, so these failures are consistent with the reported Normal presence/chat problem. Scope and root cause remain unverified.
- Human action: project owner should inspect UpStatus Dashboard usage/billing/spend caps and Edge Function service state, especially beta10. No plan/spend-cap/function/secret change was made.

All checks were read-only. No production request that writes data, migration, deploy or config change occurred.


### Architecture correction — Realtime product sharing vs environment isolation — 2026-11-17 15:25 BRT

Code inspection of Normal #161 and Team Lite #76 shows both product candidates intentionally use the same production topic that database triggers publish to. Their shared voice-room aliases also support cross-product interoperability. Therefore, Realtime isolation must be enforced between PROD and TEST environments, not blindly between Normal and Team Lite. Splitting product topics without an explicit bridge could break Normal ↔ Team Lite voice/presence. Shared public production broadcasts must remain minimal hints only; sensitive signaling should use authenticated server-mediated transport.


### Recheck of production 402, ACLs and candidate evidence — 2026-11-17 15:35 BRT

- Re-queried production `function_edge_logs` for 17:35–18:35 UTC (14:35–15:35 BRT). There were 9,327 HTTP 402 responses from the legacy `upstatus-screen-share-3-1-1-beta10` runtime: `/api/chat` 5,038; `/api/remote-status` 2,144; `/api/status` 2,141; `/api/members` 2; `/api/me` 2. The errors remain active. Execution-time metadata ranged from 0 to single-digit milliseconds; this does not identify the upstream cause. Do not attribute the 402 to billing/quota without the Dashboard's explicit reason.
- The current production Security Advisor still reports 10 public tables with RLS and no policies, plus the three `upstatus_broadcast_*` SECURITY DEFINER functions executable by anon/authenticated. Direct catalog reads reconfirmed that 9/10 public tables grant broad table privileges to anon and authenticated, and that default ACLs for both postgres and supabase_admin owners remain broad for future public-schema tables/functions/sequences. No exploit test was performed and no ACL/policy was changed.
- Re-fetched PR #161 review discussion and exact-head workflow runs: Validate run 43479685384 and Signaling Smoke run 43479685445 both succeeded on SHA 557814dc31bed779b84a2094358dc6b2a7e67689. The maintainer's run note records 19/19 unauthenticated and 136/136 authenticated smoke checks, including WebRTC and invite/rate-limit coverage. This is historical candidate evidence only: PR #161 remains Draft, has no submitted reviews, does not constitute Full-Product TEST or a manual Sale Smartly test, and authorizes no release.
- PR #178 remains documentation-only in scope (two files: docs/CURRENT_STATE.md and docs/RECONSTRUCTION_FOUNDATION.md); it has no submitted reviews or discussion comments. Its branch is 26 commits ahead of develop and 0 behind; the diff from develop remains limited to those two documentation files. No merge was performed.
- Production project remains ACTIVE_HEALTHY at management level while the managed main branch reports MIGRATIONS_FAILED; the isolated upstatus-security-test project remains INACTIVE. These states do not establish application health.
- No local build, test, browser E2E, migration, deploy, merge, secret/config change, grant/policy change, or data/function deletion occurred in this run.

Next: continue domain-level source/provenance comparison and prepare a precise dual-product Full-Product TEST contract. Human unblock remains the owner's inspection of the production Dashboard's explicit 402 reason and restoration/selection of an isolated TEST project. Do not guess the billing/quota cause or alter production to investigate.


### TEST contract and release-channel clarification — 2026-11-17 15:40 BRT

- Corrected the Team Lite version interpretation: root `release.json` on `team-lite-official` is 3.0.40-beta.22, but deployed Team Lite 3.4.30 uses the separate `team-lite/release.json` (buildVersion 3.4.30) and `team-lite/upstatus-team-lite.user.js`. The client updater fetches that product manifest and verifies the served script version. No active Team Lite update-channel mismatch was found; the missing source artifact is the corresponding backend template.
- Re-decoded the deployed clients: Normal 3.4.7 and TEST 3.3.28 share Tampermonkey name/namespace `UpStatus - Sale Smartly / upseller`, API beta10 and Realtime beta10. Team Lite 3.4.30 has its own namespace and API but shares beta10 Realtime. The beta10 function embeds a beta8 client that points API/update/topic to beta8.
- Formalized the Full-Product TEST contract in RECONSTRUCTION_FOUNDATION.md: separate active Supabase project, two function slugs (`upstatus-test`, `upstatus-team-lite-test`), two unique test client identities, separate local prefixes, a TEST-only Realtime topic, TEST Storage/secrets and synthetic data. The current production-project `upstatus-test` does not meet this contract.
- Rechecked 24-hour production logs: 73,672 HTTP 402 responses from beta10 and 6 from `upstatus` (all six were script-download requests). The latest hour contained 9,327 beta10 402s. No Team Lite calls appeared in the queried log window. Root cause remains unconfirmed; no billing/quota assumption is made.
- PR #178 Validate run 44149802579 failed at `client signed upload helper missing` in `scripts/validate.mjs:55`. The PR still changes only documentation. PR #174 contains the missing helper and passed exact-head Validate run 43802407509; PR #175's dedicated admin-role regression passed, while its full Validate failed on the same #174 dependency. No candidate PR was merged.
- No local build, manual browser test, migration, deploy, merge, secret/config change, grant/policy change, or production data/function mutation occurred.

Next: continue reviewing domain contracts and candidate branch dependencies. Full-Product TEST remains blocked on an owner-provisioned active isolated project; production 402 remains blocked on the owner's read-only Dashboard inspection and confirmation of the displayed cause.


### Domain dependency and TEST build review — 2026-11-17 15:45 BRT

- Added a domain-level matrix to RECONSTRUCTION_FOUNDATION.md covering auth/session, presence, chat/receipts, media, voice/screen share, remote control, guest portals and distribution/update identity.
- Static inspection confirms the four deployed backends directly reference the same core tables and chat-images bucket. The separate public.reactions table has zero rows and no direct backend .from("reactions") use in the inspected runtimes; it remains only a possible legacy object until client/trigger/SQL references are checked. Candidate backends add three RPC dependencies for setup invites/rate limit and atomic chat receipts.
- Confirmed the Full-Product TEST gap at build/workflow level: Normal candidate #74 creates only Normal upstatus-test; Team Lite candidate #76 adds the Team Lite production function but still has no upstatus-team-lite-test function, Team Lite TEST client identity or Team Lite TEST manifest. Its deploy-test workflow deploys only upstatus-test.
- No source code or workflow was changed; no build, test, migration, deploy, merge or production mutation was performed.

Next: inspect client-side references for the legacy reactions table and map the candidate signaling/voice migration dependency order against the exact RPC/function definitions. Full-Product TEST remains an owner-provisioning blocker.


### Signaling, migration and legacy table dependency review — 2026-11-17 15:50 BRT

- Mapped the candidate authenticated signaling function and client adapter. It is a separate Edge Function with room/call/voice/screen endpoints and custom-session authentication; its database dependencies are the new signaling rooms, memberships, events, bindings and call/voice attempt tables.
- Verified that Normal and Team Lite candidate userscripts keep the signaling feature flag disabled by default (GM storage default false). Candidate CI does not activate this transport for existing users.
- Expanded the migration dependency graph in RECONSTRUCTION_FOUNDATION.md. Key ordered replacements: setup-invite consume RPC is replaced twice before rate limiting; voice-room attempt open RPC is replaced by singleton and then account-scoped-lock versions. Public broadcast minimization requires coordinated client rollout. The postgres default-ACL migration does not fix supabase_admin defaults.
- Investigated public.reactions: zero rows, only primary-key index, no triggers/FKs, no public SQL functions or direct backend/client table calls in the inspected runtimes. Current client reactions are carried in messages.reactions JSON. Treat the table as a possible legacy object only; no deletion is authorized.
- No migration, build, deploy, merge, ACL change, data mutation or browser test was performed.

Next: continue historical-client/external-consumer search before classifying any legacy function/table as removable, then finalize the isolated TEST migration rehearsal checklist.


### Reconstruction foundation handoff — 2026-11-17 15:55 BRT

Phase 1 discovery/architecture foundation is ready for owner handoff. The architecture map, runtime/source divergence, domain dependencies, migration order, risks and dual-product Full-Product TEST contract are documented in RECONSTRUCTION_FOUNDATION.md.

The next phase is blocked on two owner actions: (1) inspect the UpStatus Supabase Dashboard and share the exact reason shown for the beta10/Normal HTTP 402 responses, without changing billing or production settings; (2) provision/restore a dedicated active Full-Product TEST project with Edge Functions, Realtime and Storage, and provide only its Project Ref. No service-role keys are needed in chat.

PR #178 remains a documentation-only Draft PR. Its Validate failure is the inherited develop assertion client signed upload helper missing; PR #174 contains the separate candidate fix and has a successful exact-head Validate run. No candidate was merged.

No local full build, Full-Product TEST, manual Sale Smartly/Tampermonkey acceptance, migration, deploy, merge, secret/config/ACL/policy change, or production data/function mutation occurred. Production is not repaired or declared ready. No production changes were made.

**Phase 1 status: READY FOR HANDOFF.** Next: create the dual-product TEST build/deploy path and rehearse migrations only in the owner-provisioned isolated project.


### Runtime inventory and 402 verification — 2026-11-17

- Repeated the read-only Supabase Edge Function inventory: 38 ACTIVE functions (1 Normal, 1 Team Lite, 12 TEST/historical, 13 screen-share beta, 11 named backups). All 38 entrypoint SHA-256 values are distinct; backup names do not indicate byte-identical entrypoints. No function was changed or removed.
- Queried the last 24 hours of `function_edge_logs`: 74,986 HTTP 402 responses across beta10 chat/status/remote-status/members/me/account and the Normal userscript distribution endpoint. Mean recorded execution times were 1.4–19.2 ms by route. A separate last-60-minute query returned no `edge_logs` rows. These observations do not identify the platform cause; owner Dashboard inspection remains required.
- Rechecked PR #178 exact HEAD `6ac510c3b9334adb3d9a3e6247f47e9c992943e0`: Validate failed at `scripts/validate.mjs:55` because the inherited develop client lacks the signed-upload helper. Build step itself generated PROD 3.0.40 / TEST 3.0.40-beta.22. Supabase Preview was skipped because no Supabase Branch is associated. PR #174 has a separate successful candidate CI run but remains unmerged.
- Clarification: the earlier “ready for owner handoff” note means the investigation has enough evidence to request the two owner prerequisites; it does **not** mean the reconstruction foundation is complete. Full-Product TEST, complete runtime-consumer provenance, reproducible isolated build, and integrated domain validation remain outstanding.
- Updated `docs/RECONSTRUCTION_FOUNDATION.md` with the detailed evidence. Documentation-only commit: `3616648dfa449bd144539927ea49a65f13a62e7a`.
- No local test/build, browser test, deploy, merge, migration, secret/config/ACL/policy change, or production data/function mutation occurred.

Next: map external/client references to the 38 active functions and compare candidate build manifests for Normal, Team Lite and Full-Product TEST. Continue waiting for the owner-provided 402 Dashboard reason and isolated Full-Product TEST Project Ref before integrated tests.
