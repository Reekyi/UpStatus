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


## 2026-11-04 live continuation checkpoint

This section supersedes older PR/runtime snapshots above where they conflict. Re-verified against GitHub at 11:39-11:45 BRT:

- PR #74: open Draft, unmerged; branch `chore/continuity-foundation`, head originally `2219a1b297545f8e894aa39c2e3a70038903c0a7`. A new source-validation regression assertion was committed as `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c` to verify that Normal and TEST restart the authenticated signaling transport when Realtime is restarted after an online event. UpStatus Validate run `41850211413` passed. Signaling Smoke run `41850210903` was still running at the last check; inspect it before claiming full CI success.
- PR #76: open Draft, unmerged; branch `team-lite/signaling-transport-candidate`, head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e`. Added a candidate-check assertion that Team Lite's online recovery restarts Realtime and recreates the authenticated signaling transport. A new workflow result for this exact head was not yet visible through the connected workflow-run lookup at the last check; verify before claiming pass.
- PR #75: open Draft, unmerged; branch `team-lite/3.4.31-guest-fixes`, head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; prior Candidate Checks run `41674353127` passed.
- Created `UPSTATUS_HANDOFF.md` on branch `docs/continuity-handoff-2026-11-04`; draft PR #80 targets `develop`. This handoff is the concise source for a new chat.
- Updated issue #79 with comment `6633530331` linking the handoff and recording current PR/CI evidence.
- No application runtime code was changed in this checkpoint; only regression assertions and documentation. No merge, deployment, production migration, production flag, secret, or production resource was changed.

### Immediate next actions

1. Inspect completion and full job logs for Normal Signaling Smoke run `41850210903`.
2. Confirm CI for PR #76 exact head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e`; fix any assertion/CI failure and rerun only failed jobs when appropriate.
3. Continue core release closure using `UPSTATUS_HANDOFF.md`; do not repeat historical discovery. Physical Tampermonkey/network validation and production security/cutover approval remain separate gates.


### CI refresh — 2026-11-04 11:48 BRT

- Team Lite PR #76 exact head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e` passed Candidate Checks run `41850263270`; full job `126644365017` logs inspected. 86/86 authenticated integration checks passed; Chromium call/voice/screen WebRTC and three-member mesh passed; invitation/fanout, teardown, fixture cleanup, version/portal/session/updater checks passed. The new Team Lite reconnect transport assertion passed.
- Normal PR #74 exact head `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c`: Validate run `41850211413` passed. Signaling Smoke run `41850210903` remained in progress during authenticated integration/browser tests at last check.
- No runtime code changed in these two commits; issue #78 remains open because CI does not simulate a physical outage through the full Tampermonkey userscript.


### CI completion — 2026-11-04 11:50 BRT

- Normal #74 exact head `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c`: Validate run `41850211413` and Signaling Smoke run `41850210903` both SUCCESS. Full smoke job `126644179048` logs inspected: 14/14 unauthenticated, 86/86 authenticated integration checks, Chromium call/voice/screen media, three-member mesh, teardown, and fixture cleanup passed.
- Team Lite #76 exact head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e`: Candidate Checks `41850263270` SUCCESS. Full job `126644365017` logs inspected: 86/86 authenticated checks, Chromium media, invitation/fanout, three-member mesh, teardown, fixture cleanup, candidate/version/portal/session/updater checks passed.
- Known non-blocking workflow warning: `actions/checkout@v4` Node 20 deprecation under Node 24 runner.
- Physical network recovery in Tampermonkey remains unverified; no runtime code or production resource changed.


## Chat unread candidate checkpoint (2026-11-04)

PR #74 includes a candidate fix for a false-read race: unread counts now use the persisted per-message receipt map in full and fast chat routes, and `last_read_at` advances only to the newest valid message in the submitted read batch. Empty/invalid batches do not advance the cursor. Regression coverage was added for persisted receipts after refresh and messages arriving after the read snapshot.

- Normal Validate: run `41853971245` passed.
- Team Lite Candidate Checks: run `41852223087` passed.
- Normal Signaling Smoke: run `41853226497` was still running authenticated integration at last inspection; the newer smoke run `41853971486` was queued behind the shared isolated-project concurrency group.
- Issue #24 remains open: the JSONB receipt map is still updated through read-modify-upsert and can lose updates under concurrent requests on separate Edge Function isolates. An atomic DB-side merge and isolated concurrency test remain necessary. No database migration, deployment, or production change was made.


## Isolated Supabase grant audit (2026-11-04)

- Three trigger-only SECURITY DEFINER broadcast functions deny EXECUTE to anon/authenticated; service_role retains EXECUTE.
- Backend-owned chat, users, sessions, signaling, status and typing tables have RLS enabled and no client SELECT/INSERT grants.
- Remaining exceptions: `public.upstatus_visual_config` and `realtime.messages` retain anon/authenticated SELECT/INSERT grants while RLS is enabled with no policies. This is an unnecessary grant surface; it does not prove row access. Matrix RT-14 is PARTIAL and RT-17 was added.
- Security Advisor returned 14 INFO RLS-enabled/no-policy notices; Performance Advisor returned five unused-index INFO notices. No WARN/ERROR items returned.
- No migration applied. A reviewed isolated migration is still needed. Supabase CLI was unavailable in this environment, so no migration filename was fabricated and no migration workflow was bypassed.


## Latest CI status (2026-11-04 15:10 UTC)

- Normal Validate run `41854832531` passed on latest Normal PR head `5d700050dfbd8e221be7d61e130585dde2003879`.
- Normal Signaling Smoke run `41853971486` passed unauthenticated endpoint and authenticated integration/browser checks on `fb1417ab69a16b0bf30611df5584e8d0d3466076`; later Normal commits were workflow/docs-only.
- Team Lite Candidate Checks run `41854846745` is still running on workflow head `2d1fa7d1d66655bf7081362330edafe9ea54a9a8`; adapter and unauthenticated endpoint checks passed, authenticated integration/browser step remains in progress.



## 2026-11-05 10:00 BRT — current engineering checkpoint

### Verified candidate refs

- **Normal PR #74:** open, Draft, unmerged. Branch `chore/continuity-foundation`, HEAD `0150ac0276a55bd32fbb46acc68c15df5b5403d0`. Commit `db08471` ports the isolated Supabase mutation guard to the Normal test workflow and scripts. Commit `0150ac0` updates the static CI contract from SKIP to fail-closed.
- **Normal CI:** Validate [42032008035](https://github.com/Reekyi/UpStatus/actions/runs/42032008035) passed. Signaling Smoke [42032007996](https://github.com/Reekyi/UpStatus/actions/runs/42032007996) is in progress at this snapshot. New guard syntax/static wiring tests and unauthenticated endpoint checks passed; authenticated integration/browser step is still running; rate-limit and read-receipt concurrency steps are pending.
- **Team Lite PR #76:** open, Draft, unmerged, HEAD `578ba8a44dd67401a4bad0db897980c91fea3df5`; Candidate Checks [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) passed with guard preflight, 86/86 authenticated checks, endpoint 429, rate-limit concurrency, and atomic read receipts.
- **Team Lite baseline #75:** open, Draft, HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; baseline CI passed.
- **Continuity #80:** open, Draft, HEAD `33aefd3bb80b5b6229730e104b946d4faf57aa36`; Validate `41855199729` failed at the existing `client signed upload helper missing` assertion.
- **Independent QA #82:** open, Draft, HEAD `c747f9baba5f54afabcda05a95fb1d3a72494b91`; Validate `42029048298` failed at `production updateURL mismatch`. QA branch was not edited.
- **Issue #78:** open; physical no-F5 recovery on Tampermonkey remains pending in Normal and Team Lite.
- **Issue #79:** open release checklist; add the Normal guard and exact-head CI outcome after the smoke completes.

### Runtime and release state

Production Supabase `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY` on PostgreSQL 17.11.0.002, with seven migrations through `20261027155438`. The distributed rate-limit table/RPC and atomic read-receipt RPC are absent. Read-only catalog inspection reconfirmed the public `db_change` trigger broadcasts the full OLD/NEW message row with `private=false`; the SECURITY DEFINER broadcast function remains executable by anon/authenticated. Security Advisor shows two WARN categories for the three broadcast functions and ten INFO RLS-without-policy findings; Performance Advisor has no findings.

The candidate Normal and Team Lite product server templates do not yet call `consume_upstatus_signal_rate_limit`. The isolated test endpoint does. Product-endpoint integration, production migrations, and coordinated Realtime/client cutover remain open gates.

### Safety

No production SQL writes, migrations, deployments, secrets/flags changes, userscript publication, PR merges, or destructive operations occurred. All Supabase production checks were read-only. The next action is to inspect the exact-head Normal smoke and update this checkpoint with its final logs before advancing the product endpoint/cutover design.


## 2026-11-05 14:07 BRT — exact engineering checkpoint

- Normal #74 HEAD: `76de9fbe5b24666aa79b64971b6521249f91a4e0`; Validate passed, Signaling Smoke running.
- Team Lite #76 HEAD: `61672adfdbbd1e020cf5922838404b0958b832e6`; Candidate Checks passed on the exact head. #76 is 102 commits ahead of #75 and carries its baseline.
- Continuity #80 now includes the new handoff checkpoint in commit `f14a2f843468777b838300897336ba817da9636c`. Its previous Validate failed on the existing `client signed upload helper missing` assertion. Independent QA #82 HEAD `e03033544dd91eb23d7b02d61c689ba8bcbbfa26`; Validate fails on `production updateURL mismatch`. QA branch was not edited.
- Production catalog audit found effective anon/authenticated ALL table privileges (including TRUNCATE, TRIGGER and REFERENCES) on nine backend-owned tables despite RLS enabled/no policies. Candidate #74 stages REVOKE ALL for those tables; not applied in production. `realtime.messages` SELECT/INSERT/UPDATE remains intentionally untouched pending client cutover.
- Production remains ACTIVE_HEALTHY, seven migrations through `20261027155438`; receipt/rate-limit objects are absent; public full-row message broadcast and broad trigger-function EXECUTE remain.
- Commit [76de9fb](https://github.com/Reekyi/UpStatus/commit/76de9fbe5b24666aa79b64971b6521249f91a4e0) adds static coverage for the complete privilege-revocation migrations. Validate passed; Smoke pending.
- No production writes, migration, deployment, merge, publication, or flag/secret changes.


## 2026-11-05 14:10 BRT — default ACL root cause

- Production `pg_default_acl` for schema `public` grants default ALL table privileges (including TRUNCATE, TRIGGER and PostgreSQL 17 MAINTAIN), EXECUTE on functions, and SELECT/UPDATE/USAGE on sequences to both `anon` and `authenticated`, for objects created by `postgres` and `supabase_admin`.
- The existing candidate migration revokes privileges on the nine current backend-owned tables, but does not change default ACLs. Future objects can inherit client grants unless defaults are hardened for both owners and all three object types.
- A separate migration is required. Generate it with the approved Supabase CLI workflow, preserve owner/service_role access, inventory dependencies, and validate in official TEST. CLI/official TEST was unavailable, so no migration filename was fabricated and no DDL was applied.
- This finding is recorded in [issue #79 comment 6664233350](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6664233350). Production remains unchanged.


## 2026-11-05 14:12 BRT — default ACL authority limitation

- SQL connector executes as `postgres`; postgres is not superuser and is not a member of `supabase_admin`. `supabase_admin` is a login-capable superuser.
- A standard migration run as postgres cannot alter default privileges for supabase_admin. Do not add a migration that assumes otherwise or attempt role membership/credential workarounds.
- Default privileges owned by postgres can be addressed via normal migration after official TEST validation. Supabase_admin defaults require a separately authorized admin execution path.
- Recorded in [issue #79 comment 6664265799](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6664265799). No ALTER DEFAULT PRIVILEGES, SET ROLE, membership change, credential access, or production write occurred.


## 2026-11-05 17:58 BRT — exact engineering and QA checkpoint

### Exact GitHub refs and CI

All five PRs were re-fetched. They remain open, Draft and unmerged.

- **Normal #74** — `chore/continuity-foundation`, HEAD `b981a716f30bb1a9a960f74d050315dd51a3735f`, 629 commits ahead / 0 behind `master`. Validate [42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530) and Signaling Smoke [42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609) both completed successfully on the exact HEAD.
- **Team Lite #76** — `team-lite/signaling-transport-candidate`, HEAD `bd89a5364f66ca81780869b1bff17c061f90245c`. Candidate Checks [42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392) passed on the exact HEAD. #76 is 103 commits ahead / 0 behind #75 and contains that baseline; do not treat #75 and #76 as independent merge payloads.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; baseline Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- **Continuity #80** — `docs/continuity-handoff-2026-11-04`, HEAD `143418af4d4ac564ecf22bb8dab7169b8ff07356`, 38 commits ahead / 0 behind `develop`. Validate [42099963739](https://github.com/Reekyi/UpStatus/actions/runs/42099963739) fails at the existing `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`.
- **Independent QA #82** — `qa/release-readiness-2026-11-04-master`, HEAD `e6372482f04cdd8983cbde993eee67446c5e04af`, 35 commits ahead / 0 behind `master`. Validate [42105592944](https://github.com/Reekyi/UpStatus/actions/runs/42105592944) fails at the existing `production updateURL mismatch` assertion after building `3.4.7 / TEST 3.4.7`. QA branch was read-only in this engineering run.

Normal's exact-head Smoke log confirms 14/14 static groups, 14/14 unauthenticated endpoint checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC with remote tracks, three-member mesh, teardown, fixture cleanup, 90 accepted writes plus one HTTP 429, distributed rate-limit concurrency, and atomic read-receipt concurrency. Team Lite's exact-head log confirms its isolation guard, authenticated adapter, 14/14 unauthenticated checks, 86/86 authenticated checks, WebRTC/mesh/teardown, the same rate-limit and receipt checks, migration-layout guard, version 3.4.31, portal/session-isolation checks and updater scenarios.

### New confirmed candidate blocker — open voice-room membership

The independent QA release-readiness document identifies **VOICE-OPEN-JOIN** as a blocking compatibility gate. I independently inspected the current Normal client, Team Lite client, shared transport adapter, and isolated signaling endpoint.

- Both clients currently resolve an existing voice room only if the caller is already an accepted member; otherwise they look for a pending invitation and call `accept(roomId)`.
- If no invitation exists, the client snapshots the current roster, creates a room with the other roster members as `pending`, then binds voice/screen logical IDs.
- The isolated endpoint defines membership as `status='accepted'`; `/room/resolve`, polling, roster listing and signaling require accepted membership.
- `/room/request-invite` explicitly supports `bindingType='call'` only. There is no authenticated open-join path for a team member arriving after an active voice room was created.
- Existing integration tests validate invitation/acceptance and rejection of pre-accept polling; they do not validate open join, late join or concurrent join.

This conflicts with issue #78's explicit functional rule: voice rooms are open channels, with free entry/exit and no invitation/acceptance semantics. It is a **candidate design incompatibility**, not a production regression: authenticated signaling remains opt-in/default-off and the endpoint exists only in the isolated project.

The isolated membership table has primary key `(room_id,user_name)` and statuses `pending|accepted|declined`; room bindings are unique by `(binding_type,logical_id)`. A safe fix needs an authenticated voice-only open-join operation, idempotent/concurrent membership handling, room-capacity enforcement, and serialization against leave/last-member room closure. Do not reuse the call invitation flow or enable the transport until late/concurrent joins, aliases across Normal/Team Lite, owner departure and cross-client fanout are covered.

### Production Supabase — read-only recheck

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`, with seven migrations through `20261027155438`. The current SQL session is `postgres`.

Production still lacks:
- `public.merge_chat_read_receipts(text,jsonb,timestamptz)`;
- `public.consume_upstatus_signal_rate_limit(text,integer,integer)`;
- `public.upstatus_signal_rate_limits`.

The nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled with zero policies and effective `anon`/`authenticated` grants for all eight catalogued table privileges (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN). `upstatus_visual_config` has no client table privileges. The RLS state means the grant inventory alone does not prove ordinary row access; the excessive grants remain an unnecessary privilege surface.

The three broadcast functions remain SECURITY DEFINER, `search_path=public`, and executable by anon/authenticated/service_role. `upstatus_broadcast_messages()` sends the complete OLD/NEW row to `db_change` with `private=false`; remote-state and user-status broadcasts also expose metadata on the public topic. Security Advisor currently reports three anon EXECUTE WARN findings, three authenticated EXECUTE WARN findings and ten RLS-without-policy INFO findings. Performance and health advisors return no findings.

Default ACLs remain explicit for `postgres` in `public` and `storage`, and for `supabase_admin` in `public`, `graphql` and `graphql_public`. The SQL session is not superuser and is not a member of `supabase_admin`; no role escalation was attempted. The candidate postgres/public migration's global PUBLIC EXECUTE scope remains under review.

The production function inventory contains 38 ACTIVE functions, all reporting `verify_jwt=false`; that gateway setting alone does not establish absence of application-level authentication. Core deployed versions remain `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15 and legacy screen-share beta10 v6. There is no production `upstatus-signal` function. The full route-level auth/owner/consumer inventory remains open.

### Additional release-control findings from QA documentation

The QA branch's release-readiness audit also records that `.github/workflows/deploy-production.yml` has no explicit approved-ref assertion or in-workflow assertion that the project ID equals `dlfvkawaiqduhlazsszm`, uses Supabase CLI `latest`, and deploys only Normal `upstatus`, not Team Lite. GitHub Environment protection was not inspected. Treat this as a deployment-control review gate; no workflow was run or modified.

Issue #78 remains open with physical no-F5 recovery and device/cross-client criteria unchecked. Issue #79's body remains an older snapshot; this checkpoint is the current evidence supplement. The independent QA branch and its release-readiness file were not modified.

### Safety and next work

This checkpoint used GitHub read APIs, exact workflow job logs, source-file inspection, Supabase project/migration/function/advisor metadata, and SELECT-only production catalog queries. No fixture-mutating script was run in this engineering turn; no workflow was dispatched or rerun. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, role change or destructive action occurred.

Next safe engineering work:
1. Design the voice-only authenticated open-join contract and transactional membership/leave semantics before coding.
2. Add late-join, duplicate/concurrent join, capacity, owner-departure and Normal/Team Lite alias tests in the isolated project.
3. Keep authenticated transport default-off until that contract passes.
4. Continue production Realtime, read-receipt migration, product rate-limit and ACL/deployment-control gates separately.


### Post-update validation of the refreshed continuity checkpoint

After the two documentation commits above, PR #80 is now at HEAD `af7bdf81ea4f9e39d8ab47647aea02fa1423b6be`, 41 commits ahead / 0 behind `develop`. Validate [42108753435](https://github.com/Reekyi/UpStatus/actions/runs/42108753435) completed and reproduced the same baseline assertion `client signed upload helper missing`; no validator was weakened. The failure is not caused by the handoff content. The #80 branch remains Draft. The independent QA branch #82 remains untouched.


## Engineering checkpoint — 2026-11-05 19:53 BRT

- Normal PR #74 HEAD `b0c0e03`: Validate and Signaling Smoke passed on exact HEAD; Smoke completed 103/103 authenticated checks, WebRTC call/voice/screen, three-member mesh, rate-limit/read-receipt concurrency and cleanup.
- Team Lite PR #76 was fast-forwarded from isolated branch `team-lite/voice-leave-fix-candidate` to HEAD `561026304756b9a2e5bd2029e59eda630df1b5cd` (expected prior HEAD `4178e54654b1bd2c06516fba9edea17d779b9ecd`, force=false). The isolated branch and PR branch are now identical. Draft preserved. Candidate Checks [42125597354](https://github.com/Reekyi/UpStatus/actions/runs/42125597354) is still running in authenticated integration/browser tests; guard, adapter and auth steps passed. Do not start another fixture-mutating workflow until this run finishes and cleanup is verified.
- The open voice join contract is already present in the candidate migration and isolated endpoint; Normal's exact-head Smoke passed late join through Normal/Team Lite aliases, idempotency, accepted-only roster, no pending invite, owner departure, capacity and concurrent owner-leave/late-join. It remains candidate-only and is absent from production.
- Team Lite leave/logout candidate adds shared idempotent leave Promise, awaits final signal and membership RPC, keeps join disabled while leave is pending, serializes rejoin, and waits during logout. Follow-up remains: `signalReleaseVoiceRoom()` clears local room ID before RPC and suppresses errors, so a failed fallback can still lose retry context. Add a regression before claiming reliable offline cleanup.
- PR #75 remains historical green; #76 is 175 ahead/0 behind `team-lite-official` and 116 ahead/0 behind #75. #74 is 639 ahead/0 behind master. #80 is 50 ahead/0 behind develop and its Validate fails on inherited `client signed upload helper missing`. #82 QA is 40 ahead/0 behind master and Validate fails on inherited `production updateURL mismatch`; QA branch untouched.
- Production Supabase remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`. Missing RPCs/tables: open voice join, room leave, atomic read receipts, distributed rate limit. 38 Edge Functions active; core versions upstatus v480, upstatus-test v281, Team Lite v15, screen-share beta10 v6; no dedicated `upstatus-signal` deployed.
- Production broadcast functions remain SECURITY DEFINER and executable by anon/authenticated; message broadcast sends full OLD/NEW row on public topic. Nine backend-owned tables still have all eight table privileges granted to anon/authenticated despite RLS with zero policies. Default ACL owners/schemas currently observed: postgres on public/storage; supabase_admin on public/graphql/graphql_public. Session cannot administer supabase_admin. No production writes or deployments performed.
- Issue #78 remains open for physical network recovery/pagehide/cross-client validation; issue #79 has the detailed checkpoint. No merge, deploy, release, publication, migration, secret/flag/role change or destructive operation occurred.


## 2026-11-05 21:04 BRT engineering refresh

- Normal PR #74 head `b0c0e03`: Validate `42122609464` and Signaling Smoke `42122609431` passed on exact head; smoke confirmed 103/103 authenticated checks, WebRTC call/voice/screen, three-member mesh, rate limit, read-receipt concurrency, and cleanup.
- Team Lite baseline #75 head `7bbf9b9`: historical Candidate Checks `41674353127` passed. Team Lite signaling #76 head `488a693dbd234817e87aa11eb232533e34459695`: prior head `5610263` passed all integration/browser/concurrency/cleanup stages but failed the final static candidate step at the voice-leave fallback assertion. New two-file fix retains room ID/prepared/owner state until server leave confirmation and adds fail-then-success retry tests. Candidate Checks `42134550466` is pending.
- #80 head `a353e68`: Validate `42126202343` fails inherited `client signed upload helper missing`. #82 QA head `63e94e3`: Validate `42131148632` fails inherited `production updateURL mismatch`; QA branch untouched. All PRs remain open/Draft.
- Current ancestry: #74 639 ahead/0 behind master; #76 177 ahead/0 behind team-lite-official and 118 ahead/0 behind #75; #80 52 ahead/0 behind develop; #82 44 ahead/0 behind master.
- Production Supabase is ACTIVE_HEALTHY, PG 17.11.0.002, seven migrations through `20261027155438`. Open-voice join/leave RPCs, atomic read-receipt RPC, distributed rate-limit RPC/table are absent. 38 Edge Functions active; core versions upstatus v480, upstatus-test v281, Team Lite v15, legacy screen-share v6. No dedicated upstatus-signal.
- Three public broadcast functions remain SECURITY DEFINER and executable by anon/authenticated; messages still broadcast full OLD/NEW rows on a public topic. Advisor: 3 anon WARN, 3 authenticated WARN, 10 RLS/no-policy INFO. Performance and health advisors empty.
- Issue #78 remains open for physical offline/online recovery without F5, pagehide, real devices, and installed cross-client acceptance. Production writes/deployments/migrations/secrets/flags/roles remain prohibited absent explicit approval.


### Cross-product leave follow-up (2026-11-05)

Static review found Normal #74 also clears the authenticated voice-room ID/owner state before the leave RPC is confirmed and suppresses RPC failure. This is not yet changed or runtime-tested. Defer its patch until Team Lite Candidate Checks `42134550466` completes and the shared isolated fixture project is confirmed clean; then add a Normal fail-then-success retry regression.

The earlier 52-ahead ancestry count predates the documentation follow-ups; re-fetch the live comparison before using any branch-distance figure.

## 2026-11-05 engineering update

- PR #74 remains at `b0c0e03`, with exact-head Validate and Signaling Smoke passing.
- PR #76 is now at `7538296`; Candidate Checks 42142527307 is running. The intermediate `6ba88b6` run failed in a newly added VM test's escaped-newline source boundary, not in the endpoint integration; that harness boundary was corrected before the current head.
- PR #75 remains at `7bbf9b9`; PR #80 at `5ea7773` still fails `client signed upload helper missing`; PR #82 at `3cb3539` still fails `production updateURL mismatch`. All remain Draft.
- Issue #78's 10-second offline/online manual failure is confirmed. Candidate recovery changes are isolated in Team Lite `7538296` and Normal `08ebf838`. They avoid network leave during offline teardown and wait for Realtime readiness before legacy voice/call actions. CI and physical verification remain open.
- Production Supabase remains read-only in this work: 7 migrations through `20261027155438`, 38 active Edge Functions, missing voice/read-receipt/rate-limit RPCs, public SECURITY DEFINER broadcasts, broad backend-table grants, and broad default ACLs. No production write or deploy occurred.


## 2026-11-05 23:10 BRT — voice logout confirmation candidates

- Team Lite PR #76 is at `f573981`. Offline/online transport teardown now preserves the server room ID, failed leave responses keep it, and logout returns before API logout/auth-generation/token/storage invalidation unless membership release is confirmed. The card is restored with a retry message on failure. Exact-head Candidate Checks [42148155469](https://github.com/Reekyi/UpStatus/actions/runs/42148155469) is pending; run [42148017860](https://github.com/Reekyi/UpStatus/actions/runs/42148017860) is still running on older `24e5c64`. Previous head `092dc83` passed [42143206998](https://github.com/Reekyi/UpStatus/actions/runs/42143206998), 103/103 authenticated checks, browser WebRTC, mesh, rate-limit/read-receipt concurrency, and fixture cleanup.
- Normal candidate `normal/reconnect-recovery-candidate` is at `bbf1f2b`, 18 ahead/0 behind PR #74. It now preserves room ID on offline teardown and blocks logout while server membership remains. Candidate static tests added; no CI yet. Keep it separate until the Team Lite shared test group is clear.
- #74 `b0c0e03` CI green; #75 `7bbf9b9` historical CI green; #76 `f573981` pending; #80 `c6fabac` fails `client signed upload helper missing`; #82 `b916551` fails `production updateURL mismatch`. All remain Draft.
- Residual: the room ID is not persisted across a full browser reload, so a browser closed while offline can still leave membership until TTL. Issue #78 remains open for physical reconnection and this lifecycle edge.
- Production Supabase remains SELECT-only: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active Edge Functions. Voice/read-receipt/rate-limit RPCs and the dedicated signaling function remain absent; public broadcast and broad grants/default ACL findings remain. No production writes or deploys.


## 2026-11-05 23:16 BRT — CI follow-up

- Team Lite run [42148017860](https://github.com/Reekyi/UpStatus/actions/runs/42148017860) on `24e5c64` passed 103/103 authenticated checks, browser WebRTC call/voice/screen, mesh, 90/1 rate limit, rate/read-receipt concurrency, migration guard, candidate metadata, and fixture cleanup. It failed only in the final VM logout-gate test because `teamLiteNetworkOffline` was absent from the extracted test context. The stub was added in `6c1fcf5`.
- Latest exact-head run [42148155469](https://github.com/Reekyi/UpStatus/actions/runs/42148155469) on `f573981` is in progress. Do not start another mutating suite until it completes and cleanup is verified.


## 2026-11-05 23:20 BRT — logout gate VM test follow-up

- Exact-head Team Lite run [42148155469](https://github.com/Reekyi/UpStatus/actions/runs/42148155469) on `f573981` passed 103/103 authenticated integration, browser WebRTC call/voice/screen, three-member mesh, 90/1 rate limit, rate/read-receipt concurrency, migration guard, candidate metadata, and fixture cleanup. It failed only in the final VM logout test because the stub relied on `this` in a strict VM global call. Commit `8678b4b` fixes the harness with closure state and arrow functions.
- Read-only cleanup check on isolated `upstatus-security-test` found zero test-prefixed users, sessions, rooms, memberships, events, rate-limit rows, and chat-read rows.
- Latest exact-head Candidate Checks [42149391376](https://github.com/Reekyi/UpStatus/actions/runs/42149391376) on `8678b4b` is in progress. No approval yet.


## 2026-11-05 23:24 BRT — expired room leave semantics

- Candidate voice rooms expire after 2 hours. The leave RPC returns `ROOM_UNAVAILABLE` for closed/expired rooms and `ROOM_MEMBERSHIP_ENDED` when membership is already absent. The shared adapter exposes these as `error.code` on non-2xx responses or JSON `error` bodies on 2xx responses. Current Normal/Team Lite client code treats both as failure and can block logout even though no active membership remains. Next fix: normalize only these two terminal codes to idempotent success in the shared adapter, with tests for 2xx and non-2xx; retain failures for all other codes. Not yet implemented.
- Team Lite Candidate Checks [42149391376](https://github.com/Reekyi/UpStatus/actions/runs/42149391376) on `8678b4b` remains in progress. Normal candidate `bbf1f2b` remains isolated and unvalidated.


## 2026-11-05 23:26 BRT — ancestry refresh

- #74 `b0c0e03`: 639 ahead/0 behind master.
- #75 `7bbf9b9`: baseline unchanged.
- #76 `8678b4b`: 195 ahead/0 behind team-lite-official; 136 ahead/0 behind #75.
- #80 `e04146e`: 76 ahead/0 behind develop.
- #82 `b916551`: 46 ahead/0 behind master.
- Normal recovery candidate `bbf1f2b`: 18 ahead/0 behind PR #74 head.
- All PRs remain Draft; Team Lite exact-head run [42149391376](https://github.com/Reekyi/UpStatus/actions/runs/42149391376) is still in progress.


## Engineering refresh — 2026-11-06

- All five PRs remain open, Draft, and unmerged. #74 `b0c0e03` has exact-head Validate and Signaling Smoke passes; #75 `7bbf9b9` has historical baseline Candidate Checks pass.
- Team Lite #76 is now at `3627557f244c98a9c7e1cc986c7cea43124863a9`. Its previous exact-head run `42150807002` passed 103/103 authenticated integration, browser WebRTC call/voice/screen, three-member room race, rate limit 90+1, concurrency, atomic read receipts, migration-layout and fixture cleanup, but failed the final candidate check because the embedded userscript adapter lagged behind the shared source. Commit `3627557` synchronizes the bundled adapter without weakening the checker. Exact-head Candidate Checks `42153971733` is in progress; no PASS is claimed yet.
- Normal reconnect candidate `1ca2de6e3abbb383be1ccb4afff09d8b3c13dc12` is 20 ahead / 0 behind PR #74 and remains separate/unvalidated. Do not fast-forward until the shared isolated test group is free and exact-head CI passes.
- #80 `222edce` Validate `42150956107` fails at `client signed upload helper missing`; #82 `151f637` Validate `42151484883` fails at `production updateURL mismatch`. These are existing base-validator failures; no checks were weakened and QA branch was not changed.
- Production `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active Edge Functions. Voice open/leave, atomic receipt, distributed rate-limit RPC/table and dedicated `upstatus-signal` remain absent. The three public broadcast SECURITY DEFINER functions remain executable by client roles; nine backend tables retain broad grants with RLS/no policies; `realtime.messages` retains client SELECT/INSERT/UPDATE grants; default ACLs remain broad for postgres/public+storage and supabase_admin/public+graphql+graphql_public.
- The isolated project cleanup check after run `42150807002` returned zero test fixtures. The new run `42153971733` is currently using the isolated project; do not overlap another fixture-mutating suite.
- No production write, migration, deploy, release, flag/secret/role change, userscript publication, merge, or destructive action occurred.


## Continuity validation follow-up — 2026-11-06

- PR #80 is now at `41dd77d69b1866ea0f2bae97f2634fcad43415d1`, 81 ahead / 0 behind `develop`. Exact-head Validate [42154265009](https://github.com/Reekyi/UpStatus/actions/runs/42154265009) completed and reproduced the inherited `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`; no validator was weakened.
- Team Lite #76 remains at `3627557f244c98a9c7e1cc986c7cea43124863a9`; Candidate Checks [42153971733](https://github.com/Reekyi/UpStatus/actions/runs/42153971733) is still running in authenticated integration/browser tests. No PASS is claimed yet.
