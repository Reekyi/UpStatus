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


## 2026-11-06 — call-room teardown checkpoint

- Normal #74 HEAD `c6d21ae`: exact Validate passed; exact Signaling Smoke is pending.
- Team Lite #76 HEAD `db75585`: candidate includes retryable call-room leave and awaited logout gating; its exact-head Candidate Checks run was cancelled before jobs. Parent-head run `c133569` is still using the isolated Supabase test project. Do not overlap another fixture-mutating suite.
- Both clients retain a member-bound in-memory call-room leave handle after a failed/offline teardown, capture the transport for the in-flight attempt, and retry after authenticated transport recreation. Logout/session end is blocked until call membership is confirmed released.
- Isolated JS harness tests passed for retry, offline/no transport, stale transport replacement, persistent failure, member isolation and logout gating. Full CI for the new Team Lite head and Normal Smoke are still pending.
- Full page/process termination while offline remains unresolved because the pending room ID is not persisted; the server TTL remains the fallback. Manual no-F5 and installed-client tests remain open.
- Production was read-only: 7 migrations, 38 active Edge Functions, missing voice/receipt/rate-limit RPCs, three public SECURITY DEFINER broadcast triggers, broad backend-table grants, broad default ACLs. No production change was made.


## 2026-11-06 — superseding exact-head checkpoint

- Normal #74: `2e346162d6db9fe05a68a97d501039ddb6de4547`; Validate passed, Smoke is in authenticated integration/browser.
- Team Lite #76: `95d88e34c25679e161f09654f5f7e372f2a7a430`; Candidate Checks pending. Parent-head run passed integration/browser and database tests, then failed a stale static assertion; the assertion is corrected in the current head.
- #80 `df932946` still fails the inherited `client signed upload helper missing` validation. #82 `4b85bb1` still fails inherited `production updateURL mismatch`. All PRs remain Draft.
- New pagehide inspection: neither Normal nor Team Lite calls `callCleanup()` from pagehide; both only call `voiceRoomLeave()`. Pending call-room handles remain memory-only. Durable, token-free userscript-storage recovery across offline reload is the next candidate design, not yet implemented.
- Shared isolated project is occupied by Normal Smoke; do not overlap Team Lite fixture tests. Production remains read-only.


## 2026-11-06 — exact-head CI follow-up

- **Normal #74** `2e346162d6db9fe05a68a97d501039ddb6de4547`: exact Validate [42166842757](https://github.com/Reekyi/UpStatus/actions/runs/42166842757) and Signaling Smoke [42166842803](https://github.com/Reekyi/UpStatus/actions/runs/42166842803) both passed. Smoke confirmed 15/15 unauthenticated checks, 103/103 authenticated checks, call/voice/screen WebRTC browser paths, dynamic group invitation and three-member mesh, rate limit 90+1, concurrent rate-limit and atomic read-receipt tests, 21/21 static groups, and call-room retry/logout-gate regressions.
- **Team Lite #76** `95d88e34c25679e161f09654f5f7e372f2a7a430`: Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) is in authenticated integration/browser. Isolation guard, adapter and endpoint authentication passed; remaining integration, concurrency, migration-layout, candidate-script and cleanup steps are not yet complete.
- **#80 continuity** branch HEAD before this CURRENT_STATE update: `6da505d6516de96929aa42f451812d3574519bd4`, 89 ahead / 0 behind develop. Latest Validate [42167094754](https://github.com/Reekyi/UpStatus/actions/runs/42167094754) on parent `a917887` reproduced `client signed upload helper missing`. **#82 QA** remains at `4b85bb1`; Validate [42163103958](https://github.com/Reekyi/UpStatus/actions/runs/42163103958) remains failed on `production updateURL mismatch`.
- Call-room cleanup retry is implemented in both candidates and the Normal exact-head CI is green. Pagehide remains a separate gate: both handlers call only `voiceRoomLeave()`, not `callCleanup()`; pending call-room handles are memory-only. Pagehide cleanup plus validated token-free userscript-storage persistence/retry is not yet implemented.
- The isolated project is currently reserved by Team Lite Candidate Checks; no overlapping fixture-mutating test was started. Production remains read-only and unchanged.


## 2026-11-06 03:02 BRT — superseding exact-head checkpoint

- #74 Normal is at `acd26e02119633164c0e23624bcccdf5bd66bd5f`; exact-head Validate [42172519530](https://github.com/Reekyi/UpStatus/actions/runs/42172519530) and Signaling Smoke [42172519519](https://github.com/Reekyi/UpStatus/actions/runs/42172519519) are running. The new candidate adds token-free, per-member, versioned GM-storage persistence for pending call-room leaves, invokes call cleanup from `pagehide`, restores/retries only after the same member authenticates, and clears the record after confirmed leave. Exact-head CI is required before approval; Team Lite has not yet been ported.
- #76 Team Lite remains at `95d88e34c25679e161f09654f5f7e372f2a7a430`; Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) passed on the exact head. #75 baseline remains at `7bbf9b9` with historical run [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- #80 `fd0ee766` Validate [42167511914](https://github.com/Reekyi/UpStatus/actions/runs/42167511914) reproduces `client signed upload helper missing`. #82 `bf040c34` Validate [42169381115](https://github.com/Reekyi/UpStatus/actions/runs/42169381115) reproduces `production updateURL mismatch`. Both remain Draft; QA branch unchanged.
- #78 remains open: physical no-F5 recovery, real microphone/display capture, and installed Normal ↔ Team Lite acceptance remain manual gates. Pagehide persistence is now a Normal-only candidate pending CI; Team Lite parity is not implemented yet.
- Production remains read-only: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 active Edge Functions; three public SECURITY DEFINER broadcasts and broad client table/default grants remain. No production signaling endpoint or candidate RPCs have been installed.
- No merge, deployment, release, production write, migration, secret/role/flag change, userscript publication or destructive action occurred.


## 2026-11-06 03:12 BRT — pagehide persistence candidate correction

- Normal pagehide persistence is now in the #74 candidate. Initial Smoke [42172519519](https://github.com/Reekyi/UpStatus/actions/runs/42172519519) failed at the new malformed-room-ID assertion before fixture mutation; source validation was tightened in `a3784be` and explicitly asserted in `2db4408`. Current exact-head #74 Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) is in progress; parent Smoke [42172671559](https://github.com/Reekyi/UpStatus/actions/runs/42172671559) is running after static/unauthenticated success; exact-head Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) is queued. No approval is claimed yet.
- #76 Team Lite remains at `95d88e3`; exact-head Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) passed. Pagehide persistence has not been ported to Team Lite.
- Normal persists only `roomId`, `member`, `callId`, `createdAt` in versioned per-member GM storage; no session token. Restore is same-member/authenticated and retryable; record is cleared after confirmed leave. The new test rejects malformed, cross-member, stale and future-dated records. Physical tests remain pending; issue #78 stays open.
- #80 Validate [42167511914](https://github.com/Reekyi/UpStatus/actions/runs/42167511914) still fails `client signed upload helper missing`; #82 Validate [42169381115](https://github.com/Reekyi/UpStatus/actions/runs/42169381115) still fails `production updateURL mismatch`. QA branch unchanged.
- Production remains read-only and unchanged. The public Realtime, table grants, default ACL and missing production RPC/function gates remain open.


## 2026-11-06 — current engineering checkpoint

- #74 Normal HEAD `2db440814d374ad1e06b48645920573eaa8db978`: exact-head Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) and Signaling Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) passed.
- #76 Team Lite HEAD `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a`: durable pagehide/reload call-room recovery ported from Normal; Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) is in progress. Guard, adapter, and endpoint-auth steps passed; integration/browser and subsequent checks had not completed at checkpoint time.
- #76 remains 203 ahead / 0 behind `team-lite-official`, 144 ahead / 0 behind #75. #75 is 59 ahead / 0 behind its official base. #80 is 93 ahead / 0 behind develop; #82 is 53 ahead / 0 behind master. All five PRs remain open and Draft.
- #80's Validate failure is inherited from the develop baseline, whose userscript template lacks the signed-upload helper present on master. #82's Validate failure is a master-baseline mismatch: build derives production updateURL from the beta10 API URL instead of `release.json.scriptUrl`; #74 candidate build already separates these and passes Validate.
- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 active functions. Public SECURITY DEFINER broadcasts, backend table grants, and broad default ACLs remain release blockers. No production signaling/read-receipt/rate-limit RPCs or rate-limit table are installed.
- Manual close/reload-offline, no-F5 recovery, real device permissions, installed cross-version interoperability, human reviews, and production cutover remain open. A close during in-flight `prepareCallRoom` before the room ID is returned is an additional unverified orphan-room risk.
- Production remained read-only. No merge, deploy, release, migration, secret/role/flag change, userscript publication, or destructive action occurred.


## 2026-11-06 — exact-head CI closure

- Normal #74 HEAD `2db440814d374ad1e06b48645920573eaa8db978`: Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) and Signaling Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) both passed.
- Team Lite #76 HEAD `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a`: Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) passed. New durable pagehide/reload call-room leave tests passed; authenticated 103/103, unauthenticated 15/15, browser call/voice/screen WebRTC, three-member mesh, rate-limit and receipt concurrency, migration layout, metadata, and cleanup all passed. Post-run isolated fixture counts returned zero.
- #75 baseline remains historical pass. #80 Validate [42178888759](https://github.com/Reekyi/UpStatus/actions/runs/42178888759) repeats inherited `client signed upload helper missing`; #82 Validate [42175677100](https://github.com/Reekyi/UpStatus/actions/runs/42175677100) repeats inherited `production updateURL mismatch`. The underlying baseline causes are documented in UPSTATUS_HANDOFF.md; neither validator was weakened.
- #74 and #76 remain open/Draft with no submitted reviews or inline review comments. All other tracked PRs also remain open/Draft.
- Physical browser close/reload while offline, no-F5 recovery, real microphone/display permissions, installed Normal ↔ Team Lite interoperability, human review, production Realtime security cutover, rate-limit integration, and production migration rehearsal remain open gates.
- Production remained read-only; no migration/write, deploy, release, merge, secret/role/flag change, userscript publication, or destructive operation occurred.


## 2026-11-06 05:30 BRT — superseding engineering state

- #74 Normal HEAD: `0ff4ef9a50c79717250d9eed7e60ed85fa9c8a41`; exact Validate [42188549612](https://github.com/Reekyi/UpStatus/actions/runs/42188549612) passed. Exact Smoke [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610) is still running after syntax and unauthenticated checks passed. The previous parent Smoke failed on a duplicate VM-harness const; commit `0ff4ef9` renamed only the second declaration block and was fast-forwarded with an expected-HEAD lease.
- #76 Team Lite HEAD: `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a`; exact Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) passed, including durable pagehide/reload for known call-room IDs and cleanup. #75 baseline remains `7bbf9b9` with historical CI success.
- #80 HEAD `5ee51987`: Validate [42189214763](https://github.com/Reekyi/UpStatus/actions/runs/42189214763) still fails inherited `client signed upload helper missing`. #82 HEAD `e79dd623`: Validate [42183661932](https://github.com/Reekyi/UpStatus/actions/runs/42183661932) still fails inherited `production updateURL mismatch`. All tracked PRs remain open/Draft/unmerged.
- Normal now contains logical call-attempt prepare/cancel RPCs and tombstone semantics in candidate migration `20261106080200_call_room_attempt_recovery.sql`; isolated migration versions `20261106082526` and `20261106082546` are present. The active Normal Smoke owns the shared isolated fixture project.
- Team Lite source still uses create-room/bind/acceptance and has no cancel-by-logical-call-ID adapter method or durable call-attempt handle. Its known-room pagehide recovery passed, but the in-flight prepare race remains a parity gap.
- Production remains read-only and unchanged: 7 migrations, 38 active Edge Functions, no call-attempt/open-voice/receipt/rate-limit RPCs or dedicated signaling endpoint. Three public SECURITY DEFINER broadcasts, broad backend table grants, broad default ACLs, and 3+3 WARN / 10 INFO security findings remain.
- #78/#79 remain open. Physical no-F5 and installed cross-product tests, Team Lite call-attempt parity, product-endpoint rate limiting with Retry-After, RT-01, ACL-02, official TEST rehearsal, and human reviews remain gates.
- No merge, deploy, release, production write/migration, secret/role/flag change, userscript publication, or destructive operation occurred.


## 2026-11-06 06:18 BRT — superseding engineering state

- Normal #74 HEAD `0ff4ef9`: exact Validate and Smoke passed. Smoke confirms 116/116 authenticated integration checks, call-attempt tombstone behavior, WebRTC call/voice/screen, three-member mesh, rate-limit 90+1 and concurrency, atomic receipts, and fixture cleanup.
- Team Lite #76 HEAD `c22ff06`: new Candidate Checks [42193658040](https://github.com/Reekyi/UpStatus/actions/runs/42193658040) is in progress. Adapter and endpoint-authentication stages passed; authenticated integration/browser remains running. The candidate now uses the same logical call-ID prepare/cancel protocol as Normal, persists a token-free call ID before room creation, and can cancel a pagehide during prepare even before the room ID arrives. Shared migration/endpoint dependency remains in #74; no duplicate migration was added to #76.
- Both candidates now gate idle logout on retrying pending logical call attempts before room-ID leaves. Normal branch `cf99b1b` has the equivalent regression but is not yet in #74 while #76 owns the shared test project.
- #80 Validate [42189355400](https://github.com/Reekyi/UpStatus/actions/runs/42189355400) still fails inherited `client signed upload helper missing`; #82 Validate [42189479021](https://github.com/Reekyi/UpStatus/actions/runs/42189479021) still fails inherited `production updateURL mismatch`. All five PRs remain open/Draft/unmerged.
- Non-creator GM-storage failure remains unresolved: a recipient can accept a call without a durable room-ID leave handle if storage throws. Physical close/reload-offline, no-F5, real media permissions and installed Normal ↔ Team Lite tests remain open.
- Production remains read-only and unchanged: seven migrations, 38 active Edge Functions, no call-attempt/voice/receipt/rate-limit RPCs or dedicated signaling endpoint; 3+3 SECURITY DEFINER WARN, 10 RLS/no-policy INFO, broad backend grants/default ACLs, RT-01 and ACL-02 remain blockers.
- Next: finish #76 Candidate Checks and verify cleanup; then fast-forward Normal logout-gate candidate `cf99b1b` into #74 and run exact-head Validate + Smoke; add fail-closed recipient storage handling; continue rate-limit/Retry-After, RT-01, ACL-02 and official TEST rehearsal.
- No production write/migration, function deployment, secret/role/flag change, merge, deploy, release, userscript publication or destructive operation occurred.



## Engineering checkpoint — 2026-11-06 06:30 BRT

- #76 Team Lite HEAD `5cc5df4865250a0d67935937ea43e206217730d5`: Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) passed. Confirmed 103/103 authenticated checks, real-browser WebRTC call/voice/screen, three-member mesh, 90+1 rate-limit, atomic receipts, pagehide/reload recovery, pre-prepare call-ID persistence, idle-logout cancellation and recipient fail-closed acceptance. Cleanup passed; read-only post-run counts were zero. #76 is 208 ahead / 0 behind team-lite-official and 149 ahead / 0 behind #75.
- #74 Normal HEAD `cf99b1b14f69b1caf6606684d2d42f9898f03a1e`: Validate [42195926899](https://github.com/Reekyi/UpStatus/actions/runs/42195926899) failed because `scripts/validate.mjs` expected the old logout expression; Smoke [42195926855](https://github.com/Reekyi/UpStatus/actions/runs/42195926855) was still running at this checkpoint. #74 is 693 ahead / 0 behind master.
- Isolated Normal branch `normal/recipient-call-recovery-20261106` HEAD `1a62a38b44968a89dd72685132ad2235f4b0c569`, 4 ahead / 0 behind #74. It adds recipient leave persistence before authenticated accept, fail-closed behavior when GM storage throws, VM regressions and a corrected validator contract. Not yet integrated or CI-tested; wait for the shared Smoke/lab to finish.
- #75 remains `7bbf9b9`, 59 ahead / 0 behind team-lite-official; historical CI passed.
- #80 remains `f96b719`, 102 ahead / 0 behind develop; Validate [42194285929](https://github.com/Reekyi/UpStatus/actions/runs/42194285929) fails inherited `client signed upload helper missing`.
- #82 QA remains `a4b675b`, 57 ahead / 0 behind master; Validate [42196233886](https://github.com/Reekyi/UpStatus/actions/runs/42196233886) fails inherited `production updateURL mismatch`. QA branch was not modified.
- New code-review gap: voice-room membership has no durable per-member leave handle. The room ID is held only in page memory; pagehide/offline can lose it on reload. This is separate from call-room logical-ID recovery and remains open in both clients.
- Production remains read-only: seven migrations, 38 active Edge Functions, no call-attempt/voice/receipt/rate-limit RPCs or dedicated signaling endpoint; 3+3 SECURITY DEFINER WARN, 10 RLS/no-policy INFO, broad backend grants/default ACLs, RT-01 and ACL-02 remain blockers.
- The isolated Supabase project is healthy; zero fixture counts were confirmed after #76 cleanup and before the currently running #74 Smoke. Do not start concurrent tests until that run finishes.
- All five PRs remain open, Draft and unmerged. No production SQL write/migration, function deployment, secret/role/flag change, merge, deploy, release, userscript publication or destructive operation occurred.


## Engineering checkpoint — 2026-11-06 07:02 BRT

- Normal PR #74 advanced to exact head 18201b01f875d1ab5d3706e4e35f07ab23ed1c86 (700 ahead / 0 behind master). The prior candidate referenced an undefined signalTrackPendingCallLeave(); the helper was ported from the passing Team Lite implementation, exported into the VM harness, and the stale logout assertion in chat-regression.test.mjs was aligned with the logical-call-attempt gate. Validate 42200054443 passed. Smoke 42200054440 is running; syntax/static checks passed, unauthenticated endpoint checks were in progress, and authenticated/browser/rate-limit/receipt/cleanup steps were pending.
- Team Lite #76 remains 5cc5df4, 208 ahead / 0 behind team-lite-official and 149 ahead / 0 behind #75. Candidate Checks 42194948317 passed; cleanup was confirmed after the run. #75 remains 7bbf9b9, 59 ahead / 0 behind its base, with historical CI pass.
- #80 remains 7d948bc, 104 ahead / 0 behind develop; Validate 42196656716 fails on inherited client signed upload helper missing. #82 QA remains a4b675b, 57 ahead / 0 behind master; Validate 42196233886 fails on production updateURL mismatch. QA branch and release-readiness document were preserved.
- Production Supabase remains read-only: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 active Edge Functions; no dedicated signaling function or the inspected call-attempt, voice-room, read-receipt, or rate-limit database objects. Nine public tables retain client grants; realtime.messages retains three client privileges; three SECURITY DEFINER broadcasts remain executable by anon/authenticated. Advisor: 3+3 WARN and 10 INFO; Performance/Health empty.
- The separate voice-room recovery gap remains open: room ID is in page memory only; offline pagehide can lose it, and open-response-loss needs a server logical attempt/tombstone. Physical Tampermonkey/device/no-F5 and live cross-client tests remain pending.
- All PRs remain Open/Draft. No production write/migration, deployment, secret/role/flag change, merge, release, userscript publication, or destructive operation occurred.


### Voice-room recovery design correction — 2026-11-06

The existing server contract appears sufficient to recover a lost open response without a new tombstone migration: open_upstatus_signal_voice_room() serializes the two product aliases, reuses the active binding, and treats repeated accepted membership as idempotent. The authenticated /room/resolve route returns the active room only when the requesting member is already in it. The candidate client design is therefore a token-free per-member logicalId marker persisted before open, then resolveRoom({bindingType: "voice", logicalId}) after re-authentication and confirmed leave. A known room ID is persisted directly. This remains design-only, not implemented/tested.

Both pagehide handlers call voiceRoomLeave(), but do not await the returned promise. Offline/unload can prevent confirmation; the room ID is currently memory-only and is lost after full unload. Issue #78 remains open.


## 2026-11-06 08:09 BRT — engineering checkpoint

- Normal #74 HEAD `3ed7b9d` (703/0 vs master): Validate [42207304139](https://github.com/Reekyi/UpStatus/actions/runs/42207304139) passed; Smoke [42207304173](https://github.com/Reekyi/UpStatus/actions/runs/42207304173) still running authenticated/browser integration. Do not mark exact-head Smoke green until concurrency checks and cleanup finish.
- Team Lite #76 HEAD `5cc5df4` (208/0 vs team-lite-official; 149/0 vs #75): Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) passed in full. #75 baseline remains `7bbf9b9` (59/0).
- #80 `5d45f9b` (108/0 vs develop) still fails inherited `client signed upload helper missing` in Validate [42200688810](https://github.com/Reekyi/UpStatus/actions/runs/42200688810). #82 QA `aec1192` (58/0 vs master) still fails `production updateURL mismatch` in Validate [42203746245](https://github.com/Reekyi/UpStatus/actions/runs/42203746245). QA branch unchanged. All PRs remain Draft.
- Isolated-only candidate migration adds B-tree indexes on `upstatus_signal_call_attempts(created_by)`, `(recipient)`, and `(room_id)`. Applied with its SQL test only to `bfpjtfqlnypisxljoxkb`; catalog confirmed indexes and Performance Advisor no longer reports unindexed FKs. Seven unused-index INFOs remain on the empty test database. The GitHub candidate files are in #74; production has not received them.
- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 ACTIVE Edge Functions; `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, screen-share beta10 v6. Security Advisor remains 3 WARN anon, 3 WARN authenticated, 10 INFO RLS without policy; RT-01 and ACL-02 remain open.
- Durable voice-room marker/resolve/leave recovery is not implemented; existing open/resolve contract appears sufficient. Physical no-F5 tests remain pending. Product endpoint rate-limit integration and `Retry-After` remain pending.

No production writes, migrations, deployment, merge, release, secret/role/flag changes, userscript publication, or destructive operations.

## 2026-11-06 08:55 BRT — current engineering checkpoint

- PR #74 Normal: `8a4bfd930b1d4169f6f5ae8360beb30f1bb204e4`; Validate passed, Signaling Smoke authenticated/browser tests still running.
- PR #76 Team Lite: `5cc5df4865250a0d67935937ea43e206217730d5`; Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) passed. It does not yet contain cancellable voice-room attempt IDs.
- PR #80 Validate [42207746918](https://github.com/Reekyi/UpStatus/actions/runs/42207746918) remains blocked by `client signed upload helper missing`; PR #82 Validate [42211720970](https://github.com/Reekyi/UpStatus/actions/runs/42211720970) remains blocked by `production updateURL mismatch`. These validators were not weakened.
- A server-side voice-room attempt/tombstone candidate is in #74, with isolated migration and test endpoint v31. Client adapter/userscript integration and Team Lite parity remain pending.
- Production remains at 7 migrations and 38 Edge Functions; no `upstatus-signal` function. Security findings remain 3 anon SECURITY DEFINER, 3 authenticated SECURITY DEFINER, and 10 RLS-without-policy INFO. No production writes or deployments.


## Engineering checkpoint — 2026-11-06 09:42 BRT: Normal voice-attempt client

- Normal #74 is now at `b7a6b3cfd88548175e47db48b5f8c541a3a1e457` (726/0 vs master, Draft). Validate [42219641493](https://github.com/Reekyi/UpStatus/actions/runs/42219641493) passed. Smoke [42219641534](https://github.com/Reekyi/UpStatus/actions/runs/42219641534) is still running; static/unauthenticated checks passed, authenticated browser integration and cleanup are pending.
- The preceding exact HEAD `65cc0cb` passed full Smoke [42218802900](https://github.com/Reekyi/UpStatus/actions/runs/42218802900): 129/129 authenticated checks, real-browser WebRTC call/voice/screen, three-member mesh, voice attempt tombstone/open-cancel race, rate limit, receipts, and cleanup. Independent post-run SELECT counts were zero for all temporary signaling fixtures.
- The current candidate adds a fail-closed logout gate when GM storage cannot be read, retryable transient writes, Unicode member-prefix normalization matching PostgreSQL, and additional durable-attempt tests.
- Team Lite #76 remains `5cc5df4` with its prior Candidate Checks PASS, but does not yet implement the voice-attempt adapter, client marker, or server route/RPC parity. Do not mark issue #78 complete.
- #80 Validate [42216271705](https://github.com/Reekyi/UpStatus/actions/runs/42216271705) still fails `client signed upload helper missing`. #82 QA HEAD `3d9bcb3` Validate [42218972117](https://github.com/Reekyi/UpStatus/actions/runs/42218972117) still fails `production updateURL mismatch`.
- Production `dlfvkawaiqduhlazsszm` remains read-only: 7 migrations, 38 ACTIVE Edge Functions, no dedicated `upstatus-signal`. Security findings remain 3 SECURITY DEFINER WARN for anon, 3 for authenticated, and 10 RLS-without-policy INFO. RT-01 and ACL-02 remain open.

All PRs remain Draft. No merge, deploy, release, production write/migration, secret/role/flag change, userscript publication, or destructive operation occurred.


## Follow-up checkpoint — 2026-11-06 09:49 BRT

- Normal #74 HEAD `94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6` (735/0 vs master, Draft): Validate [42220452780](https://github.com/Reekyi/UpStatus/actions/runs/42220452780) passed; exact-head Smoke [42220452949](https://github.com/Reekyi/UpStatus/actions/runs/42220452949) is running authenticated/browser integration and cleanup.
- Previous HEAD `b7a6b3c` passed full Smoke [42219641534](https://github.com/Reekyi/UpStatus/actions/runs/42219641534), including 129/129 authenticated checks, WebRTC call/voice/screen, group mesh, voice attempt race/cancellation, rate-limit and receipt concurrency, and workflow cleanup for temporary users/sessions/rooms/memberships/events.
- Latest candidate adds runtime pagehide cancellation before room ID, offline/unconfirmed retention, oversized-envelope fail-closed, Unicode member-prefix normalization, and storage-read logout gating. These changes are awaiting exact-head Smoke.
- Team Lite #76 remains `5cc5df4` with previous Candidate Checks passing, but voice-attempt client/adapter/server-template parity is still absent. Issue #78 remains open.
- #80 Validate [42219924635](https://github.com/Reekyi/UpStatus/actions/runs/42219924635) still fails `client signed upload helper missing`; #82 Validate [42218972117](https://github.com/Reekyi/UpStatus/actions/runs/42218972117) still fails `production updateURL mismatch`.

No production writes or release actions occurred.


## 2026-11-06 current engineering state

- Normal #74 exact head `94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6`: Validate and Signaling Smoke both PASS; Smoke confirms 129/129 authenticated checks, browser call/voice/screen WebRTC, voice-attempt cancellation races, 90+1 rate limiting, read-receipt concurrency, and cleanup.
- Team Lite #76 exact head `65e0176212091d4aa07a483aa978d2980f498479`: voice-attempt client recovery is now implemented. Candidate Checks [42227413397](https://github.com/Reekyi/UpStatus/actions/runs/42227413397) has passed isolation, adapter, voice-attempt, and unauthenticated endpoint steps; authenticated/browser and final checks remain in progress.
- Team Lite harness regressions were corrected after two failed runs: VM contexts now seed durable voice storage state, and unauthenticated endpoint requests have a 20-second timeout to avoid a cold-start false failure.
- A separate Normal branch `normal/rate-limit-retry-after-20261106` at `ed36fb2764619ab7787672803159edbcf507321c` stages the missing production rate-limit migration and Retry-After/CORS behavior. It is 9 commits ahead / 0 behind #74, not integrated, not CI-validated, and not deployed.
- Production remains read-only: 7 migrations, 38 ACTIVE Edge Functions, no dedicated `upstatus-signal`, no rate-limit table/RPC, and no voice-attempt table/RPC. Security findings remain 3 SECURITY DEFINER WARN for anon, 3 for authenticated, and 10 RLS-without-policy INFO; public full-row chat broadcasts and broad default ACLs remain open.
- Physical Tampermonkey no-F5, real microphone/display capture, live Normal ↔ Team Lite interoperability, RT-01, ACL-02, official TEST migration/rollback, and human review remain release gates.

No merge, deploy, release, production write/migration, secret/role/flag change, userscript publication, or destructive action.


### Follow-up — 2026-11-06

Team Lite #76 is now at `8746abf0988a2ce28c1ce57b35f780f1e315d7c8`. The latest Candidate Checks [42228414423](https://github.com/Reekyi/UpStatus/actions/runs/42228414423) has passed isolation, adapter, voice-attempt, and endpoint-auth steps; authenticated/browser integration is still running. Previous run [42227413397](https://github.com/Reekyi/UpStatus/actions/runs/42227413397) passed integration, rate-limit/read-receipt concurrency and migration layout but found one more missing VM global in the standalone release-helper context. All affected VM contexts were seeded before the current run.

The Normal rate-limit/Retry-After candidate is `7fa1b0aef76aec6acc293c350414309b38362744` (10 ahead / 0 behind #74), not integrated or CI-validated. Production remains unchanged; no deployment or production migration occurred.


## 2026-11-06 10:58 BRT — engineering checkpoint

- Normal #74 exact HEAD `94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6`: Validate and Signaling Smoke both PASS on the exact SHA.
- Team Lite #76 exact HEAD `83216ccf5818274da3241273ea18ebd97fa3928b` (227/0 vs team-lite-official; 168/0 vs #75). Previous run [42228414423](https://github.com/Reekyi/UpStatus/actions/runs/42228414423) passed 103/103 authenticated checks, browser WebRTC call/voice/screen, three-member mesh, rate-limit/read-receipt concurrency, migration guard and fixture cleanup; final local candidate check failed because it expected an object while `signalReleaseVoiceRoom()` returns normalized boolean true after confirmed leave. Harness-only fix in commit [83216cc](https://github.com/Reekyi/UpStatus/commit/83216ccf5818274da3241273ea18ebd97fa3928b) now checks boolean success and exactly two leave attempts. Exact-head run [42229990514](https://github.com/Reekyi/UpStatus/actions/runs/42229990514) is running; do not mark #76 green until all jobs and cleanup finish.
- #80 HEAD `f6d5deb`: Validate [42228645087](https://github.com/Reekyi/UpStatus/actions/runs/42228645087) still fails inherited `client signed upload helper missing`. #82 HEAD `2937f1c`: Validate [42227785333](https://github.com/Reekyi/UpStatus/actions/runs/42227785333) still fails inherited `production updateURL mismatch`; independent QA branch untouched.
- Separate rate-limit candidate branch is 10 commits ahead / 0 behind #74, unintegrated and without CI. It changes only the isolated test Edge Function for rate-limit/Retry-After; neither product server template integrates the RPC, and production has no dedicated `upstatus-signal`. Migration remains unapplied. Review opportunistic stale-bucket deletion inside the request-path RPC before adoption.
- Production `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 ACTIVE functions; no rate-limit or voice-attempt schema/RPC and no dedicated signaling endpoint. Security Advisor remains 3 anon SECURITY DEFINER WARN, 3 authenticated WARN, 10 RLS/no-policy INFO. Eight backend-owned public tables still have client SELECT/INSERT grants; visual-config does not. `realtime.messages` has client SELECT/INSERT grants. Broad default ACLs remain.
- Isolated `bfpjtfqlnypisxljoxkb` is ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 27 migrations, test function v31. Snapshot showed zero rows in inspected public tables; current Candidate Checks is still running, so verify final cleanup after completion.

No production write, migration, deploy, merge, release, secret/role/flag change, userscript publication, or destructive action.


## Engineering checkpoint — 2026-11-06 12:09 BRT

### Exact refs and CI

- **#74 Normal** remains at `94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6`, 735 ahead / 0 behind `master`. Exact-head Validate [42220452780](https://github.com/Reekyi/UpStatus/actions/runs/42220452780) and Signaling Smoke [42220452949](https://github.com/Reekyi/UpStatus/actions/runs/42220452949) both concluded SUCCESS (129/129 authenticated checks, WebRTC call/voice/screen, three-member mesh, rate limit 90+1 and concurrency, atomic read receipts, voice/call-attempt recovery and cleanup).
- **#75 baseline** remains `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. This is not a substitute for current #76 validation.
- **#76 Team Lite** current PR head is `1a6de09805353145e78083f5c03f6c91f0118449`, 236 ahead / 0 behind `team-lite-official`, 177 ahead / 0 behind #75. Candidate Checks [42241688374](https://github.com/Reekyi/UpStatus/actions/runs/42241688374) attempt 1 failed in the durable-recovery test due a duplicate test variable; the variable collision was fixed. Attempt 2 passed the isolation guard, adapter, durable recovery tests including suspicious-marker fail-closed cases, and unauthenticated endpoint smoke; authenticated integration/browser is still running. Previous exact-head Candidate Checks [42240703701](https://github.com/Reekyi/UpStatus/actions/runs/42240703701) passed the full 103/103 authenticated suite and cleanup. Do not mark the current #76 head green until [42241688374](https://github.com/Reekyi/UpStatus/actions/runs/42241688374), the remaining concurrency/layout gates and cleanup finish.
- The previous exact-head run [42229990514](https://github.com/Reekyi/UpStatus/actions/runs/42229990514) passed 103/103 authenticated checks, browser call/voice/screen WebRTC, three-member mesh, rate-limit/read-receipt concurrency, migration guard and fixture cleanup, then failed only in a final harness assertion expecting legacy `signalReleaseVoiceRoom()`. The current logical-attempt path uses `signalAttemptPendingVoiceRoomCancel()`; independent QA confirmed the assertion was stale relative to the attempt protocol.
- The test-only contract correction branch `team-lite/voice-leave-attempt-contract-20261106` remains in the ancestry of #76; its runtime tree matches the prior durable-attempt implementation and the harness tests cancel-open failure retaining attempt/room/marker followed by confirmed retry. The Team Lite corruption-guard candidate was fast-forwarded into #76 at `1a6de098`; its current CI has passed the corruption unit tests and unauthenticated endpoint checks, with authenticated integration still running. The equivalent Normal candidate remains isolated at `normal/voice-attempt-corruption-guard-20261106`, HEAD `2ff26ee2b3120b4eea096d2923c96d7fe92c133b`, 4 ahead / 0 behind #74, not yet integrated or CI-validated.
- **#80 continuity** is now `2f34d2d8a6f127e56cad57b3cbd44bc78e2d866c`, 124 ahead / 0 behind `develop`; the documentation checkpoint triggered Validate [42240421438](https://github.com/Reekyi/UpStatus/actions/runs/42240421438), which again reproduced inherited `client signed upload helper missing`.
- **#82 independent QA** remains `a3596fd586872c332822a30d697be24788352890`, 65 ahead / 0 behind `master`; Validate [42235896025](https://github.com/Reekyi/UpStatus/actions/runs/42235896025) reproduced inherited `production updateURL mismatch`. QA branch and `docs/RELEASE_READINESS.md` were not modified by engineering.
- All five PRs remain open and Draft. Current review queries show zero submitted human reviews on #74/#75/#76/#80/#82.

### New independent-QA finding — durable marker corruption

The current Normal and Team Lite `signalRestorePendingVoiceRoomAttempts()` implementations silently skip individual records that fail normalization, then rewrite the member-scoped envelope using only accepted records. A malformed, stale, future-dated or unsupported-logical-ID record whose `member` equals the current member may still represent the only local handle for a server-side attempt; silently dropping it can orphan that membership. This is a code-inspection risk, not physically reproduced. Next candidate should preserve the suspicious own-member envelope, set storage health to unhealthy, block new room opens and logout claims, and add equivalent regression tests in both clients. Explicit cross-member records may continue to be rejected without crossing identities. See the current independent QA `docs/RELEASE_READINESS.md` audit section for the evidence and proposed gate.

### Supabase — read-only state

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 ACTIVE Edge Functions; Normal `upstatus` v480, Team Lite v15, Screen Share beta10 v6. No dedicated `upstatus-signal`, call/voice-attempt tables/RPCs, distributed rate-limit table/RPC or atomic read-receipt RPC exists in production.
- Security Advisor observed 2026-11-06 15:00:55Z: 3 SECURITY DEFINER WARN for anon, 3 for authenticated, 10 RLS-enabled/no-policy INFO; performance and health had no findings. Read-only catalog confirms the three public broadcast functions remain SECURITY DEFINER and executable by anon/authenticated; nine backend-owned public tables grant client SELECT/INSERT/UPDATE/DELETE despite RLS and zero policies (visual config is the exception); `realtime.messages` grants anon/authenticated SELECT and INSERT. Broad default ACLs remain pending.
- Isolated project `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 27 migrations, `upstatus-signal-test` v31 and `upstatus-signal-e2e-once` v3. After Candidate Checks [42240703701](https://github.com/Reekyi/UpStatus/actions/runs/42240703701) completed, a SELECT-only snapshot found zero rows in users, sessions, rooms, members, bindings, events, call attempts, voice attempts, rate-limit buckets and chat reads. The current Candidate Checks [42241688374](https://github.com/Reekyi/UpStatus/actions/runs/42241688374) is using this project; repeat the SELECT-only cleanup verification after it finishes. No manual cleanup was performed.
- Rate-limit/Retry-After remains isolated-endpoint preparation only: actual Normal/Team Lite product server templates do not integrate the RPC, production has no dedicated signaling function, and product integration/Retry-After remain pending. The candidate RPC's opportunistic stale-bucket deletion in the request path still needs bounded-work/locking review.

No production writes, migrations, deployments, secret/role/flag changes, merges, releases, userscript publication, destructive operations or manual fixture cleanup occurred.


## 2026-11-06 12:44 BRT - current engineering snapshot

- Normal #74 exact HEAD `9ed9fcb77958455f90c31d14c2b66a463ad9d191`: Validate and Signaling Smoke both PASS. Smoke confirms 129/129 authenticated checks, browser WebRTC call/voice/screen, three-member mesh, rate-limit 90+1 and concurrency, atomic read receipts and cleanup.
- Team Lite #76 exact HEAD `86e71f5e549cc2b2e16629c5fcc06f047470f52f`: new Candidate Checks [42245339846](https://github.com/Reekyi/UpStatus/actions/runs/42245339846) has passed isolation, adapter, durable voice attempt/retransmission VM regressions and endpoint authentication; authenticated integration/browser and final concurrency/layout/cleanup gates are still running.
- Normal equivalent voice signaling retry is isolated at `normal/voice-signaling-retry-20261106`, HEAD `aa33645cb242c913cb4bc5e71a22f3de70d4034c`, 2 commits ahead / 0 behind #74. Function bodies are byte-identical to Team Lite. Not integrated or CI-validated.
- New code-inspection risk: lost voice offer/answer messages after a network outage were not retransmitted on subsequent presence; a delayed recovery timer could also drop a peer after it had recovered. Team Lite candidate fixes both paths and has unit coverage. Physical no-F5 retest remains pending.
- The rate-limit/Retry-After branch is diverged from current Normal (10 ahead / 5 behind), unintegrated, and still contains unbounded stale-bucket deletion in its request-path RPC. Do not adopt until refreshed and cleanup is bounded.
- #80 continuity is at `fec285947c2876eb548ea533a5c297cc71db503e`, 130 ahead / 0 behind develop. Its inherited Validate failure remains `client signed upload helper missing`. #82 QA remains at `a3596fd586872c332822a30d697be24788352890`, 65 ahead / 0 behind master, with inherited `production updateURL mismatch`.
- Production remains read-only: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active functions; no dedicated signaling endpoint or candidate signaling/rate-limit/read-receipt schema is deployed. Security findings remain 3 anon SECURITY DEFINER WARN, 3 authenticated WARN and 10 RLS/no-policy INFO.
- Manual gates remain: Tampermonkey close/reload offline without F5, microphone/display permissions, installed Normal ↔ Team Lite interoperability, RT-01, ACL-02, official TEST migration/rollback and human reviews.

No merge, deploy, release, production write/migration, secret/role/flag change, userscript publication or destructive operation.


## 2026-11-06 12:47 BRT - current engineering snapshot

- Normal #74 is at `aa33645cb242c913cb4bc5e71a22f3de70d4034c`, 742 ahead / 0 behind master. Prior HEAD `9ed9fcb` passed Validate and Smoke; the new exact-head Smoke [42246115760](https://github.com/Reekyi/UpStatus/actions/runs/42246115760) is queued after the voice-signaling retry fix.
- Team Lite #76 is at `86e71f5e549cc2b2e16629c5fcc06f047470f52f`, 240 ahead / 0 behind team-lite-official. Candidate Checks [42245339846](https://github.com/Reekyi/UpStatus/actions/runs/42245339846) passed in full, including 103/103 authenticated checks and new voice offer/answer retransmission regressions; post-run fixture counts are zero.
- Normal's equivalent retry fix is integrated into #74 via the isolated two-commit candidate. The Normal and Team Lite voice offer, receive and recovery functions are byte-identical. Exact-head Normal CI is pending.
- New code-inspection risk: lost voice offer/answer messages after network outage were not retransmitted on subsequent presence; a delayed recovery timer could drop a peer after recovery. Team Lite full CI passed; physical no-F5 acceptance remains pending.
- Rate-limit/Retry-After candidate is diverged from current Normal (10 ahead / 5 behind) and contains unbounded stale-bucket deletion in its request-path RPC. Do not integrate until refreshed and cleanup is bounded.
- #80 continuity is at the current documentation branch tip, 131 ahead / 0 behind develop, with inherited `client signed upload helper missing` Validate failure. #82 QA remains 65 ahead / 0 behind master with inherited `production updateURL mismatch`.
- Production remains read-only: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active functions; no dedicated signaling endpoint or candidate signaling/rate-limit/read-receipt schema is deployed. Security findings remain 3 anon SECURITY DEFINER WARN, 3 authenticated WARN and 10 RLS/no-policy INFO.
- Manual gates remain: Tampermonkey close/reload offline without F5, microphone/display permissions, installed Normal ↔ Team Lite interoperability, RT-01, ACL-02, official TEST migration/rollback and human reviews.

No merge, deploy, release, production write/migration, secret/role/flag change, userscript publication or destructive operation.


## 2026-11-06 12:50 BRT - exact-head delta

- #74 `aa33645cb242c913cb4bc5e71a22f3de70d4034c`: Validate [42246115559](https://github.com/Reekyi/UpStatus/actions/runs/42246115559) PASS; Signaling Smoke [42246115760](https://github.com/Reekyi/UpStatus/actions/runs/42246115760) still running authenticated integration/browser.
- #76 `86e71f5e549cc2b2e16629c5fcc06f047470f52f`: Candidate Checks [42245339846](https://github.com/Reekyi/UpStatus/actions/runs/42245339846) PASS, including new voice offer/answer retransmission tests and zero post-run fixture counts.
- #82 QA branch independently advanced to `f6a9eaed2b127b4d2d4a4de9a413470666ecff06`, 66 ahead / 0 behind master, with inherited `production updateURL mismatch` Validate failure [42244487940](https://github.com/Reekyi/UpStatus/actions/runs/42244487940). Engineering did not edit QA files.
- #80 continuity is `2a48773d921c44d188031c7655ec45da87f95820`, 133 ahead / 0 behind develop; known Validate failure remains `client signed upload helper missing`.
- Shared isolated project is reserved by #74 Smoke [42246115760](https://github.com/Reekyi/UpStatus/actions/runs/42246115760). No concurrent fixture-mutating run.

Production remains read-only; all release and physical acceptance gates remain open.


## 2026-11-06 12:54 BRT - both candidate clients green

- Normal #74 exact HEAD `aa33645cb242c913cb4bc5e71a22f3de70d4034c`: Validate [42246115559](https://github.com/Reekyi/UpStatus/actions/runs/42246115559) and Smoke [42246115760](https://github.com/Reekyi/UpStatus/actions/runs/42246115760) PASS. Smoke includes 129/129 authenticated checks, browser call/voice/screen media, three-member mesh, rate-limit 90+1/concurrency, atomic read receipts, voice offer/answer retransmission regressions and cleanup.
- Team Lite #76 exact HEAD `86e71f5e549cc2b2e16629c5fcc06f047470f52f`: Candidate Checks [42245339846](https://github.com/Reekyi/UpStatus/actions/runs/42245339846) PASS, including 103/103 authenticated checks, WebRTC, three-member mesh, same voice retransmission regressions, rate-limit/read-receipt concurrency and cleanup.
- Post-run read-only fixture counts are zero across rooms, memberships, bindings, events, call attempts, voice attempts, rate-limit buckets and chat reads.
- Voice reconnect candidate fix is in both clients; physical Tampermonkey close/reload-offline/no-F5 remains pending (issue #78 0/8).
- Follow-up found analogous one-shot offer/answer behavior in screen-share negotiation without a bounded recovery timer; not changed in this round.
- #80 continuity is `0c28f38d71064757af87f508a9ed623c16725fe7`, 135 ahead / 0 behind develop, with inherited `client signed upload helper missing` Validate failure. #82 QA is `f6a9eaed2b127b4d2d4a4de9a413470666ecff06`, 66 ahead / 0 behind master, with inherited `production updateURL mismatch`; QA branch and release-readiness doc untouched.
- Rate-limit candidate remains diverged 10 ahead / 5 behind and has unbounded request-path bucket cleanup; do not integrate.
- Production remains read-only with no dedicated signaling endpoint or candidate signaling/rate-limit/read-receipt schema deployed. Security findings remain 3 anon SECURITY DEFINER WARN, 3 authenticated WARN, 10 RLS/no-policy INFO.

No merge, deploy, release, production write/migration, secret/role/flag change, userscript publication or destructive operation.


## 2026-11-06 13:10 BRT — screen-share recovery candidate

- Normal #74 runtime head `f56acb9a59f56d0dfcef4bf3192550fc82f59c0d`: Validate [42249084532](https://github.com/Reekyi/UpStatus/actions/runs/42249084532) passed. Signaling Smoke [42249084515](https://github.com/Reekyi/UpStatus/actions/runs/42249084515) passed syntax/static (including the new screen-share VM test) and unauthenticated endpoint checks; authenticated integration/browser and cleanup were still running. The PR branch's latest docs-only head is `61f2116cfc796a1097cb3ba44d3ef8557baa73ab`.
- Team Lite #76 head `ac18ada46755276691e08a127b52e9b3e8955d16`: Candidate Checks [42249119327](https://github.com/Reekyi/UpStatus/actions/runs/42249119327) was cancelled while pending before a job was created; no Team Lite tests ran on this head. Re-run after the Normal Smoke releases the shared concurrency group.
- Both userscripts now have byte-identical screen-share recovery logic and use the same VM test: cached offer retransmission, three retries at 3-second intervals, duplicate-offer cached-answer replay, disconnected-peer replacement, and timer cleanup. No physical browser/network-loss reproduction yet.
- PR #80 Validate [42247097010](https://github.com/Reekyi/UpStatus/actions/runs/42247097010) still fails the inherited `client signed upload helper missing` assertion. PR #82 QA Validate [42244487940](https://github.com/Reekyi/UpStatus/actions/runs/42244487940) still fails the inherited `production updateURL mismatch`; QA branch and release-readiness document remain untouched.
- Production `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active Edge Functions. No dedicated signaling endpoint or candidate signaling/rate-limit/attempt/read-receipt tables/RPCs are present. Security Advisor remains 3 anon + 3 authenticated SECURITY DEFINER WARN and 10 RLS/no-policy INFO; performance/health advisors returned no findings.
- Production remained read-only. All PRs remain Draft. Physical Tampermonkey, microphone/display capture, installed Normal ↔ Team Lite, official TEST cutover, rate-limit product integration, and public Realtime retirement remain open gates.


## 2026-11-06 — rate-limit candidate disposition

The branch `normal/rate-limit-retry-after-20261106` is 10 commits ahead / 13 behind current Normal #74 and has diverged; do not integrate it as a unit. Its candidate RPC performs an unbounded stale-bucket DELETE inside the request path on 1-in-64 calls. Recreate/rebase only reviewed changes from the current #74 head and replace request-path cleanup with bounded batch or scheduled cleanup before reconsidering. Product-facing Normal/Team Lite endpoints and production still lack distributed rate-limit integration; Retry-After is not yet part of the shipped contract. No migration or deployment was performed.


## 2026-11-06 — isolated-test queue correction

The Team Lite Candidate Checks run 42249119327 was cancelled while pending before a job existed because GitHub Actions concurrency groups default to one pending run. Added `queue: max` with `cancel-in-progress: false` to both Normal and Team Lite isolated-test workflows (GitHub supports up to 100 pending runs since 2026-05-07: https://github.blog/changelog/2026-05-07-github-actions-concurrency-groups-now-allow-larger-queues/).

Current Normal #74 head `e585447d092bcb385ab6e5b16044d85e6674e3e3`: Validate [42250699197](https://github.com/Reekyi/UpStatus/actions/runs/42250699197) passed; Smoke [42250699210](https://github.com/Reekyi/UpStatus/actions/runs/42250699210) pending. Current Team Lite #76 head `eaeb3fbb6f9f2c7971e93ed6ce7cc353fba2d227`: Candidate Checks [42250709207](https://github.com/Reekyi/UpStatus/actions/runs/42250709207) pending. The preceding Normal Smoke [42249822242](https://github.com/Reekyi/UpStatus/actions/runs/42249822242) completed successfully: 129/129 authenticated checks, browser call/voice/screen WebRTC with remote media, three-member mesh, rate-limit 90+1, read-receipt concurrency, and runner cleanup verification all passed. The current Smoke [42250699210](https://github.com/Reekyi/UpStatus/actions/runs/42250699210) is now active.

Read-only counts showed unexpired reserved-prefix fixtures created after the preceding run's cleanup timestamp. Their timestamps align with the active Normal Smoke run. Do not manually delete them; allow the active and queued workflows to complete and verify cleanup afterward.


### Screen-share follow-up risk

The current recovery candidate does not yet serialize simultaneous local offer creation or concurrent duplicate remote-offer handling while setRemoteDescription is in flight. Presence/join paths can invoke screenShareOffer more than once for the same peer. Add a per-peer in-flight negotiation lock and concurrent-offer regression before marking screen-share recovery complete. This is an unverified review/test gap, not a reproduced defect.


## 2026-11-06 14:20 BRT — current candidate snapshot

- **Normal #74:** `05c9b4d59b74202e718bec77746746b7aa19632f` (753/0 vs master). Validate [42260571956](https://github.com/Reekyi/UpStatus/actions/runs/42260571956) passed; final-head Smoke [42260571690](https://github.com/Reekyi/UpStatus/actions/runs/42260571690) queued. Previous head `623c714` passed full Smoke [42259504101](https://github.com/Reekyi/UpStatus/actions/runs/42259504101), including 129/129 authenticated, browser call/voice/screen media, 3-member mesh, rate-limit concurrency, atomic receipts, and cleanup.
- **Team Lite #76:** `b784daa63447cda1675dd45f6daccdaf5c2c8973` (249/0 vs team-lite-official; 190/0 vs #75). Parent head `cee32e3` run [42259513821](https://github.com/Reekyi/UpStatus/actions/runs/42259513821) passed screen-share VM and endpoint-auth stages; authenticated/browser integration is running. Final-head checks are queued.
- Both clients now serialize per-peer screen-share offer/answer/ICE operations and use deterministic polite/impolite glare handling. Regressions cover concurrent local offers, simultaneous offer collision, duplicate remote offers, stale async completion after peer drop, bounded retries, and timer cleanup. Final test-only duplicate-remote-offer assertion is on the exact PR heads but its queued workflows have not yet completed.
- #75 baseline remains unchanged at `7bbf9b9` (59/0; historical CI pass). #80 remains `d2dc540` (151/0; inherited `client signed upload helper missing`). #82 remains `cd85c53` (67/0; inherited `production updateURL mismatch`). All five PRs remain open/Draft with no submitted reviews.
- Production `dlfvkawaiqduhlazsszm` is ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, 38 ACTIVE functions (Normal v480, TEST v281, Team Lite v15). Production still lacks the dedicated `upstatus-signal`, distributed rate-limit table/RPC, call/voice attempt tables, and read-receipt RPC. Security findings remain 3+3 SECURITY DEFINER WARN and 10 RLS INFO; public Realtime and broad grants/default ACLs remain release blockers.
- Product endpoint rate limiting/Retry-After, private Realtime cutover, official TEST migration/rollback, physical no-F5 and cross-client acceptance, and human reviews remain open. Production was read-only; no migration, deploy, merge, release, secret/role/flag change, or userscript publication occurred.


## 2026-11-06 14:28 BRT — final-head queue progression

- Normal #74 final HEAD `05c9b4d59b74202e718bec77746746b7aa19632f`: Validate [42260571956](https://github.com/Reekyi/UpStatus/actions/runs/42260571956) passed. Final-head Smoke [42260571690](https://github.com/Reekyi/UpStatus/actions/runs/42260571690) is now in progress; syntax and unauthenticated checks passed, and the authenticated/browser integration step is running. The preceding HEAD `623c714` completed full Smoke [42259504101](https://github.com/Reekyi/UpStatus/actions/runs/42259504101) successfully.
- Team Lite #76 preceding HEAD `cee32e3` completed Candidate Checks [42259513821](https://github.com/Reekyi/UpStatus/actions/runs/42259513821) successfully: 103/103 authenticated checks, browser call/voice/screen WebRTC with remote media, three-member mesh, rate limit 90+1 and concurrency, atomic receipts, migration-layout guard, candidate metadata, and cleanup. Final HEAD `b784daa63447cda1675dd45f6daccdaf5c2c8973` Candidate Checks [42260582180](https://github.com/Reekyi/UpStatus/actions/runs/42260582180) is pending behind the shared isolated-project workflow group.
- The final heads add the concurrent duplicate-remote-offer regression on top of the already-tested per-peer queue/glare implementation. Do not call final-head CI complete until both queued workflows finish.
- The isolated project remains in use by the final Normal Smoke; no manual fixture cleanup or overlapping mutating suite was started. Verify zero fixtures only after the queue drains.
- The rate-limit candidate branch `normal/rate-limit-retry-after-20261106` is now 10 commits ahead / 18 behind current #74 and remains divergent. Its migration still performs an unbounded stale-bucket DELETE on 1-in-64 requests; do not integrate it as a unit.


## 2026-11-06 14:56 BRT — exact-head CI completion and isolated cleanup

Live refs were re-fetched before this checkpoint. All five PRs remain open, Draft, and unmerged; no human approval/review submission was observed.

### Exact PR heads and CI

- **Normal #74** — `05c9b4d59b74202e718bec77746746b7aa19632f`. Validate [42260571956](https://github.com/Reekyi/UpStatus/actions/runs/42260571956) and Signaling Smoke [42260571690](https://github.com/Reekyi/UpStatus/actions/runs/42260571690) both completed successfully on the exact head. Smoke job [128040810495](https://github.com/Reekyi/UpStatus/actions/runs/42260571690) passed 129/129 authenticated integration checks, browser call/voice/screen WebRTC with remote media, three-member mesh, voice-attempt open/cancel races, rate limit (90 accepted + 1 HTTP 429), rate-limit concurrency, atomic read-receipt concurrency, and fixture cleanup.
- **Team Lite #76** — `b784daa63447cda1675dd45f6daccdaf5c2c8973`. Candidate Checks [42260582180](https://github.com/Reekyi/UpStatus/actions/runs/42260582180) completed successfully on the exact head. Job [128050692503](https://github.com/Reekyi/UpStatus/actions/runs/42260582180) passed 103/103 authenticated checks, browser call/voice/screen WebRTC, three-member mesh, open voice-room membership/owner handoff/races/capacity, voice-attempt recovery, rate limit, read receipts, migration-layout guard, version/portal/session/updater checks, and cleanup.
- **Team Lite baseline #75** — unchanged `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. #76 is 190 commits ahead and zero behind this baseline.
- **Continuity #80** — `99ad0b501e0b132ecdf71823fa394383733b4cbc`. Validate [42261621831](https://github.com/Reekyi/UpStatus/actions/runs/42261621831) failed at the inherited `client signed upload helper missing` assertion after building 3.0.40 / TEST 3.0.40-beta.22. No runtime code changed in this docs PR.
- **Independent QA #82** — `59cbe760bb8247ebade999de40abf97553447f29`. Validate [42263304314](https://github.com/Reekyi/UpStatus/actions/runs/42263304314) failed at the inherited `production updateURL mismatch` assertion after building 3.4.7 / TEST 3.4.7. The QA branch and `docs/RELEASE_READINESS.md` were not modified.

### Isolated Supabase cleanup — read-only verification

Project `bfpjtfqlnypisxljoxkb` is ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, with 27 recorded migrations through `20261106120851`. After both exact-head workflows completed, sequential SELECT-only counts returned **zero** reserved-prefix fixtures in users, sessions, rooms, memberships, bindings, signaling events, call attempts, voice-room attempts, rate-limit buckets, chat reads, and messages. No manual cleanup was performed.

### Production Supabase — read-only recheck

Project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY on PostgreSQL 17.11.0.002, with seven migrations through `20261027155438` and 38 ACTIVE Edge Functions. Core deployed functions remain Normal `upstatus` v480 (3.4.7), Team Lite `upstatus-team-lite` v15 (3.4.30), and legacy Normal `upstatus-screen-share-3-1-1-beta10` v6.

Production still lacks the dedicated `upstatus-signal` endpoint, distributed rate-limit table/RPC, call/voice-attempt tables/RPCs, and `merge_chat_read_receipts`. Security Advisor still reports three SECURITY DEFINER functions executable by anon and the same three by authenticated (3 + 3 WARN), plus ten RLS/no-policy INFO findings; performance and health advisors have no findings. Direct read-only catalog checks reconfirmed the three broadcast functions are SECURITY DEFINER with `search_path=public` and EXECUTE for anon/authenticated. Nine backend-owned public tables retain RLS with zero policies and client CRUD grants; `upstatus_visual_config` is the exception with no client table grants.

### Public Realtime chat path: candidate vs deployed behavior

The current Normal and Team Lite candidate userscripts both send `chat_fast` without a message payload at the two message/attachment send sites. The Normal candidate also contains `20261103160000_minimize_public_chat_broadcast.sql`, which changes the database trigger broadcast to an operation-only hint. This is candidate source/migration evidence, not production deployment.

The deployed Normal v480 and Team Lite v15 bundles still send `chat_fast` with `{message: created}` and `{message: r.message}` on the public topic. The production database trigger also remains the full-row public broadcast. RT-01 therefore remains BLOCKED until the candidate client and reviewed migration are coordinated through an approved release/cutover; the public topic itself and its metadata/frequency exposure also remain to be addressed. Do not treat candidate payload minimization as a production fix.

### Remaining engineering/release gates

- Distributed rate limiting is tested only in the isolated signaling endpoint. Neither product server template nor production core function calls `consume_upstatus_signal_rate_limit`; `Retry-After` is not in the product contract. The separate `normal/rate-limit-retry-after-20261106` branch remains divergent and its candidate RPC performs an unbounded stale-bucket DELETE on 1-in-64 requests. Do not promote it as a unit.
- Issue #78 remains open with 0/8 physical acceptance criteria: real Tampermonkey offline/online recovery without F5, device permissions, and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING.
- Issue #79 body remains 16/35 checked (19 unchecked); do not convert that checklist count into an overall completion percentage.
- Candidate release versions, endpoint cutover, migration packaging/rollback in official TEST, Realtime authorization/private transport, 38-function auth/ownership inventory, human reviews, and explicit release approval remain open.

This checkpoint used GitHub metadata/workflow logs and read-only Supabase metadata, advisors, catalog SQL, and isolated-project fixture counts. No production SQL write, migration, deployment, flag/secret/role change, userscript publication, merge, destructive operation, or manual test-fixture mutation was performed.


## 2026-11-06 — chat_fast payload guard parity and revalidation

- **Normal #74** advanced from `05c9b4d` to `206a2fff08a67d024291e8f074e930e54a72baf9` with a test-only addition in `scripts/signaling-static.test.mjs`. The regression requires exactly two `chat_fast` sends, no second argument/payload, and a refresh-only receiver. Validate [42267444815](https://github.com/Reekyi/UpStatus/actions/runs/42267444815) passed. Smoke [42267444841](https://github.com/Reekyi/UpStatus/actions/runs/42267444841) is still in progress; static harness and unauthenticated endpoint stages passed, authenticated/browser integration is running. Do not mark exact-head Smoke complete yet.
- **Team Lite #76** advanced from `b784daa` to `6e247d7b6107b965d9341ddb814f1498a4f3b8e4` with an equivalent stronger guard in `scripts/team-lite-candidate-check.mjs`. It now requires exactly two empty `chat_fast` hints and rejects any second argument. Candidate Checks [42267664191](https://github.com/Reekyi/UpStatus/actions/runs/42267664191) is pending in the shared isolated-project queue behind Normal.
- A read-only source comparison confirmed both current candidate userscripts have exactly two empty `chat_fast` sends and a receiver that refetches canonical messages through the authenticated API. The deployed production bundles still send full message objects in those events; the candidate changes are not production fixes until approved cutover.
- The previous isolated-project post-run SELECT snapshot showed zero reserved-prefix fixtures. Because the new Normal run is currently mutating the isolated project and Team Lite is queued, no new cleanup count is claimed until the full queue completes.
- These changes are static-test-only; no runtime behavior or Supabase schema changed. Both main PRs remain Draft.



## 2026-11-06 16:02 BRT — chat_fast guard CI completion and release snapshot

Live GitHub refs were re-fetched before this checkpoint. All five PRs remain open, Draft, and unmerged. No submitted human reviews were found on #74, #76, or #82.

### Exact candidate heads and CI

- **Normal #74** — `chore/continuity-foundation`, HEAD `206a2fff08a67d024291e8f074e930e54a72baf9`. Validate [42267444815](https://github.com/Reekyi/UpStatus/actions/runs/42267444815) and Signaling Smoke [42267444841](https://github.com/Reekyi/UpStatus/actions/runs/42267444841) both completed successfully on this exact HEAD. Smoke job [128062940262](https://github.com/Reekyi/UpStatus/actions/runs/42267444841) passed 129/129 authenticated integration checks, browser call/voice/screen WebRTC with remote media, three-member mesh, voice-attempt open/cancel races, 90 accepted + 1 HTTP 429, distributed rate-limit concurrency, atomic read-receipt concurrency, and cleanup.
- **Team Lite #76** — `team-lite/signaling-transport-candidate`, HEAD `6e247d7b6107b965d9341ddb814f1498a4f3b8e4`. Candidate Checks [42267664191](https://github.com/Reekyi/UpStatus/actions/runs/42267664191) completed successfully. Job [128066050701](https://github.com/Reekyi/UpStatus/actions/runs/42267664191) passed 103/103 authenticated checks, browser call/voice/screen WebRTC, three-member mesh, open voice-room membership/owner handoff/races/capacity, voice-attempt recovery, rate limit, atomic receipts, migration-layout guard, version/portal/session/updater checks, and cleanup.
- **Team Lite baseline #75** — unchanged HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. #76 remains the active signaling candidate.
- **Continuity #80** — `docs/continuity-handoff-2026-11-04`, HEAD `a2499d439d972fe8f742b6de3f8aa565f4256c42`. Validate [42267976464](https://github.com/Reekyi/UpStatus/actions/runs/42267976464) failed at the inherited `client signed upload helper missing` assertion. This PR changes documentation only.
- **Independent QA #82** — `qa/release-readiness-2026-11-04-master`, HEAD `452fbe3138323585a1d18ade51fc553e0d9ad1b7`. Validate [42272448952](https://github.com/Reekyi/UpStatus/actions/runs/42272448952) failed at `production updateURL mismatch`. QA's branch and document were not modified by engineering.

### Builder mismatch clarification

The QA failure is reproducible on the #82 branch's `master` base. The current #74 candidate already separates the production userscript `updateUrl` from the legacy API `cloud`: `scripts/build.mjs` uses `release.json.scriptUrl` for `@updateURL/@downloadURL` while preserving the legacy `CLOUD_SERVER` endpoint until coordinated cutover. The #74 Validate run above passed with that implementation. Do not copy engineering changes into the independent QA branch or weaken the validator; the mismatch should disappear only when the reviewed builder fix is incorporated into the QA base through normal repository review/coordination.

### Supabase verification

- Isolated project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY` (PostgreSQL 17.11.0.003). After both exact-head workflows completed, a sequential SELECT-only count returned **zero** `__signal_test_` rows across users, sessions, rooms, memberships, bindings, signaling events, call attempts, voice-room attempts, rate-limit buckets, chat reads, and messages. No manual cleanup was performed.
- Production `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY` (PostgreSQL 17.11.0.002), with seven migrations through `20261027155438`. A fresh SELECT-only catalog query confirms that the distributed rate-limit table/RPC and atomic read-receipt RPC are absent, and all three public broadcast SECURITY DEFINER functions remain executable by client roles. Security Advisor reports 3 anon EXECUTE WARN, 3 authenticated EXECUTE WARN, and 10 RLS/no-policy INFO findings; performance and health advisors returned no findings.
- Production remains unchanged. No SQL write, migration, Edge Function deployment, secret/role/flag change, userscript publication, merge, or destructive operation occurred.

### Remaining gates

1. The distributed limiter is validated only in the isolated signaling endpoint; neither product's deployed endpoint integrates it, and the 429 contract still lacks `Retry-After`.
2. The candidate rate-limit RPC's opportunistic cleanup still performs an unbounded stale-bucket DELETE on 1-in-64 requests. Do not promote that migration or the divergent Retry-After branch as a unit; rebuild with bounded or scheduled cleanup and endpoint-level tests.
3. RT-01 remains blocked: production's legacy public Realtime path still broadcasts full chat rows; private/server-mediated cutover and its trust boundary require design and rollback validation.
4. Issue #78 remains open with 0/8 physical acceptance criteria. Real Tampermonkey network-loss recovery without F5, device permissions, and installed Normal/Team Lite interoperability remain manual pending.
5. Official TEST migration/rollback rehearsal, complete 38-function auth/ownership inventory, human reviews, scope decisions, and explicit release approval remain open.

The #74/#76 chat_fast changes in these heads are regression-test-only; they do not change runtime behavior or production. CI approval is not physical browser acceptance or production deployment.


## 2026-11-06 — deterministic bounded-cleanup regression and current release gates

### Candidate heads and exact-head CI

- **Normal #74**: HEAD `b1c3addd918edc5a5b55ceefa739d64338ef2389`. Validate [42285181092](https://github.com/Reekyi/UpStatus/actions/runs/42285181092) passed. Signaling Smoke [42285181079](https://github.com/Reekyi/UpStatus/actions/runs/42285181079) is queued/pending; no job has started in the latest inspection.
- **Team Lite #76**: HEAD `dfc9ddf4ce08bac6bf67451e4c3cad99d58e1564`. Candidate Checks [42285187342](https://github.com/Reekyi/UpStatus/actions/runs/42285187342) is queued/pending; no job has started in the latest inspection.
- **Baseline #75** remains `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, historical CI pass only.
- **Continuity #80** remains `39f6e94607677a620cb26710ec724b12853ff0d3`; Validate [42276650240](https://github.com/Reekyi/UpStatus/actions/runs/42276650240) fails on the inherited develop baseline assertion `client signed upload helper missing`.
- **QA #82** remains on its separate branch at `4f1c852701eb41f8afe6d63f718d7f78ace1ba87`; Validate [42280801629](https://github.com/Reekyi/UpStatus/actions/runs/42280801629) fails on the inherited master baseline assertion `production updateURL mismatch`. Do not edit the QA branch.
- Fresh comparisons: #74 is 760 commits ahead / 0 behind master; #76 is 256 ahead / 0 behind `team-lite-official` and 197 ahead / 0 behind #75. #80 is 159 ahead / 0 behind develop; #82 is 72 ahead / 0 behind master. All tracked PRs remain open and Draft.

### Bounded rate-limit cleanup regression

The test-only SQL file remains under `supabase/test-migrations/`, not the Supabase CLI production migration directory. Both Normal and Team Lite now have the same SQL blob `2a76b07d84fefe709fb27ea1bbd66b57c0aedc3c`.

The regression now checks for zero pre-existing stale rate-limit buckets before inserting its 150 stale test rows, preventing older unrelated rows from consuming part of the global 100-row cleanup batch and invalidating the exact 150-to-50 assertion. The migration-layout guards also assert that precondition. Guard blobs: Normal `d1b5dd0ad32e4e465894f41e3fc0c4ca8ebfb7db`; Team Lite `7d7935382d80181b909eccdb5c701a54f717f91b`.

Commits:
- Normal: SQL `1124b4ef`, guard `66e1c1a`, current HEAD `b1c3add`.
- Team Lite: SQL `4259452`, guard `5cc5525`, current HEAD `dfc9ddf`.

The latest Validate on Normal passed. The new Smoke and Team Lite Candidate Checks are still queued. The SQL migration has **not** been applied to the isolated project yet. A SELECT-only check observed six recently updated rate-limit buckets and zero stale buckets in `bfpjtfqlnypisxljoxkb`; the shared test project appears active, so do not alter its schema until the mutating workflow activity has drained and the table is back to a verified clean baseline.

### New independent QA release blocker

The latest QA audit found that `signaling_transport_enabled` defaults to `false` in both candidate userscripts. With that default, call, voice-room and screen-share signaling still fall back to public Realtime broadcasts; the authenticated transport is opt-in only. Production still has no dedicated `upstatus-signal` Edge Function. Do not flip the flag or change production configuration: the endpoint, migrations, authentication model, and coordinated rollback/cutover are not ready. Treat this as a release blocker even though candidate CI is green.

### Production snapshot — read-only

Production `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. The catalog still lacks the distributed rate-limit table/RPC, atomic read-receipt RPC, and dedicated `upstatus-signal` endpoint. The public message trigger still sends full OLD/NEW rows to `db_change` with `private=false`; the three broadcast SECURITY DEFINER functions remain executable by client roles. Security Advisor remains at 3 WARN for anon, 3 WARN for authenticated, and 10 INFO for RLS without policies.

Issue #78 remains open with 0/8 physical acceptance criteria; Issue #79 remains open with 16/35 checklist items checked. No physical Tampermonkey/no-F5, microphone, display-capture, or installed Normal-to-Team-Lite acceptance has been recorded.

No production SQL write, migration, Edge Function deployment, merge, release, secret/role/feature-flag change, userscript publication, or destructive operation occurred. All production database inspection was SELECT-only.


## 2026-11-06 — isolated rate-limit runtime proof, Retry-After contract, and remote-command hint hardening

### Rate-limit cleanup: now applied and runtime-tested in the isolated project

The test-only migration `supabase/test-migrations/20261106191000_bounded_rate_limit_cleanup_test.sql` (blob `2a76b07d84fefe709fb27ea1bbd66b57c0aedc3c`) was applied only to isolated project `bfpjtfqlnypisxljoxkb`, after both candidate CI activity had drained and a SELECT-only preflight showed zero reserved-prefix fixtures and zero stale rate-limit buckets.

- Isolated migration ledger records `20261106210556_bounded_rate_limit_cleanup_isolated_test`.
- `consume_upstatus_signal_rate_limit(text,integer,integer)` now uses a deterministic stale-row CTE with `ORDER BY updated_at, bucket_key`, `LIMIT 100`, and `FOR UPDATE SKIP LOCKED`.
- Catalog inspection confirms SECURITY INVOKER, empty search_path, EXECUTE denied to anon/authenticated and granted only to service_role.
- The migration's DO regression completed successfully: 150 synthetic expired buckets were reduced to 50, then the test probe/expired rows were removed.
- Post-test SELECT-only verification found zero reserved-prefix users/sessions/rooms/events/rate-limit buckets and zero globally stale rate-limit rows.

No production migration or SQL write was performed.

### Isolated endpoint: Retry-After contract

The isolated `upstatus-signal-test` Edge Function was deployed as version 32 (project `bfpjtfqlnypisxljoxkb` only). It now:
- returns `Retry-After: 60` on HTTP 429;
- exposes `Retry-After` through `Access-Control-Expose-Headers` for browser JavaScript;
- keeps custom UpStatus session-token authentication (`verify_jwt=false` at gateway, application auth enforced in the function).

Normal and Team Lite test harnesses assert the 429 header; unauthenticated CORS preflight passed on the first post-deploy Normal Smoke. The authenticated 90+1 request assertion is still waiting for exact-head CI completion. The current userscript GM bridge still discards response headers, so client-side Retry-After handling remains a separate follow-up; do not claim the client honors it yet.

### Remote-command public broadcast payload removed from both candidates

Independent QA found a second remote-command sender that still published the full command object in the public Realtime topic. Both candidate artifacts were inspected and corrected:

- Normal #74: all two `remote_command` senders now publish only `{op:'hint'}`; the receiver polls the authenticated command endpoint. Static regression requires exactly two hint-only senders and rejects command/result payload broadcasts.
- Team Lite #76: the second sender now also publishes only `{op:'hint'}`; the existing receiver remains hint-only and the result waiter reconciles through the authenticated result endpoint. Candidate check requires exactly two hint-only senders and rejects a full command object.

Commits:
- Normal source `6418c29`, regression guard `432aaed`; current HEAD `432aaed84bf8f6c1c9b7fcda2c34c1b13e566866`.
- Team Lite artifact `3e88807`, regression guard `28ea63d`; current HEAD `28ea63d5090cbed198d87eee055d62ac732d9464`.

These new remote-command checks have not yet completed exact-head CI. The deployed production bundles and database triggers remain unchanged and still require the coordinated Realtime migration.

### Exact current PR/workflow state

- **#74 Normal** HEAD `432aaed84bf8f6c1c9b7fcda2c34c1b13e566866`: Validate [42295034638](https://github.com/Reekyi/UpStatus/actions/runs/42295034638) passed; exact-head Smoke [42295034716](https://github.com/Reekyi/UpStatus/actions/runs/42295034716) pending. The immediately preceding HEAD `0ab15493` completed Validate [42294427514](https://github.com/Reekyi/UpStatus/actions/runs/42294427514) and Smoke [42294427574](https://github.com/Reekyi/UpStatus/actions/runs/42294427574): 19/19 unauthenticated checks, 129/129 authenticated integration checks, browser call/voice/screen WebRTC with remote media, three-member mesh, 90 accepted + 1 HTTP 429 with `Retry-After: 60`, rate-limit concurrency, atomic read receipts, and cleanup. The shared isolated project is now in use by the Team Lite rerun; do not mutate it until that run drains.
- **#76 Team Lite** HEAD `28ea63d5090cbed198d87eee055d62ac732d9464`: Candidate Checks [42295045320](https://github.com/Reekyi/UpStatus/actions/runs/42295045320) pending behind the shared isolated-test concurrency queue. A rerun of the preceding pre-deploy attempt is also queued.
- **#75 baseline** remains `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, historical CI pass only.
- **#80 continuity**: current branch HEAD `b15663470e18f045337715595848123ad0e6cea2`; Validate [42295578447](https://github.com/Reekyi/UpStatus/actions/runs/42295578447) is queued. The preceding documentation checkpoint [67d6564](https://github.com/Reekyi/UpStatus/commit/67d65647b3cc0ff7431593a1f06c2cf643b8494d) reproduced the inherited `client signed upload helper missing` failure in [42295357130](https://github.com/Reekyi/UpStatus/actions/runs/42295357130).
- **#82 QA** remains `281db0c32be7b13e670e6f88e4dd24b998c8dea9`; Validate [42289399418](https://github.com/Reekyi/UpStatus/actions/runs/42289399418) fails on inherited `production updateURL mismatch`. QA branch remains untouched.

All five PRs remain open and Draft. No human approval is recorded. Issue #78 remains 0/8 physical acceptance criteria; Issue #79 remains 16/35 checklist items checked.

### Production snapshot remains read-only and blocked

Production `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. Catalog inspection confirms production still lacks the rate-limit table/RPC, atomic read-receipt RPC, call/voice attempt tables, and dedicated `upstatus-signal` endpoint. The three public broadcast SECURITY DEFINER functions remain executable by anon/authenticated with `search_path=public`; the message trigger still publishes complete OLD/NEW rows to `db_change` with `private=false`. The public Realtime cutover and default-off transport flag remain release blockers.

No production SQL write, migration, Edge Function deployment, merge, release, secret/role/feature-flag change, userscript publication, or destructive operation occurred.

## 2026-11-06 — client-side Retry-After propagation in Normal and Team Lite

### Candidate implementation

Both functional candidate branches now preserve the HTTP response headers returned by Tampermonkey's `GM_xmlhttpRequest` bridge and pass them into the shared authenticated signaling adapter.

- **Normal #74:** bridge + adapter commit [efb3dd4](https://github.com/Reekyi/UpStatus/commit/efb3dd409343d7a545801402f1a37754f82472b8); test-fixture correction [057645f](https://github.com/Reekyi/UpStatus/commit/057645fc5196eaf4431389987e5cc4b346df3368).
- **Team Lite #76:** bridge + adapter commit [5f25ad8](https://github.com/Reekyi/UpStatus/commit/5f25ad84357c89383c6f98f8911f8d9590ac8a84); test-fixture correction [d7067da](https://github.com/Reekyi/UpStatus/commit/d7067da0c5d88f9b1d04c679aa82994e949c5080).
- Shared adapter blob in both branches: `011abfb28d042afcfa4709abf40162a78ec7156c`.

The adapter now parses `Retry-After` in delta-seconds and HTTP-date forms, exposes `error.retryAfterMs` and `error.retryAfterSeconds` on non-2xx responses, and makes the polling loop wait for at least the server-provided delay (while retaining exponential backoff for errors without that header). Non-polling write operations are **not** automatically retried, to avoid duplicate non-idempotent actions; callers receive the retry metadata.

Regression coverage checks raw GM response-header strings, case-insensitive header names, HTTP-date conversion, and that a 429 with `Retry-After: 60` schedules the next poll after 60,000 ms. Static checks require both product bridges to preserve `responseHeaders`.

### Exact-head CI after the implementation

- **Normal #74**, HEAD `057645fc5196eaf4431389987e5cc4b346df3368`: Validate [42302293285](https://github.com/Reekyi/UpStatus/actions/runs/42302293285) passed. Smoke [42302293297](https://github.com/Reekyi/UpStatus/actions/runs/42302293297) is in progress; the static harness/unit-test step and unauthenticated endpoint checks have passed, while authenticated integration/browser, rate-limit concurrency, read-receipt concurrency, and final cleanup are not yet complete.
- **Team Lite #76**, HEAD `d7067da0c5d88f9b1d04c679aa82994e949c5080`: Candidate Checks [42302314056](https://github.com/Reekyi/UpStatus/actions/runs/42302314056) is queued behind the Normal run because both workflows share the isolated Supabase fixture project.
- The first Normal Smoke attempt [42302133868](https://github.com/Reekyi/UpStatus/actions/runs/42302133868) stopped in the new unit test because the fixture encoded CRLF characters twice. The fixture was corrected in `057645f` and `d7067da`; the subsequent Normal Validate and static/unit-test step passed.

Do not run cleanup or apply further isolated mutations while the shared CI queue is active. A post-queue SELECT-only zero-fixture check is still required.

### Fresh release-gate snapshot

- PR #74: open, Draft, unmerged; Validate passed and exact-head Smoke is still running.
- PR #75: open, Draft, unmerged; historical baseline CI only.
- PR #76: open, Draft, unmerged; exact-head Candidate Checks queued.
- PR #80: open, Draft; current HEAD `208e7d33b92fa97ee758e7a16940f392d80c9dc6`; Validate [42295672751](https://github.com/Reekyi/UpStatus/actions/runs/42295672751) still fails on inherited `client signed upload helper missing`.
- PR #82 (independent QA): open, Draft; current HEAD `76ceacbffa108ef88f4cf2ea1504dc34e61e8fa7`; Validate [42298090990](https://github.com/Reekyi/UpStatus/actions/runs/42298090990) still fails on inherited `production updateURL mismatch`. QA branch and report were not edited.
- Issue #78 remains 0/8 physical acceptance criteria. Issue #79 still shows 16/35 checklist items; this is not an overall completion percentage.

### Supabase snapshot, read-only at 2026-11-06 22:08 UTC

Production `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. The isolated project `bfpjtfqlnypisxljoxkb` is also `ACTIVE_HEALTHY`; its `upstatus-signal-test` is ACTIVE v32 and its isolated migration ledger includes `20261106210556_bounded_rate_limit_cleanup_isolated_test`.

Production Security Advisor still reports three SECURITY DEFINER broadcast functions executable by `anon` and the same three by `authenticated`, plus ten RLS-enabled/no-policy INFO notices. Production Performance and Health advisors returned no findings. Production still lacks the dedicated `upstatus-signal` endpoint, distributed rate-limit table/RPC, atomic read-receipt RPC, and call/voice-attempt structures. Public full-row Realtime broadcasts remain a release blocker.

The isolated test project is currently in use by the shared Normal/Team Lite CI queue. No post-run cleanup count is claimed.

No production SQL write, migration, Edge Function deployment, merge, release, secret/role/feature-flag change, userscript publication, or destructive operation occurred.

### Documentation commit follow-up

The Retry-After checkpoint above was added in commit `7da61fc1e49f34abdd81485ea977b4b81b417680`, which is now the current HEAD of PR #80. The referenced Validate result `42295672751` belongs to the preceding source head `208e7d3`; this documentation-only commit has not yet received a new Validate result. PR #74 likewise has a documentation-only matrix update at HEAD `afda7f521a8f822fad69a3429de3369d294d6f99`; the runtime tests still target its unchanged parent `057645fc`.


## 2026-11-06 — Team Lite Retry-After bundle correction

### Cause and narrow fix

Independent QA's exact-head Candidate Checks for Team Lite failed at the final candidate-source assertion:

- Prior Team Lite HEAD: `d7067da0c5d88f9b1d04c679aa82994e949c5080`.
- Failed run: [42302314056](https://github.com/Reekyi/UpStatus/actions/runs/42302314056).
- Failure: `Team Lite bundled adapter must match the shared tested source module` at `scripts/team-lite-candidate-check.mjs:249`.

Inspection confirmed that `src/userscript/signaling-transport.mjs` already parsed `Retry-After` (delta-seconds and HTTP-date) and made polling backoff respect the server's delay, but `team-lite/upstatus-team-lite.user.js` still embedded an older adapter. Its GM bridge preserved `responseHeaders`, but the adapter ignored them.

Replaced only the stale `createSignalingTransport` block in the Team Lite userscript with the exact shared module source after removing the module's `export` keyword. The adjacent voice/screen-share state and `screenShareSend` implementation were preserved.

- New commit on `team-lite/signaling-transport-candidate`: [`9f8596586f7fde9cc7f74efd9e969e49e78e3ca8`](https://github.com/Reekyi/UpStatus/commit/9f8596586f7fde9cc7f74efd9e969e49e78e3ca8).
- Bundle blob: `ae1db5268b053fb854d0e6baad74eea7cc1805cb`.
- Shared adapter blob: `011abfb28d042afcfa4709abf40162a78ec7156c`.
- Post-edit source check: bundled userscript contains the shared adapter byte-for-byte; Retry-After parser and polling backoff are present.

### Exact-head validation

- Normal #74 HEAD `afda7f521a8f822fad69a3429de3369d294d6f99`: Validate [42302685481](https://github.com/Reekyi/UpStatus/actions/runs/42302685481) and Signaling Smoke [42302685470](https://github.com/Reekyi/UpStatus/actions/runs/42302685470) both SUCCESS. Smoke job `128187319496` completed.
- Team Lite #76 new HEAD `9f8596586f7fde9cc7f74efd9e969e49e78e3ca8`: Candidate Checks [42308602405](https://github.com/Reekyi/UpStatus/actions/runs/42308602405) is IN_PROGRESS. Do not transfer the previous failing result or prior historical pass to this new head; await exact-head completion.
- The failed Team Lite run had already passed adapter unit tests, voice-room recovery, screen-share VM tests, unauthenticated endpoint checks, authenticated integration/browser tests, rate-limit concurrency, and atomic read-receipt concurrency before failing only the final bundle/source equality assertion.
- Baseline #75 remains `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, historical Candidate Checks pass.
- Documentation PR #80 HEAD `050cdb61b2be825db216d6de472ea605c14dc9cc`: Validate [42302725589](https://github.com/Reekyi/UpStatus/actions/runs/42302725589) fails on inherited `client signed upload helper missing`.
- Independent QA PR #82 HEAD `33405394b42f3633b351874cd8a46e77e623bcac`: Validate [42305456349](https://github.com/Reekyi/UpStatus/actions/runs/42305456349) fails on inherited `production updateURL mismatch`. QA source branch was not modified.
- All five PRs remain open and Draft; no formal human reviews are recorded.
- Issue #78 remains 0/8 physical acceptance criteria; issue #79 body remains 16/35 checked and is not an overall progress percentage.

### Supabase read-only revalidation

Production project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY (PostgreSQL 17.11.0.002), with seven migrations through `20261027155438` and 38 ACTIVE Edge Functions. SELECT-only catalog checks reconfirmed:

- Three trigger-only broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE effective for both `anon` and `authenticated`.
- Nine backend-owned public tables have RLS enabled, zero policies, and client SELECT grants; `realtime.messages` has RLS enabled, zero policies, and anon/authenticated SELECT/INSERT grants.
- Production still lacks the distributed rate-limit table/RPC, atomic read-receipt RPC, call/voice-attempt tables, and dedicated `upstatus-signal` function.
- Security Advisor: 3 WARN for anon EXECUTE, 3 WARN for authenticated EXECUTE, 10 INFO for RLS without policies. Performance and Health returned no findings.

The isolated project `bfpjtfqlnypisxljoxkb` was SELECT-only checked before the new Team Lite run and showed zero rows in the queried fixture tables (users, sessions, rooms, memberships, events, call/voice attempts, rate-limit buckets, messages, and chat reads). The new Candidate Checks run is now using that shared project; do not claim a post-run zero-fixture state until the workflow completes and a fresh read-only check is made.

The independent QA automation was left untouched. QA was informed of the Team Lite fix in a comment on PR #82; issue #79 also received a concise engineering checkpoint.

No production writes, migrations, deployments, merges, releases, secret/role/feature-flag changes, or userscript publication occurred.


## 2026-11-06 — exact-head CI closure, production security refresh, and deployment guard

### Live PR refs and exact-head CI

All five tracked PRs remain open, Draft, and unmerged. No submitted review records exist on #74, #75, #76, #80, or #82.

| PR | Exact HEAD | Base | Ahead / behind | Exact-head result |
|---|---|---|---:|---|
| #74 Normal | `afda7f521a8f822fad69a3429de3369d294d6f99` | `master` | 770 / 0 | Validate + Signaling Smoke PASS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | 59 / 0 | Historical Candidate Checks PASS |
| #76 Team Lite signaling | `9f8596586f7fde9cc7f74efd9e969e49e78e3ca8` | `team-lite-official` | 263 / 0 | Candidate Checks PASS |
| #80 Continuity | `7abf2a58135fb33554c3625900e544bffc6a0066` | `develop` | 166 / 0 | Validate reproduces inherited signed-upload assertion |
| #82 Independent QA | `fc50ac078a900ef6bf5d9885bf60dd44afcb31c3` | `master` | 76 / 0 | Validate reproduces inherited updateURL assertion |

Exact workflow evidence:
- Normal #74 Validate [42302685481](https://github.com/Reekyi/UpStatus/actions/runs/42302685481) and Signaling Smoke [42302685470](https://github.com/Reekyi/UpStatus/actions/runs/42302685470) both completed SUCCESS on the exact head. Smoke job [128187319496](https://github.com/Reekyi/UpStatus/actions/runs/42302685470/job/128187319496) passed 19/19 unauthenticated and 129/129 authenticated checks, Chromium call/voice/screen media delivery, three-member mesh, open voice-room late join across Normal/Team Lite aliases, voice-attempt recovery, 90+1 rate limit with Retry-After 60 seconds, concurrency, atomic read receipts, and cleanup.
- Team Lite #76 Candidate Checks [42308602405](https://github.com/Reekyi/UpStatus/actions/runs/42308602405) completed SUCCESS. Job [128204180146](https://github.com/Reekyi/UpStatus/actions/runs/42308602405/job/128204180146) passed 16/16 unauthenticated and 103/103 authenticated checks, browser call/voice/screen media, open voice-room late join/idempotency/owner handoff/capacity, rate limit 90+1 with Retry-After, atomic receipts, durable recovery, version 3.4.31, portals/updater, migration layout, and cleanup.
- #75 remains historical baseline evidence only; #76 is the current Team Lite release candidate.
- #80 Validate [42308797247](https://github.com/Reekyi/UpStatus/actions/runs/42308797247) fails at `client signed upload helper missing`, inherited from the `develop` baseline.
- #82 Validate [42313228043](https://github.com/Reekyi/UpStatus/actions/runs/42313228043) fails at `production updateURL mismatch`, inherited from the `master` baseline. Neither validator was weakened.

### Deployment workflow safety guard — candidate resolved, master not yet updated

PR #74's `.github/workflows/deploy-production.yml` now:
- allows only manual `workflow_dispatch` from `refs/heads/master`;
- checks the checked-out SHA equals `GITHUB_SHA`;
- requires `SUPABASE_PROJECT_ID=dlfvkawaiqduhlazsszm` and a non-empty access token;
- locks the stable release to version `3.4.7`;
- uses a pinned Supabase CLI version `2.122.1` and pinned setup action.

The existing `scripts/signaling-static.test.mjs` asserts these guards and the Normal Smoke log explicitly reports: “PASS production deploy ref, project, credential, release, and CLI-version guards”. This closes the earlier deployment-workflow inspection gap **on the #74 candidate branch only**. The base `master` workflow remains unchanged until an authorized merge; no deployment was run.

### Production Supabase — fresh read-only verification

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002), with seven migrations through `20261027155438` and 38 ACTIVE Edge Functions. Core versions remain Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, and legacy screen-share beta10 v6.

Production still has no:
- dedicated `upstatus-signal` Edge Function;
- `upstatus_signal_rate_limits` table or `consume_upstatus_signal_rate_limit` RPC;
- `merge_chat_read_receipts` RPC;
- voice-room open/leave RPCs.

Read-only catalog results reconfirm:
- all three broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE available to `anon` and `authenticated`;
- `upstatus_broadcast_messages()` serializes the complete OLD/NEW row and publishes it to the public topic with `private=false`;
- remote-state command/result metadata and user status metadata are also broadcast publicly;
- the nine backend-owned tables retain broad client grants including SELECT/INSERT/UPDATE/DELETE/TRUNCATE despite RLS enabled and zero policies;
- `realtime.messages` retains anon/authenticated SELECT/INSERT/UPDATE grants with RLS enabled and zero policies;
- default ACLs remain broad for postgres-owned public/storage objects and supabase_admin-owned public/graphql/graphql_public objects.

Security Advisor: 3 WARN for anon-executable SECURITY DEFINER functions, 3 WARN for authenticated, and 10 INFO for RLS without policies. Performance and Health advisors returned no findings. The 38-function inventory still reports `verify_jwt=false`; this does not establish missing application authentication, but route-by-route auth/ownership review remains open.

No production write, migration, deploy, role/secret/flag change, userscript publication, merge, or destructive action was performed.

### Isolated project after exact-head workflows

Project `bfpjtfqlnypisxljoxkb` remains `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.003`, with 28 migration records. `upstatus-signal-test` is ACTIVE v32 and `upstatus-signal-e2e-once` is ACTIVE v3.

A fresh SELECT-only post-run query returned zero prefixed users/sessions, rooms, memberships, bindings, events, call attempts, voice attempts, rate-limit buckets, and expired rate-limit buckets. No manual cleanup was performed.

### Remaining release gates

- Issue #78 remains OPEN with 0/8 physical acceptance criteria. Real Tampermonkey no-F5 recovery, browser termination/reload while offline, real microphone/display permissions, and installed Normal ↔ Team Lite acceptance remain MANUAL PENDING.
- Issue #79's body still reports 16/35 checked and is stale; that checklist count is not an overall progress percentage.
- The authenticated transport remains default-off. Production still uses legacy public Realtime by default; do not flip the flag until the dedicated endpoint, migrations, auth model, compatibility, and rollback are reviewed.
- Product-facing rate-limit integration and production receipt RPC are absent. The candidate server templates depend on the receipt RPC, so production deployment before the reviewed migration would break read receipts.
- Public broadcast payload minimization/cutover, ACL/default-ACL hardening, official TEST migration/rollback rehearsal, 38-function route auth inventory, human reviews, and scope decisions remain open.

Next safe engineering work is to finish the product-facing signaling endpoint/rate-limit cutover plan and validate its dependency order in official TEST, while keeping production untouched. Do not treat isolated CI as production approval.


## 2026-11-06 21:59 BRT — exact-head CI closure and authentication revalidation

### Current GitHub refs and exact-head CI

All five tracked PRs remain open, Draft, unmerged, and without submitted human reviews.

| PR | Exact HEAD | Base | Ahead / behind | Exact-head result |
|---|---|---|---:|---|
| #74 Normal | `afda7f521a8f822fad69a3429de3369d294d6f99` | master | 770 / 0 | Validate + Signaling Smoke PASS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 / 0 | Historical Candidate Checks PASS |
| #76 Team Lite signaling | `9f8596586f7fde9cc7f74efd9e969e49e78e3ca8` | team-lite-official | 263 / 0 | Candidate Checks PASS |
| #80 Continuity | `87d4164f14a1beffdb250432bb34dc29d8420bdd` | develop | 167 / 0 | Validate reproduces inherited signed-upload assertion |
| #82 Independent QA | `0e8543311035e782a6c0768fbabbc95e945487aa` | master | 77 / 0 | Validate reproduces inherited updateURL assertion |

Exact workflow evidence:
- Normal #74 Validate [42302685481](https://github.com/Reekyi/UpStatus/actions/runs/42302685481) and Signaling Smoke [42302685470](https://github.com/Reekyi/UpStatus/actions/runs/42302685470) completed SUCCESS on the exact head. Job [128187319496](https://github.com/Reekyi/UpStatus/actions/runs/42302685470/job/128187319496) passed 19/19 unauthenticated and 129/129 authenticated checks, Chromium call/voice/screen media, three-member mesh, voice-room late join across product aliases, retry/recovery, rate limit 90 accepted + 1 HTTP 429 with `Retry-After: 60`, rate-limit concurrency, atomic read-receipt concurrency, and fixture cleanup.
- Team Lite #76 Candidate Checks [42308602405](https://github.com/Reekyi/UpStatus/actions/runs/42308602405) completed SUCCESS on the exact head. Job [128204180146](https://github.com/Reekyi/UpStatus/actions/runs/42308602405/job/128204180146) passed 16/16 unauthenticated and 103/103 authenticated checks, browser call/voice/screen media, three-member mesh, open voice-room late join/idempotency/owner handoff/capacity, rate limit 90+1 with Retry-After, atomic receipts, recovery, migration layout, version/portal/updater checks, and cleanup.
- #75 remains historical baseline evidence only; #76 is the current Team Lite candidate.
- #80 Validate [42316184960](https://github.com/Reekyi/UpStatus/actions/runs/42316184960) fails at `client signed upload helper missing` on the inherited develop baseline.
- #82 Validate [42319252988](https://github.com/Reekyi/UpStatus/actions/runs/42319252988) fails at `production updateURL mismatch` on the master-based QA branch. The QA branch was not modified by engineering.

### Authentication findings — source inspection, not exploit reproduction

Fresh read-only source inspection confirms:
- Production Normal `upstatus` v480 and Team Lite `upstatus-team-lite` v15 still contain the name-based initial-role fallback for Ricardo/Lohan/Guilherme.
- Both candidate templates now default missing roles to `implementation_user`; this removes the name-based admin escalation from those candidate templates.
- **Residual setup claimability remains in both candidate templates:** public `POST /api/setup` accepts any existing account with an empty `password_hash`, sets a caller-supplied password, and creates a session. The role fallback is no longer admin-by-name, but an uninitialized account can still be claimed by its first caller. A controlled one-time enrollment proof or trusted provisioning path is required before onboarding accounts through this route.
- Public `GET /api/account?name=...` reveals whether an account needs setup. Treat this as an account-enumeration surface; return a generic response or protect it as part of the enrollment design.
- Neither candidate login/setup handler contains a distributed auth-specific throttle. The signaling quota does not protect `/api/login` or `/api/setup`.
- Password minimum remains divergent: Normal 6 characters; Team Lite 4. Do not silently change Team Lite policy without a compatibility/migration plan.

Production account snapshot (read-only): 5 rows in `public.users`, 0 uninitialized accounts, 0 NULL roles. This reduces immediate exposure for current rows but does not close the future onboarding risk.

### Production and isolated Supabase snapshot

Production `dlfvkawaiqduhlazsszm`:
- ACTIVE_HEALTHY; PostgreSQL 17.11.0.002; seven migrations through `20261027155438`; 38 ACTIVE Edge Functions.
- 38/38 functions report `verify_jwt=false`; 37 non-empty sources use custom UpStatus session/token checks, and one ACTIVE backup `upstatus-backup-327-pre328` has an empty `index.ts`. It was not invoked, changed, or disabled.
- Production has neither `upstatus_auth_rate_limits` / `consume_upstatus_auth_rate_limit` nor `upstatus_signal_rate_limits` / `consume_upstatus_signal_rate_limit`.
- The deployed core login/setup routes still lack auth-specific throttling. Production Normal and Team Lite retain the name-based role fallback.
- Security Advisor observed at 2026-11-07 01:00 UTC: 3 WARN for anon-executable SECURITY DEFINER broadcast functions, 3 WARN for authenticated, and 10 INFO for RLS-enabled tables without policies. Performance and Health advisors returned no findings.
- The three public broadcast functions and public full-row message payload remain release blockers. The public Realtime topic is still the default legacy path.

Isolated `bfpjtfqlnypisxljoxkb`:
- ACTIVE_HEALTHY; PostgreSQL 17.11.0.003; 28 migration records through `20261106210556`; `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3.
- SELECT-only post-CI query returned zero reserved-prefix rows in users, sessions, rooms, memberships, events, call attempts, voice attempts, rate-limit buckets, chat reads, and messages.
- No cleanup was performed manually.

### Required next gates

1. Design and implement an explicit one-time enrollment proof for `/api/setup`; do not accept caller-chosen passwords for arbitrary uninitialized account rows.
2. Add distributed, fail-closed, auth-specific throttling for login and setup, with bounded 429/Retry-After, concurrency tests, and recovery behavior. Establish trusted client-IP semantics before relying on IP buckets; do not trust arbitrary forwarded headers without verifying gateway behavior.
3. Decide and document the password policy for Team Lite versus Normal; preserve compatibility deliberately.
4. Remove the name-based admin fallback from the deployed endpoint set through a reviewed cutover; map consumers of historical ACTIVE functions before retirement.
5. Continue RT-01 public Realtime and ACL/default-privilege hardening, official TEST migration/rollback, physical #78 acceptance, and human PR reviews.

No production or isolated SQL writes, migrations, function deployments, secret/role/flag changes, userscript publication, PR merge, release, or destructive operations occurred in this revalidation. All Supabase SQL was SELECT-only. No runtime code was changed in this checkpoint.


### Documentation validation follow-up — 2026-11-06 22:01 BRT

The new documentation-only commit `debbf1d80bc9cc93f97557ba600b69d610f57610` triggered Validate [42321805816](https://github.com/Reekyi/UpStatus/actions/runs/42321805816). It reproduces the same inherited `client signed upload helper missing` failure in `scripts/validate.mjs`; no new documentation regression was identified. Do not weaken the validator. PR #80 remains Draft and the baseline mismatch requires a separate source-level reconciliation with `develop`.

## Engineering checkpoint — 2026-11-07 02:15 UTC (23:15 BRT)

### AUTH-03 candidate implementation

The first-access claimability issue is now addressed in the two candidate branches, not in production.

- Normal #74 head: `9d7977949a0afe7d0e9db770c1bb7b14bc5aefb5`.
- Team Lite #76 head: `58a3f7b04233733fb4a5bd198ad9e7c02151f2c3`.
- Both templates add authenticated admin-only `POST /api/setup-invite`, generate a 256-bit random token, store only SHA-256, and expire it after 15 minutes.
- `POST /api/setup` now calls `consume_upstatus_setup_invite`; the RPC atomically sets the password and clears the token metadata, so only one concurrent request can win.
- The RPC is SECURITY INVOKER, pins an empty search_path, and grants EXECUTE only to service_role.
- Public `GET /api/account?name=...` returns a generic `needsSetup:false`; the new clients use an optional token field and no longer query account setup state. Raw tokens are not stored in GM storage/sessionStorage.
- Normal keeps its 6-character minimum; Team Lite keeps 4 pending a deliberate compatibility decision. A dedicated distributed auth rate limiter is not included yet.

### Isolated database evidence

Migration `20261107010000_setup_invites.sql` was applied only to `bfpjtfqlnypisxljoxkb`, recorded as `20261107020949_upstatus_setup_invites_isolated_test`. The catalog assertion passed: columns/index exist, function is SECURITY INVOKER with pinned search_path, service_role can execute, anon/authenticated cannot.

The integration script `scripts/test-auth-enrollment.mjs` is now wired into both candidate workflows to test two concurrent consumers (exactly one winner), role fallback, token clearing, and expiry. It has not yet reported a completed CI result in this checkpoint.

### Exact-head CI

- Normal Validate [42327981889](https://github.com/Reekyi/UpStatus/actions/runs/42327981889): SUCCESS on #74 head above.
- Normal Signaling Smoke [42327981844](https://github.com/Reekyi/UpStatus/actions/runs/42327981844): pending in the shared isolated-project queue.
- Team Lite Candidate Checks [42327988659](https://github.com/Reekyi/UpStatus/actions/runs/42327988659): pending in the same queue.
- #75 remains historical baseline PASS at `7bbf9b90`.
- #80 head `7d615617` still fails inherited Validate [42321866840](https://github.com/Reekyi/UpStatus/actions/runs/42321866840) at `client signed upload helper missing`.
- #82 QA head `c6d67417` still fails inherited Validate [42324832647](https://github.com/Reekyi/UpStatus/actions/runs/42324832647) at `production updateURL mismatch`. QA branch was not edited.

The first two Normal validation attempts exposed test-maintenance mistakes: a malformed static regex, then an old assertion that expected the previous setup implementation. Both were corrected; the latest exact-head Validate passed. Do not use the failed intermediate runs as current status.

### Remaining auth and release gates

- Complete the exact-head Normal Smoke and Team Lite Candidate Checks, then verify zero reserved-prefix fixtures after the shared queue drains.
- The admin invite route currently has no dedicated UI; a controlled internal API client is required to issue a token.
- Distributed, fail-closed auth rate limiting for login/setup remains absent in both products and both Supabase projects.
- Production Normal v480 and Team Lite v15 still contain name-based admin fallback and public first-caller setup. Production has 5 accounts, 0 uninitialized password hashes, 0 missing roles, 3 admin roles; this is a read-only snapshot, not proof that future onboarding is safe.
- Production has no setup-invite columns/RPC, no auth or signaling rate-limit table/RPC, and still has the public Realtime and SECURITY DEFINER broadcast blockers.
- Password minima remain divergent (6 Normal / 4 Team Lite). Physical #78 acceptance and human PR reviews remain pending.

No production SQL write, migration, Edge Function deployment, secret/role/flag change, userscript publication, PR merge, release, or destructive operation occurred. The only database mutation was the additive setup-invite migration on the allowlisted isolated project. The isolated integration workflow is the next validation gate.

### Head reconciliation — 2026-11-07 02:15 UTC

- PR #74 current head is now `2ff1881dd91f387c708eabd02620db0f20d1d759`. Its runtime/auth implementation head remains `9d7977949a0afe7d0e9db770c1bb7b14bc5aefb5`; the later commits are documentation-only. Latest Validate [42328111083](https://github.com/Reekyi/UpStatus/actions/runs/42328111083) passed; latest Smoke [42328111146](https://github.com/Reekyi/UpStatus/actions/runs/42328111146) is pending in the shared queue.
- PR #76 current head remains `58a3f7b04233733fb4a5bd198ad9e7c02151f2c3`; Candidate Checks [42327988659](https://github.com/Reekyi/UpStatus/actions/runs/42327988659) is pending.
- PR #80 head before this documentation append was `f5fe9faa56710d3d38ad6ac1f73963fed9d6b60e`; Validate [42328117245](https://github.com/Reekyi/UpStatus/actions/runs/42328117245) reproduces the same inherited `client signed upload helper missing` assertion. This append is documentation-only.
- PR #82 QA remains at `c6d674176140f17b8bd76eeba9e7b05853101b59`; Validate [42324832647](https://github.com/Reekyi/UpStatus/actions/runs/42324832647) remains blocked by `production updateURL mismatch`. The QA branch itself was not edited.
- All five PRs remain open and Draft; the latest review query returned zero submitted reviews.


### Live engineering reconciliation — 2026-11-07 03:10 UTC

This section supersedes earlier handoff snapshots where the same PR/branch/runtime fields differ. Re-check live state before any future action.

#### Current PR heads and exact-head checks

- **#74 Normal:** head `7a8c407bbbcf4c21624981708576930f284caf2d`, open Draft. Validate [42332394502](https://github.com/Reekyi/UpStatus/actions/runs/42332394502) passed on this exact head. Signaling Smoke [42332394510](https://github.com/Reekyi/UpStatus/actions/runs/42332394510) is pending and has no jobs yet.
- **#75 Team Lite baseline:** head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, open Draft. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) is historical baseline evidence, not validation of #76.
- **#76 Team Lite candidate:** head `c87e4daa9e966980d08a03f3ea5c014ae2f0fca1`, open Draft. Candidate Checks [42332429169](https://github.com/Reekyi/UpStatus/actions/runs/42332429169) is pending with no jobs yet.
- **#80 continuity:** head `093792fa73c970d18dbf9577efa72f95d095c376`, open Draft. Validate [42328274083](https://github.com/Reekyi/UpStatus/actions/runs/42328274083) still fails at the inherited `client signed upload helper missing` assertion.
- **#82 QA:** head `4465d5fdba2f29f63fb7f1e452c998e042b0f9b8`, open Draft. Validate [42330121968](https://github.com/Reekyi/UpStatus/actions/runs/42330121968) still fails at `production updateURL mismatch`.
- Current review query returned no submitted human reviews. Keep all five PRs Draft.

#### AUTH-03 follow-up: legacy empty password rows

QA identified that both `issueSetupInvite` handlers used `.is("password_hash", null)`, while the atomic consumer already accepted both NULL and empty-string hashes. This prevented legacy rows stored as `''` from receiving an invite.

The candidate fix is now present in both products:
- Normal server filter: [44303b1](https://github.com/Reekyi/UpStatus/commit/44303b19b9d7222cec50b5ddbf53bc9629df290a).
- Normal static regression: [90f0a2a](https://github.com/Reekyi/UpStatus/commit/90f0a2a558ec04dcbed6931c5e81debb4c114dae).
- Normal isolated integration test expansion: [7a8c407](https://github.com/Reekyi/UpStatus/commit/7a8c407bbbcf4c21624981708576930f284caf2d).
- Team Lite server filter: [d181042](https://github.com/Reekyi/UpStatus/commit/d181042cc27feb36ee1a8549a113b28ca917a019).
- Team Lite static regression: [c2072e6](https://github.com/Reekyi/UpStatus/commit/c2072e6cad87a5ba292b3bfbc7492f86a7d9ca08).
- Team Lite isolated integration test expansion: [c87e4da](https://github.com/Reekyi/UpStatus/commit/c87e4daa9e966980d08a03f3ea5c014ae2f0fca1).

The integration harness now covers NULL and empty-string issuance, configured-account denial, malformed/wrong/expired/replayed token rejection, one-winner concurrent consumption, non-admin role fallback, token metadata clearing, and cleanup. It has **not** completed against the isolated database yet. Actual HTTP-route tests for admin issuance/non-admin denial remain open.

#### Supabase snapshots

Production `dlfvkawaiqduhlazsszm` was checked read-only:
- `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, 7 migration records, 38 ACTIVE Edge Functions.
- `public.users` has 5 rows, 0 NULL/empty password hashes, and 0 NULL roles.
- No `setup_token_*` columns, no `upstatus_signal_rooms`, no `upstatus_signal_rate_limits`, and no dedicated `upstatus-signal` function.
- Security Advisor: 3 SECURITY DEFINER warnings for `anon`, 3 for `authenticated`, and 10 RLS-enabled/no-policy INFO findings. Performance and Health advisors returned no findings.
- Public message/remote-state/user broadcast functions and the full-row public message broadcast remain unresolved. No production change was made.

Isolated `bfpjtfqlnypisxljoxkb`:
- `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 29 migration records through `20261107020949_upstatus_setup_invites_isolated_test`.
- `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3.
- Latest SELECT-only fixture snapshot at approximately 2026-11-07 03:06:57 UTC: 4 test users, 4 sessions, 2 rooms, 4 memberships, 1 event, 0 call attempts, 0 voice attempts, 0 chat read receipts, and 6 rate-limit buckets. Counts changed between reads. The actor/workflow owning these fixtures is not attributed.
- Do not run or clean fixture-mutating tests until the owner finishes and a fresh SELECT-only snapshot confirms the project is clear. The two latest candidate workflows are pending with no jobs.

#### Remaining release gates

1. Complete exact-head Normal Smoke and Team Lite Candidate Checks, then verify isolated fixture cleanup.
2. Add actual HTTP-route tests for admin invite issuance, non-admin denial, setup token handling, and no raw-token leakage.
3. Add distributed fail-closed login/setup rate limiting with concurrency, 429/Retry-After, recovery, and trusted client-origin semantics.
4. Resolve Normal 6-character vs Team Lite 4-character password compatibility deliberately.
5. Validate migration/cutover/rollback in official TEST before any production authorization request.
6. Replace public Realtime full-row broadcasts with an authenticated/server-mediated design; do not flip private Realtime without a trusted Supabase Auth JWT or tested replacement.
7. Complete physical #78 acceptance (all 8 criteria remain unchecked), obtain human reviews, and resolve the inherited #80/#82 validator mismatches without weakening validation.

Latest coordination comments: [Issue #79](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6701433511) and [QA PR #82](https://github.com/Reekyi/UpStatus/pull/82#issuecomment-6701433866).

No production SQL write, migration, function deployment, secret/role/flag change, userscript publication, PR merge, release, or destructive operation was performed in this checkpoint. The only database migration remains the additive AUTH-03 candidate migration on the allowlisted isolated project.


### Engineering checkpoint — 2026-11-07 04:02 UTC

This section supersedes earlier AUTH-03 and candidate-head snapshots above.

#### Exact current candidate heads

- **Normal PR #74:** branch `chore/continuity-foundation`, head `4c0eb56bc218729da52891daed39afe31f6b3307`, open Draft. The preceding implementation commit `8f94b5a1ca29188fc4a65aae4595d4e8ae3e067d` changes the Normal login validator to accept four characters for existing shared-store logins while retaining six characters for new first-access setup. Static regression commit `4c0eb56` verifies the policy using string-based extraction.
  - Validate [42336501535](https://github.com/Reekyi/UpStatus/actions/runs/42336501535) passed on the exact head.
  - Signaling Smoke [42336501795](https://github.com/Reekyi/UpStatus/actions/runs/42336501795) is currently in authenticated isolated integration/browser testing.
- **Team Lite PR #76:** branch `team-lite/signaling-transport-candidate`, head `87ede473bd9baefe96d9388ed1508f3d52d54679`, open Draft. Server commit `017f0c9` makes the four-character minimum explicit for both login and setup; static regression commit `87ede47` verifies it. Candidate Checks [42336506037](https://github.com/Reekyi/UpStatus/actions/runs/42336506037) is pending.
- **Team Lite baseline PR #75:** head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, open Draft; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- **Continuity PR #80:** head `a3e2d94ff667bc30c27a3fc8773f5ca5903a7258`; Validate [42332548026](https://github.com/Reekyi/UpStatus/actions/runs/42332548026) fails at the inherited `client signed upload helper missing` assertion.
- **Independent QA PR #82:** head `f260899a8671e76f424fa85868c39f90b9b5d724`; Validate [42334935903](https://github.com/Reekyi/UpStatus/actions/runs/42334935903) fails at the inherited `production updateURL mismatch` assertion.
- All five PRs remain open and Draft; latest review query returned zero submitted human reviews.

The first password-policy test commit on each engineering branch used an over-escaped regular expression and failed before any database mutation (Normal runs `42336445374` / `42336445356`; Team Lite run `42336440931`). The assertion was replaced with direct source-string extraction. The exact current Normal Validate passes; the current Smoke and Team Lite workflow are not yet complete.

#### Shared-account password compatibility decision (candidate only)

- Normal first-access setup remains minimum 6 characters.
- Team Lite first-access setup remains minimum 4 characters for backward compatibility.
- Both products accept minimum 4 characters on existing-account login. This allows a 4–5-character Team Lite account to authenticate in Normal because both products share `public.users`; it does not allow Normal to create a new 4–5-character password.
- This is a candidate behavior change only. Production functions remain unchanged.

#### AUTH-03 exact-head integration evidence

Before the password-policy follow-up, Normal head `7a8c407` passed Validate [42332394502](https://github.com/Reekyi/UpStatus/actions/runs/42332394502) and Smoke [42332394510](https://github.com/Reekyi/UpStatus/actions/runs/42332394510). Team Lite head `c87e4da` passed Candidate Checks [42332429169](https://github.com/Reekyi/UpStatus/actions/runs/42332429169). Both job logs explicitly report the isolated setup-enrollment integration passing: NULL/empty eligibility, configured-account denial, malformed/wrong/expired/replayed tokens, exactly one winner under concurrent consumption, non-admin role fallback, metadata clearing, and fixture cleanup.

**Remaining AUTH-03 test gap:** `scripts/test-auth-enrollment.mjs` creates fixtures and writes invite metadata directly through PostgREST using the service-role key, then exercises the atomic RPC. It does not invoke the actual `POST /api/setup-invite` HTTP route. Therefore it does not yet prove runtime admin-session enforcement, non-admin denial, one-time raw-token response handling, or absence of raw-token logging. The static test checks the source shape, but HTTP-route coverage remains required.

#### Supabase snapshots

Production `dlfvkawaiqduhlazsszm` was rechecked read-only:
- `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, 38 ACTIVE Edge Functions.
- Normal `upstatus` v480, Normal legacy client endpoint `upstatus-screen-share-3-1-1-beta10` v6, and Team Lite `upstatus-team-lite` v15 remain deployed.
- Current deployed sources for all three still contain the legacy public first-caller `POST /api/setup`, account-state disclosure in `GET /api/account?name=...`, and name-based admin fallback. Production `public.users` aggregate: 5 accounts, 0 NULL/empty password hashes, 0 missing roles.
- Production has no setup-token columns/RPC, auth rate-limit table/RPC, signaling rate-limit table/RPC, or dedicated `upstatus-signal` function.
- Security Advisor still reports 3 SECURITY DEFINER warnings for `anon`, 3 for `authenticated`, and 10 RLS-enabled/no-policy INFO findings. Performance and Health advisors returned no findings.
- Full-row public chat broadcast, public remote-state/user metadata broadcasts, and broad trigger-function/table grants remain release blockers.

Isolated `bfpjtfqlnypisxljoxkb`:
- `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 29 migration records through `20261107020949_upstatus_setup_invites_isolated_test`; signaling test endpoint v32 and E2E helper v3.
- A SELECT-only snapshot after the previous completed integration workflows and before the current Normal Smoke began showed zero reserved-prefix test users, sessions, rooms, memberships, events, call attempts, voice attempts, rate-limit buckets, and read receipts.
- The current Normal Smoke is now exercising the isolated project. Do not query or mutate fixture state until it finishes; then take a fresh SELECT-only snapshot before another fixture-mutating run.

#### Auth rate-limit design constraint

Supabase documentation describes `Sb-Forwarded-For` for Supabase Auth rate limiting only when IP forwarding is explicitly enabled and a supported `sb_secret` key is used. That documentation does not establish a trusted client-IP header contract for this custom UpStatus Edge Function/password store. Do not trust `X-Forwarded-For` or `CF-Connecting-IP` in the custom login route without gateway provenance evidence. Distributed fail-closed login/setup throttling remains open.

#### Manual and release gates

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open with all 8 physical acceptance criteria unchecked.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) remains open; its body is a stale 2026-11-03 snapshot and must not be used as the current state.
- Actual HTTP tests for setup-invite issuance/non-admin denial, distributed auth rate limiting, official TEST cutover/rollback, public Realtime replacement, physical Tampermonkey/network recovery, and human reviews remain pending.

No production SQL write, migration, function deployment, secret/role/flag change, userscript publication, PR merge, release, or destructive operation occurred in this checkpoint. Candidate-only commits were added to #74 and #76; the only database changes remain the previously validated additive AUTH-03 migration in the allowlisted isolated project.


### Additional release blockers found — 2026-11-07 04:04 UTC

#### No dedicated official TEST Supabase project

A fresh `list_projects` inventory returned exactly two projects in the organization:
- Production `dlfvkawaiqduhlazsszm` / `UpStatus`.
- Isolated security-test `bfpjtfqlnypisxljoxkb` / `upstatus-security-test`.

There is **no separate official TEST Supabase project**. The `upstatus-test` Edge Function (v281) is deployed inside the production project and shares its database; its name does not make it isolated. Do not apply candidate migrations or run fixture-mutating release tests against that function/project. The security-test project is currently the isolated candidate-validation target, not an explicitly designated official TEST cutover environment. The cutover plan's "official TEST first" gate is blocked until a separate TEST project is provisioned/approved or Ricardo explicitly designates a safe target.

#### Plaintext password persistence in both userscripts

A source inspection found:
- Normal reads saved passwords from Tampermonkey GM storage and writes the raw password with `GM_setValue(passwordKey(name), password)` after login.
- Team Lite reads and writes the raw password through `sessionStorage`.
- Neither candidate has a matching `GM_deleteValue` / `sessionStorage.removeItem` cleanup for these password entries.
- The first-access token is not persisted by either client; it is read from the input and sent only in the setup request.

This is a separate credential-at-rest risk: passwords are retained in plaintext browser storage. It was not changed in this run because removing the convenience auto-fill and clearing existing saved values is a user-visible behavior/security decision. Add a release gate to decide whether to remove password persistence (recommended default), clear legacy saved entries on upgrade, and require re-entry. Do not treat the password input's `type=password` as protection for stored values.

#### Password compatibility client check

A static inspection of both login UIs found no client-side minimum-length check; the new server-side minimum policy is not blocked by a second hard-coded client validator. This is source inspection only; exact-head CI remains the validation gate.


### Engineering checkpoint — 2026-11-07 05:05 UTC

#### Candidate credential-storage hardening

- **Normal #74** exact candidate HEAD: `e07293b802129ba347b6ef8116c29af77a27931c`.
  - Removed password read/write through Tampermonkey GM storage.
  - Added `GM_listValues` / `GM_deleteValue` grants and startup deletion limited to keys beginning with the rendered UpStatus storage prefix plus `password_`.
  - Successful login/setup clears both password and one-time-token inputs.
  - Static assertions were added to `scripts/auth-enrollment.test.mjs`.
- **Team Lite #76** exact candidate HEAD: `c81af34bcee6acb5776f3f60ae42fd7e7587075a`.
  - Removed password read/write through `sessionStorage`; startup deletes only keys beginning with `upstatus_team_lite_password_`.
  - Successful login/setup clears both inputs.
  - Review found the candidate bundle lacked the `var key='upstatus_team_lite_'` declaration present in `team-lite-official`; restored it before first use and added a static regression assertion.
- This removes password auto-fill in the candidates. Existing deployed scripts are unchanged; no production publication occurred.

#### Exact-head CI

- Normal Validate [42340871331](https://github.com/Reekyi/UpStatus/actions/runs/42340871331): PASS.
- Normal Signaling Smoke [42340871398](https://github.com/Reekyi/UpStatus/actions/runs/42340871398): pending; no jobs created at the last check.
- Team Lite Candidate Checks [42340875756](https://github.com/Reekyi/UpStatus/actions/runs/42340875756): pending; no jobs created at the last check.
- The previous exact-head results do not certify these new commits. Wait for the two current workflows.

#### Current production snapshot — SELECT/catalog only

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. Deployed versions remain Normal `upstatus` v480, legacy Normal `upstatus-screen-share-3-1-1-beta10` v6, Team Lite v15, and `upstatus-test` v281 inside the production project.

Catalog query confirmed: no setup-invite columns/RPC, no signaling rate-limit table, and no voice-attempt table. Aggregate `public.users`: 5 rows, 0 NULL/empty password hashes, 0 missing roles. Security Advisor at 05:01 UTC: 3 anon + 3 authenticated SECURITY DEFINER WARNs and 10 RLS/no-policy INFO; Performance and Health have no findings.

#### Remaining release gates

- Actual HTTP tests for admin setup-invite issuance/non-admin denial and raw-token/log handling.
- Distributed fail-closed login/setup rate limiting and trusted client-origin contract.
- Official TEST project remains absent; production's `upstatus-test` is not isolated.
- Public Realtime full-row broadcasts and broad table/function grants remain unresolved.
- Physical Issue #78 acceptance remains 0/8; no real Tampermonkey/network-loss/no-F5 acceptance was performed in this run.
- PR #80 still fails its inherited `client signed upload helper missing` validator; PR #82 still fails `production updateURL mismatch`. Do not weaken either validator.
- All five tracked PRs remain open Draft with zero submitted human approvals.

No production SQL write, migration, function deployment, secret/role/flag change, userscript publication, merge, release, or destructive operation occurred in this checkpoint.


### Follow-up checkpoint — 2026-11-07 05:08 UTC

The preceding 05:05 checkpoint's candidate SHAs are superseded by these exact heads:

- Normal #74: `7a17b8de29495d1344ef8b0b71b3785e22f90774`.
- Team Lite #76: `36c8c62846c912440eb1f73858aac76ba433e8ef`.

Both `scripts/auth-enrollment.test.mjs` files now execute `clearLegacyPasswordStorage()` in a Node VM with stub storage and assert that only the matching product-prefixed password keys are deleted. This is a pure local test; it does not access Supabase.

Exact-head CI as of 05:08 UTC:
- Normal Validate [42341111073](https://github.com/Reekyi/UpStatus/actions/runs/42341111073): PASS.
- Normal Signaling Smoke [42341111066](https://github.com/Reekyi/UpStatus/actions/runs/42341111066): pending, no jobs created.
- Team Lite Candidate Checks [42341115265](https://github.com/Reekyi/UpStatus/actions/runs/42341115265): pending, no jobs created.

The Team Lite candidate's missing `key` declaration was restored as `var key='upstatus_team_lite_'` before any storage access. The new test asserts that declaration. No physical Tampermonkey test has been performed; Issue #78 remains 0/8.


## 2026-11-07 04:05 BRT — live engineering checkpoint

This entry supersedes earlier SHA/status snapshots above. Re-fetched GitHub PR refs, exact-head workflow runs, review submissions, production Supabase metadata/catalog, and the current isolated-test queue before recording it.

### Exact PR refs and CI

| PR | Branch / base | Exact head | Ahead / behind | Current state |
|---|---|---|---:|---|
| #74 Normal | `chore/continuity-foundation` → `master` | `edd7574af6714ece71910d0153af71ad569eee23` | 818 / 0 | Open, Draft |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` → `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 | Open, Draft |
| #76 Team Lite signaling | `team-lite/signaling-transport-candidate` → `team-lite-official` | `c6b74ee39a4246f3af85e112fbb4f08986b445ae` | 298 / 0 | Open, Draft |
| #80 continuity | `docs/continuity-handoff-2026-11-04` → `develop` | `4f689fd30d90f0299fddc2b00aec7794cec59eeb` | 176 / 0 | Open, Draft |
| #82 independent QA | `qa/release-readiness-2026-11-04-master` → `master` | `1693410699346c988976c679f3ad8b1be00a5d28` | 85 / 0 | Open, Draft |

No submitted human reviews were found on any of the five PRs.

- #74 exact-head Validate [42346234567](https://github.com/Reekyi/UpStatus/actions/runs/42346234567): SUCCESS.
- #74 exact-head Signaling Smoke [42346234562](https://github.com/Reekyi/UpStatus/actions/runs/42346234562): SUCCESS.
- #75 historical baseline Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS; this does not replace current #76 validation.
- #76 Candidate Checks [42346239383](https://github.com/Reekyi/UpStatus/actions/runs/42346239383), attempt 1: FAILURE. The unauthenticated endpoint matrix reached 15/16; one POST to `/room/request-invite` timed out at the harness's 20-second deadline. The isolated endpoint's source performs the no-token check before body parsing or database access, so the timeout is consistent with a gateway/cold-start transient rather than the route's expected auth path. The same run's later authenticated integration/browser suite completed 129/129 checks, WebRTC call/voice/screen, rate-limit and receipt concurrency, setup-invite atomic consumption and cleanup.
- Reran only failed jobs for #76 (attempt 2). At this checkpoint the isolation guard, adapter, AUTH-03 static contract, durable voice-room recovery, screen-share recovery, and unauthenticated endpoint-authentication step all passed; authenticated integration/browser is still running. Do not claim #76 green until the complete rerun and post-run cleanup verification finish.
- #80 Validate [42341198223](https://github.com/Reekyi/UpStatus/actions/runs/42341198223) reproduces the inherited `client signed upload helper missing` assertion from `develop`.
- #82 Validate [42347949781](https://github.com/Reekyi/UpStatus/actions/runs/42347949781) reproduces the inherited `production updateURL mismatch` assertion from `master`.
- Neither validator was weakened. All five PRs remain Draft and unmerged.

### AUTH-03 candidate status

The current Normal/Team Lite candidate trees include the one-time setup-invite flow and literal role-preservation fix:

- 256-bit one-time token; only SHA-256 stored; 15-minute expiry.
- `POST /api/setup-invite` checks the authenticated administrator and only targets an existing row with NULL/empty password.
- `POST /api/setup` consumes the service-role-only SECURITY INVOKER RPC atomically.
- NULL, empty and ASCII-whitespace-only roles become `implementation_user`; non-empty roles are preserved literally. In particular, `" implementation_admin "` must remain invalid and must not be canonicalized into admin.
- Existing Team Lite 4-character passwords remain usable in Normal login; Normal setup still requires 6 characters.
- Plaintext password persistence was removed from both candidate userscripts; legacy namespaced password values are purged and session tokens/preferences are preserved.

The #76 rerun still needs to finish its database/browser stages. HTTP-level tests for the real admin invite route (admin session, non-admin denial, token response/log handling) and a rate limiter for login/setup remain incomplete.

### Supabase production — read-only

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, with 7 migrations and 38 ACTIVE Edge Functions. Relevant deployed versions: Normal `upstatus` v480, `upstatus-test` v281 (same production project/database, not isolation), Team Lite v15, legacy Normal screen-share beta10 v6.

Catalog and source reads confirm:

- No setup-invite columns/RPC, auth rate-limit table/RPC, distributed signaling rate-limit table/RPC, voice-attempt table, atomic read-receipt RPC, or dedicated `upstatus-signal` function is installed in production.
- The three broadcast trigger functions remain SECURITY DEFINER with `search_path=public`; both `anon` and `authenticated` can EXECUTE them.
- The message trigger serializes the complete OLD/NEW row with `to_jsonb` and sends it to the shared Realtime topic with `private=false`. Remote-state and user-status triggers also publish metadata to the same public topic.
- Each of nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) still grants anon/authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE. `realtime.messages` still grants SELECT/INSERT/UPDATE to both roles. RLS/no-policy does not constrain TRUNCATE.
- Default ACLs remain broad: postgres defaults in public/storage and supabase_admin defaults in public/graphql/graphql_public grant anon/authenticated table, sequence and function privileges. The candidate postgres-only default-ACL migration does not address supabase_admin ownership; that needs a supported administrative path, not an assumed postgres migration.
- Security Advisor: 3 SECURITY DEFINER WARN for anon, 3 for authenticated, 10 RLS/no-policy INFO. Performance and Health advisors returned no findings.

Production account aggregate remains 5 users, 0 NULL/empty password hashes, 0 missing roles. Deployed Normal v480, Team Lite v15 and legacy v6 still expose public `GET /api/account?name=...` setup-state and `POST /api/setup`; the name-based admin fallback remains in deployed sources. Candidate AUTH-03 is not a production fix until an approved cutover.

### Isolated project

Project `bfpjtfqlnypisxljoxkb` is the only isolated Supabase project found; the last pre-rerun SELECT-only snapshot returned zero reserved test fixtures. The #76 attempt-2 workflow is currently using it. Do not run another fixture-mutating suite or manual cleanup until the workflow completes; then perform a SELECT-only zero-count check.

### Remaining release gates

- Issue #78 remains 0/8 physical acceptance criteria. Real Tampermonkey offline/reload/no-F5, real microphone/display permissions, and installed Normal ↔ Team Lite acceptance have not been performed by automation.
- RT-01 public Realtime disclosure, ACL/default-ACL remediation, auth rate limiting, official TEST project/rehearsal, route-by-route 38-function auth inventory, HTTP admin-invite tests, human review, and explicit release approval remain open.
- Do not trust `X-Forwarded-For` or `CF-Connecting-IP` for auth buckets until gateway provenance is proven. Do not reuse the divergent rate-limit candidate with unbounded request-path cleanup.

No production SQL write/migration, function deployment, secret/role/flag change, merge, release, userscript publication, destructive operation, or manual fixture cleanup occurred in this checkpoint.


## 2026-11-07 04:11 BRT — Team Lite candidate-check correction

- Team Lite #76 HEAD before this follow-up: `c6b74ee39a4246f3af85e112fbb4f08986b445ae`. Candidate Checks attempt 1 timed out on one of 16 unauthenticated endpoint probes (`/room/request-invite`, 20 seconds). A failed-job rerun (attempt 2) passed that endpoint probe and all subsequent runtime/database checks: 103/103 authenticated, Chromium WebRTC call/voice/screen, three-member mesh, 90+1 rate-limit with Retry-After 60s, distributed rate-limit concurrency, atomic read receipts, AUTH-03 one-winner invite consumption including padded-admin non-escalation, migration layout and cleanup.
- Attempt 2 failed only at the final static candidate check because `scripts/team-lite-candidate-check.mjs:85` still expected the earlier role expression `role: enrolled.role || "implementation_user"`. The current Team Lite server intentionally uses `enrolledRole` and `sessionRole` to default blank roles while preserving every non-empty role literally.
- Updated only that stale assertion in commit [628acb6](https://github.com/Reekyi/UpStatus/commit/628acb6050b92f88790d4fdb33efb5d367c20787). The assertion now matches the literal-preservation contract already enforced by Normal validation and `scripts/auth-enrollment.test.mjs`.
- New exact-head Candidate Checks [42349939459](https://github.com/Reekyi/UpStatus/actions/runs/42349939459) is running on #76 HEAD `628acb6050b92f88790d4fdb33efb5d367c20787`. No PASS is claimed until it completes.
- After attempt 2 finished, SELECT-only fixture counts were zero across users, sessions, rooms, memberships, bindings, events, rate-limit buckets, call attempts, voice attempts, chat reads and messages. No manual cleanup was performed.
- #80's previous documentation commit [59af6b9](https://github.com/Reekyi/UpStatus/commit/59af6b97a2ab72fa47b7cbf40b8b1755d8cacac6) triggered Validate [42349839778](https://github.com/Reekyi/UpStatus/actions/runs/42349839778), which failed at the same inherited `client signed upload helper missing` assertion. No validator was weakened.

No production changes or release actions occurred in this follow-up.


## 2026-11-07 live follow-up — TEST project target verification

This checkpoint supersedes the earlier #84 head/status recorded above.

### Exact candidate refs and workflows

| PR | Exact head | Latest exact-head workflow state |
|---|---|---|
| #74 Normal | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | Validate [42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) SUCCESS; Signaling Smoke [42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) pending with no jobs returned |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS |
| #76 Team Lite signaling | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | Candidate Checks [42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) pending with no jobs returned |
| #80 continuity | `ac85e533e652d027b266a05a6cb54f0b44e64a81` | Validate [42349987439](https://github.com/Reekyi/UpStatus/actions/runs/42349987439) fails inherited `client signed upload helper missing` |
| #82 independent QA | `f09b34ec17b5d17301fe20d7184ec038a118d46d` | Validate [42356336014](https://github.com/Reekyi/UpStatus/actions/runs/42356336014) fails inherited `production updateURL mismatch` |
| #84 TEST target guard | `cdd3e67e4aa16193384e7172f25faffcee82147f` | Validate [42358193284](https://github.com/Reekyi/UpStatus/actions/runs/42358193284): build-target and metadata-preflight unit tests PASS; then fails inherited `client signed upload helper missing` |

All PRs remain open and Draft. No merge, deploy, release, or publication was performed.

### PR #84 — stronger project identity preflight

The existing TEST guard rejected the production and isolated fixture project refs, but a syntactically valid third ref could still identify an unrelated or unhealthy project. Added a read-only Supabase Management API preflight on the existing candidate branch:

- `scripts/test-project-metadata.mjs` validates exact project ref, UpStatus organization ID `bcjtvojfkfoxvsitzmkl`, `ACTIVE_HEALTHY` status, and matching database host.
- `scripts/test-test-project-preflight.mjs` covers valid metadata plus wrong ref, wrong organization, inactive status, and wrong/missing database host.
- `scripts/verify-test-project.mjs` performs GET `/v1/projects/{ref}` with the existing `SUPABASE_ACCESS_TOKEN`; it does not read database contents or mutate project configuration.
- `deploy-test.yml` invokes the metadata check before the deploy command; `validate.yml` runs the pure metadata regression.
- The Management API token must have project-metadata read permission (`projects:read` / `projects_read` for fine-grained tokens). Missing scope/API error fails closed.
- The existing deployment remains manual-only, develop-only, and deploys only `upstatus-test`.

Commits on PR #84:
- `230da9a` metadata contract;
- `40f24c1` read-only Management API verifier;
- `f2cd14f` metadata regression tests;
- `1513e39` deploy workflow preflight;
- `e74c9f5` Validate workflow regression;
- `cdd3e67` documentation.

Exact-head Validate [42358193284](https://github.com/Reekyi/UpStatus/actions/runs/42358193284) confirms both `Test TEST build target guard` and `Test dedicated TEST project metadata guard` passed. The subsequent repository Validate fails at the pre-existing develop-base assertion `client signed upload helper missing`; no validator was weakened. The actual Management API preflight was not executed because no dedicated full-product TEST project exists in the organization inventory.

### Supabase organization inventory and isolated fixture state

A fresh project inventory still contains only:
- Production `dlfvkawaiqduhlazsszm`, organization `bcjtvojfkfoxvsitzmkl`, ACTIVE_HEALTHY.
- Isolated signaling/auth `bfpjtfqlnypisxljoxkb`, same organization, ACTIVE_HEALTHY.

No dedicated full-product TEST project exists. The isolated project must not be repurposed as the full product TEST target.

Production was queried read-only:
- PostgreSQL 17.11.0.002; 7 migrations; 38 ACTIVE Edge Functions.
- Normal `upstatus` v480; `upstatus-test` v281 remains inside the production project/database; Team Lite v15; legacy screen-share v6.
- Five users; zero NULL/blank password hashes; zero NULL/blank roles.
- Nine backend-owned public tables still grant anon/authenticated table privileges including TRUNCATE; the three broadcast SECURITY DEFINER functions remain executable by anon/authenticated.
- Security Advisor: 3 SECURITY DEFINER WARN for anon, 3 for authenticated, 10 RLS/no-policy INFO. Performance and Health have no findings.
- No production schema, function, role, secret, flag, or data was changed.

The isolated project has 33 migration records, `upstatus-signal-test` v32, and `upstatus-signal-e2e-once` v3. A SELECT-only fixture snapshot currently shows 4 users, 4 sessions, 3 rooms, 7 memberships, 1 event, and 6 rate-limit buckets; bindings, call attempts, voice attempts, chat reads, and messages are zero. The fixture owner is not attributed. No mutating test, cleanup, or deletion was run; wait for the shared workflow owner and verify zero counts before starting another fixture suite.

### Remaining release gates

- #74 Smoke and #76 Candidate Checks remain pending with no jobs; do not claim exact-head completion or start overlapping fixture-mutating suites.
- #78 remains 0/8 physical acceptance criteria. Real Tampermonkey network loss/recovery without F5, microphone/display permissions, and installed Normal ↔ Team Lite tests remain manual.
- #84's Management API preflight has unit-test evidence only; no real TEST project exists to exercise the live read-only check.
- RT-01 public Realtime payload disclosure, table/function/default ACL remediation, distributed auth rate limiting, route-by-route Edge Function auth inventory, official TEST project/migration/rollback rehearsal, human reviews, and explicit release approval remain open.
- #80 and #82 inherited validators remain failing; do not weaken them to obtain green status.

No production or isolated SQL write/migration, Edge Function deployment, secret/role/flag change, userscript publication, merge, release, destructive operation, or manual fixture cleanup occurred in this checkpoint.


### PR #84 exact-head follow-up — TEST deploy secret scope

PR #84 now points to head `1e2f9251cb0064ed5cec713736e778edb6b0959d` (20 commits ahead / 0 behind `develop`).

A security review found the Management API/deploy PAT was initially job-scoped, which unnecessarily exposed it to build and validation scripts. The workflow now injects `SUPABASE_ACCESS_TOKEN` only into three steps: credential presence check, read-only Management API metadata verification, and the TEST function deploy step. Added `scripts/test-deploy-workflow-guard.mjs` to assert manual-only trigger, no shared production project secret, TEST-only deploy target, and exactly three step-scoped token bindings.

Exact-head Validate [42358463945](https://github.com/Reekyi/UpStatus/actions/runs/42358463945):
- TEST build-target guard: PASS.
- Management API metadata contract regression: PASS.
- Deploy workflow secret-scope regression: PASS.
- Repository Validate then fails at the inherited `client signed upload helper missing` assertion from `develop`. No validator was weakened.
- The real Management API request was not run because no dedicated full-product TEST project exists; no project/secret was created or changed.

The documentation update immediately before this follow-up created #80 head `15dee4322fc44ff90fa97d08c5c9563eba4d8528`; its Validate [42358326607](https://github.com/Reekyi/UpStatus/actions/runs/42358326607) also fails at the same inherited helper assertion. This new documentation commit will itself trigger the same base validator; re-fetch the exact #80 head before any later action.


## 2026-11-07 07:00 BRT — exact-head CI and environment recheck

This checkpoint supersedes the pending CI statuses in the earlier TEST-project follow-ups above.

### Exact candidate refs and CI

| PR | Exact head | Latest exact-head workflow |
|---|---|---|
| #74 Normal | 7475a82e421c9286e6944ea17ee73afd39ed73d9 | Validate [42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) SUCCESS; Signaling Smoke [42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) SUCCESS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS |
| #76 Team Lite signaling | 87bbb2f91ac21477d69f7945ec62598e2bc6dce7 | Candidate Checks [42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) SUCCESS |
| #80 continuity | 7d6a0f3766e50ad83aab4c6150dec6c5bc7f172c | Validate [42362724293](https://github.com/Reekyi/UpStatus/actions/runs/42362724293) fails inherited develop-base assertion: client signed upload helper missing |
| #82 independent QA | 6ca946f7520610b9d96bce296c74cfd0a7696748 | Validate [42360361232](https://github.com/Reekyi/UpStatus/actions/runs/42360361232) fails inherited master-base assertion: production updateURL mismatch |
| #84 TEST target guard | 773cf5e1af2774568c5705cd0d108acdf5d417e0 | Validate [42362618413](https://github.com/Reekyi/UpStatus/actions/runs/42362618413) SUCCESS |

All six PRs remain open and Draft. No human approval was recorded in the latest review-list queries.

### #74 / #76 runtime evidence

- Normal #74 Validate completed on its exact head and reported Validation OK: PROD 3.4.7 / TEST 3.4.7.
- Normal #74 Signaling Smoke completed successfully. Its authenticated browser checks covered call audio, voice audio, remote screen video, three-member mesh, voice attempt cancel/open races, and cleanup.
- Team Lite #76 Candidate Checks completed successfully on exact head 87bbb2f. The log reports 103/103 authenticated integration checks, browser WebRTC call/voice/screen, three-member mesh, 90 accepted + 1 HTTP 429 with Retry-After 60s, distributed rate-limit concurrency, atomic chat receipts, AUTH-03 setup enrollment (including malformed/wrong/expired/replayed tokens, one-winner concurrency, role fallback/preservation and padded-admin non-escalation), migration layout, and fixture cleanup. Team Lite bundle reported 3.4.31.
- These are automated candidate/isolated-project results. They do not replace the physical Tampermonkey acceptance in #78.

### #84 — signed-upload client contract completed in the safety candidate

The develop base already had authenticated /api/chat/upload-url and /api/profile/avatar-upload-url ticket routes, but its userscript still posted base64 payloads. The inherited validator expected the client helper and also expected a bearer Authorization header, which did not match the server's scoped signed-URL token contract.

Extended only the existing #84 safety candidate:
- Chat and avatar UI now request the corresponding signed-upload ticket and PUT directly to Storage.
- The client pins upload and public URL origins to the configured Supabase project, validates route/bucket, MIME, size, object path and token consistency, omits browser credentials, rejects redirects, and returns only public metadata (not the upload token).
- The token is carried only in the one-time signed URL query, not as a bearer Authorization header.
- Added scripts/test-signed-upload-client.mjs, a VM-backed regression for valid chat/avatar flows and rejection of cross-origin, wrong bucket/path/token, unsupported MIME, oversized files, invalid routes and Storage errors.
- Wired that regression into Validate and the manual-only TEST deploy workflow.
- Updated the validator to assert the actual signed-URL token contract instead of the stale bearer-header expectation.

Exact-head #84 Validate [42362618413](https://github.com/Reekyi/UpStatus/actions/runs/42362618413) passed the TEST build-target guard, project metadata contract, deploy workflow secret-scope regression, signed-upload client regression, and full repository Validate (Validation OK: PROD 3.0.40 / TEST 3.0.40-beta.22). This is CI evidence only; the manual deploy workflow was not run.

### Supabase — current read-only snapshot

Production dlfvkawaiqduhlazsszm remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations and 38 ACTIVE Edge Functions:
- Normal upstatus v480; upstatus-test v281 remains in the production project; Team Lite v15; legacy screen-share v6.
- Five users; zero NULL/empty password hashes; zero NULL/blank roles.
- No setup-invite table/RPC, auth-specific rate-limit table/RPC, or dedicated upstatus-signal endpoint is deployed.
- The three public broadcast SECURITY DEFINER functions remain executable by client roles and publish public Realtime events; the messages broadcast still serializes the full row. Nine backend-owned public tables retain broad client grants including TRUNCATE. realtime.messages still has client grants.
- Security Advisor remains 3 SECURITY DEFINER WARN for anon, 3 for authenticated, and 10 RLS/no-policy INFO. Performance and Health returned no findings.

The organization still has only two Supabase projects: production and the isolated signaling/auth lab. There is no dedicated full-product TEST project. The isolated lab remains ACTIVE_HEALTHY with 33 migration records, upstatus-signal-test v32 and E2E helper v3.

After #76 completed, an exact SELECT count on the isolated project returned zero rows in users, sessions, messages, chat reads, signal rooms, room members, room bindings, signal events, rate-limit buckets, call attempts and voice-room attempts. No cleanup write was performed.

### Remaining release gates

- #78 remains 0/8 physical acceptance criteria. Real Tampermonkey network loss/recovery without F5, browser termination/reopen, microphone/display permissions and installed Normal ↔ Team Lite acceptance remain manual.
- #80 remains blocked by the develop base validator until the signed-upload client fix from #84 is reviewed/integrated; do not copy product code into the docs branch or weaken the validator.
- #82 remains blocked by the master-base production updateURL mismatch; resolve the actual source/manifest contract, not the assertion alone.
- #84's live Management API preflight remains untested because there is no dedicated full-product TEST project and no TEST project variable configured. Do not repurpose the signaling/auth lab.
- RT-01 public Realtime payload disclosure, table/function/default ACL remediation, distributed auth rate limiting, route-by-route Edge Function auth inventory, official TEST project/migration/rollback rehearsal, human reviews and explicit release approval remain open.

No production or isolated SQL write/migration, Edge Function deployment, secret/role/flag change, userscript publication, merge, release, destructive operation or manual fixture cleanup occurred in this checkpoint.


## 2026-11-07 07:55 BRT — exact-head refresh and TEST dispatch pin

This checkpoint was appended after re-reading the Project Guide, the QA release-readiness document, the release cutover plan, the Realtime security matrix, and the live PR/issue/runtime state. It supersedes the 07:00 BRT CI table above.

### Exact GitHub refs and CI

- Default branches: `develop` = `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`; `master` = `a9288ccfcb0f308d3a587bfca624418a395be07b`; `team-lite-official` = `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- PR #74 Normal: open/Draft, head `7475a82e421c9286e6944ea17ee73afd39ed73d9`. Validate [42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) and Signaling Smoke [42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) both SUCCESS on that exact head.
- PR #75 Team Lite baseline: open/Draft, head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) is historical PASS; #76 is the newer signaling candidate.
- PR #76 Team Lite: open/Draft, head `87bbb2f91ac21477d69f7945ec62598e2bc6dce7`. Candidate Checks [42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) SUCCESS on the exact head; the latest issue #79 checkpoint records 103/103 authenticated checks, WebRTC call/voice/screen, three-member mesh, 90 accepted + 1 HTTP 429 with Retry-After 60s, concurrency, atomic receipts, AUTH-03 and fixture cleanup.
- PR #80 continuity: open/Draft, head `eeac9fafdc39690c41d0020d806a9f6e4fe3ddf1`. Validate [42366363961](https://github.com/Reekyi/UpStatus/actions/runs/42366363961) FAILURE at the inherited develop-base assertion `client signed upload helper missing`. Do not copy runtime code into the documentation branch or weaken the validator; the candidate implementation is in #84.
- PR #82 independent QA: open/Draft, head `d5d71586a07ea1d7436f868b51c1dc1c09a54f5f`. Validate [42364918068](https://github.com/Reekyi/UpStatus/actions/runs/42364918068) FAILURE at the inherited master-base assertion `production updateURL mismatch`. QA branch remains untouched.
- PR #84 TEST isolation: open/Draft, head `66ccc65af430dfee55560e90e1f832336fff0212`. The preceding exact-head Validate [42362618413](https://github.com/Reekyi/UpStatus/actions/runs/42362618413) passed all guards and full Validate on head `773cf5e`. The new exact-head Validate [42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144) completed SUCCESS after the dispatch-SHA hardening; the exact `66ccc65` head passed all regression steps and full repository Validate.
- All six PRs remain open and Draft. Latest review-list queries found no submitted human approvals.

### PR #84 — exact commit pinning for manual TEST deployment

A review of the candidate workflow found a small race: it checked out the moving branch name `develop` after the workflow-dispatch event. If `develop` advanced between dispatch and checkout, the run could deploy a different commit from the one recorded by GitHub for that run.

The candidate now checks out `${{ github.sha }}` and verifies `git rev-parse HEAD` equals `GITHUB_SHA`, while retaining the explicit `refs/heads/develop` allowlist. The regression script asserts exact-SHA checkout, ref allowlist, SHA equality, manual-only trigger, TEST-only function target, and step-scoped access-token bindings. Documentation was updated in `docs/TEST_ENVIRONMENT_GUARD.md`.

Commits on the existing isolated #84 branch:
- `4e644869566424ac1500ec7fa68937e2d1f6e99a`: pin checkout to dispatch SHA and assert the approved develop ref/SHA.
- `3840a7110cc12ed1cdd7f80ee9906b6b8144e9c7`: add regression assertions.
- `66ccc65af430dfee55560e90e1f832336fff0212`: document the dispatch-SHA contract.

The branch was re-read before each edit; the current PR head and file contents were re-fetched afterward. The new Validate run is still in progress. No workflow_dispatch deploy was run and no live Management API request was made.

### Supabase — fresh read-only state

- Organization `bcjtvojfkfoxvsitzmkl` still has exactly two projects: production `dlfvkawaiqduhlazsszm` and isolated signaling/auth lab `bfpjtfqlnypisxljoxkb`. There is no dedicated full-product TEST project.
- Production remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. Current core versions: Normal `upstatus` v480, `upstatus-test` v281 (inside production), Team Lite v15, legacy Normal screen-share v6.
- Production remains without setup-invite objects, auth-specific rate-limit objects, product signaling rate-limit objects, or a dedicated `upstatus-signal` function.
- Read-only function ACL query reconfirmed all three trigger-only broadcast functions are SECURITY DEFINER, use `search_path=public`, and have EXECUTE effective for anon/authenticated/service_role. Security Advisor observed at 10:57 UTC: 3 WARN for anon, 3 WARN for authenticated, and 10 RLS-enabled/no-policy INFO; Health returned no findings.
- Isolated lab remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 33 migrations, `upstatus-signal-test` v32 and E2E helper v3. No test suite or fixture mutation was started in this pass.

### Release gates

- Issue #78 remains OPEN with 0/8 acceptance criteria checked. Physical Tampermonkey network loss/recovery without F5, real microphone/display permissions, browser lifecycle and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING.
- RT-01 remains BLOCKED: production public Realtime triggers still publish full message rows and remote/user metadata. Candidate payload minimization is not deployed and does not retire public legacy signaling.
- RT-09 remains PARTIAL: the distributed rate limiter is validated in the isolated signaling endpoint but is not integrated into both product-facing endpoints or production.
- Production table/function/default ACL remediation, official TEST provisioning, migration/rollback rehearsal, product endpoint cutover, human reviews, and explicit release approval remain open.
- The deployed production Normal/Team Lite functions remain on their current versions; no candidate migration or Edge Function was deployed.

No production or isolated SQL write/migration, Edge Function deployment, secret/role/flag change, userscript publication, merge, release, destructive operation, or manual fixture cleanup occurred in this checkpoint. All Supabase SQL in this pass was SELECT-only.


### #80 Validate follow-up — 2026-11-07 07:56 BRT

After the 07:55 BRT continuity append, PR #80 head `d4d2f52d55e9866647ebd9e23df66a9392619c6b` completed Validate run [42366246384](https://github.com/Reekyi/UpStatus/actions/runs/42366246384) with FAILURE at `node scripts/validate.mjs`: `VALIDATION FAILED: client signed upload helper missing`. The workflow checked out the expected docs-branch merge ref; the failure is still the unchanged `develop` baseline contract. The signed-upload implementation and its exact-head green Validate remain isolated in PR #84; no code was copied into #80 and no validator was weakened. This note is documentation-only and does not change the runtime candidate.


## 2026-11-07 08:59 BRT — live engineering revalidation

This checkpoint supersedes earlier PR/CI snapshots above. All refs and the relevant workflow jobs were re-fetched before recording it.

### Exact GitHub state

| PR | Current head | State | Exact-head evidence |
|---|---|---|---|
| #74 Normal | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | Open / Draft | Validate [42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) SUCCESS; Signaling Smoke [42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS; superseded by #76 |
| #76 Team Lite signaling | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | Open / Draft | Candidate Checks [42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) SUCCESS; 103/103 authenticated checks and browser call/voice/screen WebRTC, three-member mesh, 90+1 rate-limit/Retry-After, concurrency, atomic receipts, AUTH-03 and cleanup |
| #80 continuity | `e95765d52ace32af3d8416ce3c0f18c57bb13e03` | Open / Draft | Validate [42366423731](https://github.com/Reekyi/UpStatus/actions/runs/42366423731) FAILURE: inherited `client signed upload helper missing` |
| #82 independent QA | `3cf28a9762199b3d7ea7a4d4b12a700900cdae33` | Open / Draft | Validate [42368817280](https://github.com/Reekyi/UpStatus/actions/runs/42368817280) FAILURE: inherited `production updateURL mismatch` |
| #84 TEST isolation | `66ccc65af430dfee55560e90e1f832336fff0212` | Open / Draft | Validate [42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144) SUCCESS, including target guard, project metadata contract, scoped token, signed-upload contract and full Validate |

Default branch heads at this check: `develop=6b33e1e26ad105143f00372ae6d0f2fa52df60d6`, `master=a9288ccfcb0f308d3a587bfca624418a395be07b`, `team-lite-official=9065bc1536fde64f437f6f12b7abb9b072cb8281`.

### TEST workflow risk remains on develop

The live `.github/workflows/deploy-test.yml` on `develop` still has a `push` trigger for `develop`, binds the shared `SUPABASE_PROJECT_ID` secret at job scope, and deploys `upstatus-test` to that value. The secret value was not read. This is a target-control gap, not proof that the secret currently points to production.

PR #84 contains the candidate replacement: manual-only, explicit TEST project variable, production/lab rejection, read-only organization/status/DB-host preflight, exact dispatch-SHA checkout and verification, and step-scoped access-token exposure. Its CI is green, but it remains Draft and has not been merged or dispatched. The old workflow remains active on the base until an authorized integration.

### Supabase — fresh read-only verification

- Organization `bcjtvojfkfoxvsitzmkl` still has exactly two projects: production `dlfvkawaiqduhlazsszm` and isolated signaling/auth lab `bfpjtfqlnypisxljoxkb`. No dedicated full-product TEST project exists.
- Production remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations and 38 ACTIVE Edge Functions. Core deployed versions remain Normal `upstatus` v480, in-production `upstatus-test` v281, Team Lite v15, and legacy screen-share v6.
- A fresh SELECT-only catalog inspection retrieved the three production broadcast function definitions. `upstatus_broadcast_messages()` remains SECURITY DEFINER with `search_path=public`, serializes the complete OLD/NEW row using `to_jsonb`, and calls `realtime.send(..., false)`. Remote-state and user-status functions also publish metadata to public channels. EXECUTE remains effective for anon/authenticated/service_role.
- Security Advisor currently returns 3 SECURITY DEFINER WARN for anon, 3 for authenticated, and 10 RLS-without-policy INFO; Performance and Health return no findings.
- The isolated lab remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 33 migrations, `upstatus-signal-test` v32 and E2E helper v3. A fresh SELECT-only count returned zero rows in all 11 checked fixture tables: users, sessions, rooms, room members, bindings, events, rate-limit buckets, call attempts, voice-room attempts, messages and chat reads.
- No migration, SQL write, function deployment, secret/role/flag change or cleanup was performed.

### Release gates

- Issue #78 remains OPEN, 0/8 physical acceptance criteria. Real Tampermonkey no-F5 recovery, browser close/reopen while offline, real microphone/display capture and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING.
- RT-01 remains BLOCKED by public full-row message and remote/user metadata broadcasts. Candidate client-side payload reductions do not remove the deployed trigger path.
- AUTH-03 candidate CI is green, but production remains on the legacy name-based setup path; route-level HTTP tests for admin issuance/non-admin denial and token handling remain required.
- Auth-specific distributed rate limiting is absent from production and not integrated into both product endpoints.
- Official TEST provisioning and migration/rollback rehearsal, ACL/default-ACL remediation, route-by-route Edge Function auth inventory, human reviews and explicit release approval remain open.
- Do not report a completion percentage. Automated candidate CI, isolated database evidence, production catalog state, manual acceptance and release authorization are separate gates.

### Next concrete actions

1. Obtain human review of #84; do not merge or dispatch it without Ricardo's explicit authorization.
2. Provision a dedicated full-product TEST project only after explicit approval; do not repurpose the signaling/auth lab.
3. Design and validate the authenticated replacement for public Realtime before any production cutover.
4. Complete HTTP-level AUTH-03 tests and integrate a separate distributed auth limiter.
5. Complete the physical #78 matrix in installed Tampermonkey clients.

No production write, migration, deploy, merge, release, userscript publication, secret/role/feature-flag change, destructive action or manual fixture cleanup occurred in this checkpoint.


### #80 documentation commit follow-up — 2026-11-07 09:04 BRT

The continuity update above created a new PR #80 head: `2c7f50bdc9a6844e4538ae989a469385bbf97fa0`. Its exact-head Validate run [42370862157](https://github.com/Reekyi/UpStatus/actions/runs/42370862157) completed FAILURE at the same inherited `develop`-base assertion: `client signed upload helper missing`. The job log confirms the failure occurs in `node scripts/validate.mjs`; it is not a failure in the new documentation content. PR #80 remains open/Draft. No product code was copied into the docs branch and no validator was weakened.


### Live revalidation — 2026-11-07 10:04 BRT

This checkpoint supersedes earlier PR/CI snapshots in this file where the exact head or run differs. Refs and checks were re-fetched from GitHub; Supabase checks below were read-only.

### GitHub PRs and exact-head workflows

| PR | Current head | State | Exact workflow evidence |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | Open / Draft | [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) and [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) SUCCESS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical SUCCESS; superseded by #76 for current signaling work |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | Open / Draft | [Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) SUCCESS; 103/103 authenticated checks and browser call/voice/screen WebRTC, mesh, rate-limit/Retry-After, concurrency, atomic receipts, AUTH-03 and cleanup |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `0e6b14ef7b2d81857d59c3336a88656eda9a9f08` | Open / Draft | [Validate 42370902874](https://github.com/Reekyi/UpStatus/actions/runs/42370902874) FAILURE: inherited `client signed upload helper missing` in `scripts/validate.mjs:55` |
| [#82 independent QA](https://github.com/Reekyi/UpStatus/pull/82) | `3227d62160de28a8eacee462d87bcd3eea502adc` | Open / Draft | [Validate 42373412069](https://github.com/Reekyi/UpStatus/actions/runs/42373412069) FAILURE: inherited `production updateURL mismatch` in `scripts/validate.mjs:26` |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `66ccc65af430dfee55560e90e1f832336fff0212` | Open / Draft | [Validate 42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144) SUCCESS, including build-target, project metadata, token-scope, SHA-pin, signed-upload and full repository validation |

All six PRs remain open and Draft. No merge or deploy workflow was dispatched. The latest review queries on #74, #76 and #84 returned no submitted reviews; no claim is made here about unqueried review queues on #75, #80 or #82.

### Current TEST workflow control

The live `develop/.github/workflows/deploy-test.yml` still has a `push` trigger and binds the shared `SUPABASE_PROJECT_ID` secret at job scope. The secret value was not read, so this is a target-control gap, not proof of its current destination. PR #84's candidate version is manual-only, requires a dedicated `SUPABASE_TEST_PROJECT_ID`, rejects production and the fixture lab, checks organization/project identity and health, pins checkout to the dispatch SHA, and scopes the access token to the steps that need it. It remains Draft and has not been integrated.

### Supabase read-only revalidation

- The organization still has exactly two projects: production `dlfvkawaiqduhlazsszm` and isolated signaling/auth lab `bfpjtfqlnypisxljoxkb`. Both report `ACTIVE_HEALTHY`; no dedicated full-product TEST project exists.
- Production: PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, 38 ACTIVE Edge Functions; `upstatus` v480, `upstatus-test` v281 in the production project, Team Lite v15 and legacy screen-share v6.
- Isolated lab: PostgreSQL 17.11.0.003, 33 migrations; `upstatus-signal-test` v32 and E2E helper v3. A fresh SELECT-only count returned zero rows in ten checked fixture categories (users, sessions, messages, chat reads, rooms, memberships, events, rate limits, call attempts and voice-room attempts). This is a point-in-time observation, not an exclusive reservation.
- Production account aggregate: five users, zero NULL/empty password hashes, zero missing/blank roles, three explicit `implementation_admin` roles.
- Production catalog: all three broadcast functions remain SECURITY DEFINER with `search_path=public`, EXECUTE effective for anon/authenticated/service_role; the message function serializes row data and the broadcast functions call Realtime with a public-channel flag. The three functions remain attached to the existing public broadcast path.
- The nine backend-owned public tables retain seven client privileges each for anon and authenticated (DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE). `realtime.messages` retains INSERT/SELECT/UPDATE for both client roles. RLS has no policies on these tables; these grants are unnecessary privilege surface, but the catalog result alone does not prove row access through RLS.
- Security Advisor observed at 2026-11-07 13:04:30 UTC: three SECURITY DEFINER WARN for anon, three for authenticated and ten RLS-without-policy INFO. Performance and Health returned no findings.

### Release gates still open

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with 0/8 physical criteria checked. Real Tampermonkey network-loss/recovery without F5, browser-close/offline recovery, physical microphone/display capture and installed Normal ↔ Team Lite acceptance remain MANUAL PENDING.
- RT-01 remains BLOCKED by public message-row and remote/user metadata broadcasts. Client-side refresh-hint behavior does not remove the deployed server-side disclosure path.
- AUTH-03 is candidate-only; production still uses the legacy name-based setup path. HTTP tests for admin issuance, non-admin denial and token handling remain required.
- Auth-specific distributed rate limiting is not integrated in production product endpoints.
- Official TEST provisioning, migration/rollback rehearsal, ACL/default-ACL remediation, per-function auth inventory, human reviews and explicit release approval remain open.

No production SQL write, migration, Edge Function deployment, secret/role/flag change, userscript publication, merge, release, fixture cleanup or destructive operation was performed. No workflow was dispatched or rerun. All Supabase SQL in this checkpoint was SELECT-only.
