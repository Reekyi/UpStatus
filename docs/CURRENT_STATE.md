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
