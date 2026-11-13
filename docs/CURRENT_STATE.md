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


### Live engineering checkpoint — 2026-11-07 11:02 BRT

This checkpoint supersedes earlier PR, workflow, and database snapshots above where refs differ. All refs were re-fetched from GitHub immediately before this update. Production Supabase checks were SELECT/catalog-only.

#### Git refs and exact-head CI

- `master`: `a9288ccfcb0f308d3a587bfca624418a395be07b`, currently reported unprotected.
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`, currently reported unprotected.
- **#74 Normal** `7475a82e421c9286e6944ea17ee73afd39ed73d9`: Validate [42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) and Signaling Smoke [42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) SUCCESS.
- **#75 Team Lite baseline** `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`: historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS; #76 is the active Team Lite signaling candidate.
- **#76 Team Lite** `87bbb2f91ac21477d69f7945ec62598e2bc6dce7`: Candidate Checks [42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) SUCCESS (103/103 authenticated checks, WebRTC call/voice/screen, three-member mesh, rate limit 90+1/429 with Retry-After, concurrency, receipts, AUTH-03 and cleanup).
- **#80 continuity** `c90ecb942c05f453addaf7738541b73cf0db3ad8`: Validate [42375346258](https://github.com/Reekyi/UpStatus/actions/runs/42375346258) FAILURE at the inherited develop assertion `client signed upload helper missing`.
- **#82 independent QA** `348df4e7d024b8336b1133ac191d2b75b5de3d69`: Validate [42377839699](https://github.com/Reekyi/UpStatus/actions/runs/42377839699) FAILURE at the inherited master assertion `production updateURL mismatch`. QA branch and `docs/RELEASE_READINESS.md` remain untouched.
- **#84 TEST isolation** `66ccc65af430dfee55560e90e1f832336fff0212`: Validate [42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144) SUCCESS, including target guard, project metadata, token scope, dispatch-SHA pin, signed-upload client regression and full repository Validate.
- **#85 master updater/admin candidate** `fc6611809b742cfb826e8cbeb56491ad5c40038b`: Validate [42379624982](https://github.com/Reekyi/UpStatus/actions/runs/42379624982) FAILURE at the next existing chat contract, `files are staged instead of uploaded immediately`. All preceding admin-role assertions passed in that run. #85 remains open/Draft.

All seven PRs #74, #75, #76, #80, #82, #84 and #85 are open and Draft. The current review query returned zero submitted reviews for all seven.

#### Master authorization hardening on #85

The exact #85 branch was inspected before editing; its base remained master `a9288ccf`, with no QA branch changes. The candidate now:

- Defaults NULL/empty/whitespace-only first-access roles to `implementation_user`, preserving every non-empty role verbatim. Name alone no longer bootstraps `implementation_admin`.
- Gates `/api/health` through the stored admin role.
- Preserves the Ricardo-only chat-clear policy while additionally requiring the stored admin role server-side.
- Removes name-only admin affordances from message deletion, clear-chat visibility, and the clear handler.
- Adds regression assertions for these contracts.

Commits: server [dacb504](https://github.com/Reekyi/UpStatus/commit/dacb504ffc5e0193aaeab47cbb20c787c9179681), client UI [ee228a0](https://github.com/Reekyi/UpStatus/commit/ee228a00ed04d39ff24c3c6cae2d9277e457fe75), initial tests [f852de4](https://github.com/Reekyi/UpStatus/commit/f852de498fd13433fe627b273e34ba7f739d337c), final clear-chat assertion [fc66118](https://github.com/Reekyi/UpStatus/commit/fc6611809b742cfb826e8cbeb56491ad5c40038b).

The first run exposed a stale name-only clear-chat assertion; the test was corrected to require Ricardo plus stored admin role. The next exact-head run passed those admin checks and stopped at the missing staged-attachment contract. Investigation found the master client has an `uploadFileDirect` helper and calls `/api/chat/upload-url`, but the master server template has no `signedUploadRoute` or chat/avatar upload-url routes. File selection and paste still call `sendChatMedia` immediately; `setPendingAttachment`, link-preview staging and the pending-preview node are absent. This is a real partial client/server integration gap, not a reason to weaken the regression. The complete route/staging pattern exists in the Normal candidate, but it has not been ported to #85; the next candidate task is to port it with strict project-origin/bucket/path/token checks and mocked Storage tests, without reusing the lab as an official full-product TEST project.

#### Supabase read-only snapshot

Organization inventory still contains exactly two projects:

- Production `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, 38 Edge Functions. Deployed functions: Normal `upstatus` v480, `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy screen-share beta10 v6. No dedicated `upstatus-signal` function.
- Isolated lab `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 33 migrations; `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3.

A fresh SELECT-only fixture snapshot on the isolated lab returned zero in all 12 checked categories: users, reserved-prefix users, sessions, messages, chat reads, rooms, memberships, bindings, events, rate-limit buckets, call attempts and voice attempts. This is a point-in-time observation, not an exclusive reservation.

Production SQL/catalog snapshot at approximately 2026-11-07 13:59:49 UTC:

- Five users, zero NULL/empty password hashes, zero blank roles, three explicit `implementation_admin` roles.
- Setup-invite RPC, auth rate-limit table, signaling rate-limit table and atomic chat-read receipt RPC are absent.
- Three broadcast functions remain SECURITY DEFINER, `search_path=public`, EXECUTE granted to anon/authenticated/service_role; message broadcast publishes the full row via `to_jsonb` to a public channel. Remote-state and user-status broadcasts also expose metadata on public channels.
- Nine backend-owned public tables remain RLS-enabled with zero policies and broad anon/authenticated grants including TRUNCATE. `realtime.messages` retains anon/authenticated SELECT/INSERT/UPDATE grants; zero policies mean the grants are excessive privilege surface, not proof of direct row access.
- Security Advisor: three SECURITY DEFINER WARN for anon, three for authenticated, ten RLS-without-policy INFO; Performance and Health returned no findings.

#### Remaining release gates

1. Complete the master signed-upload/staged-attachment contract before claiming #85 Validate green.
2. Keep #84 Draft until human review and a dedicated full-product TEST project exist; the current develop deploy workflow remains the older push-triggered/shared-secret version until an authorized integration.
3. Resolve RT-01 public broadcasts and authenticated/private Realtime authorization.
4. Add product-integrated distributed auth throttling and complete route-level AUTH-03 HTTP tests.
5. Remediate ACL/default-ACL issues through a separately reviewed, authorized path.
6. Complete physical Issue #78 acceptance; it remains OPEN at 0/8: real Tampermonkey network-loss/no-F5 recovery, browser close/offline recovery, physical microphone/display capture and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING.
7. Obtain human PR reviews and explicit release authorization.

No production SQL write, migration, Edge Function deployment, secret/role/flag change, userscript publication, merge, release, fixture cleanup or destructive action occurred. No workflow_dispatch or deployment was executed. All production SQL in this checkpoint was SELECT-only.


## Engineering checkpoint — 2026-11-07 12:16 BRT (live revalidation)

This checkpoint supersedes earlier HEAD/status snapshots in this document. All refs below were fetched again from GitHub immediately before this update.

### GitHub branches and PRs

- `master`: `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- #74 Normal, HEAD `7475a82`: Validate [42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089) and Signaling Smoke [42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038) SUCCESS.
- #75 Team Lite baseline, HEAD `7bbf9b9`: Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical SUCCESS; #76 is the active Team Lite candidate.
- #76 Team Lite signaling, HEAD `87bbb2f`: Candidate Checks [42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800) SUCCESS, including 103/103 authenticated checks, WebRTC call/voice/screen, three-member mesh, 429/Retry-After, rate-limit and receipt concurrency, AUTH-03 and cleanup.
- #80 continuity, HEAD `6ece088`: Validate [42379955017](https://github.com/Reekyi/UpStatus/actions/runs/42379955017) FAILURE at the inherited develop contract `client signed upload helper missing`. This remains a documentation-only branch.
- #82 independent QA, HEAD `64fe827`: Validate [42382198198](https://github.com/Reekyi/UpStatus/actions/runs/42382198198) FAILURE at the inherited master contract `production updateURL mismatch`. QA branch and `docs/RELEASE_READINESS.md` were not edited.
- #84 TEST isolation, HEAD `66ccc65`: Validate [42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144) SUCCESS. The candidate is still Draft; the live develop workflow has not been replaced.
- #85 master stabilization, HEAD `648877e`: Validate [42385553282](https://github.com/Reekyi/UpStatus/actions/runs/42385553282) SUCCESS. PR remains Draft and has no human review.

All seven PRs remain open/Draft with zero submitted reviews. No merge, deployment, release or userscript publication occurred.

### PR #85 — master chat/upload and authorization completion

The master-based candidate now contains the missing signed-upload/staging contract:

- Client selection and paste stage attachments instead of uploading immediately; the composer renders a removable pending preview and link preview.
- Send preserves caption and reply context; document filename is normalized separately from the caption, displayed separately in chat, and used by the shared document library.
- Client signed-upload helper binds chat/avatar routes to their expected buckets, checks HTTPS project origin, bucket, MIME, size, object path, token and public URL, rejects URL userinfo/fragments, omits credentials and rejects redirects.
- Server exposes authenticated `/api/chat/upload-url` and `/api/profile/avatar-upload-url`; validates allowed MIME/20 MB size, signed/public URL origin, bucket, object path and token.
- Profile update accepts only a same-project `profile-images` public object URL; legacy data-URL profile clients remain supported.
- Health UI and first-access/admin paths use the stored role; no name-only admin fallback remains in this candidate.
- Client `chat_fast` refresh events no longer carry the full message object. This is only a client-side reduction; the deployed database trigger still publishes full message rows publicly, so RT-01 remains open.

Exact Validate log for HEAD `648877e` reports:
- Build: `Built UpStatus 3.4.7 / TEST 3.4.7`.
- Signed-upload client regression PASS: route, bucket, MIME, size, project origin, object path, one-time token, PUT contract and UI wiring.
- Chat regression PASS: staged attachments, signed uploads, filename/caption separation, role gates, link previews, screen sharing, notifications and unread indicators.
- `Validation OK: PROD 3.4.7 / TEST 3.4.7`.

The Storage test is mocked in CI. No real Storage upload was attempted: the isolated lab has no `chat-images` or `profile-images` buckets, and production writes are prohibited. The production buckets were only inspected read-only and are public, 20 MB, with the expected chat/document and image MIME allowlists. Production schema already has `messages.file_name`.

### Supabase read-only snapshot — 2026-11-07 (read-only checks during this run)

Organization inventory still contains exactly two projects:

- Production `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 Edge Functions. Normal `upstatus` v480, `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy screen-share beta10 v6. The TEST function remains inside production; there is no dedicated full-product TEST project.
- Isolated lab `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 33 migrations, `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3. Read-only counts: zero users, sessions, messages, chat reads, rooms, room members, bindings, events, rate-limit buckets, call attempts and voice-room attempts. The lab has no chat/profile Storage buckets.

Production catalog/data checks:
- 5 users, 0 NULL/empty password hashes, 0 blank roles; 262 messages.
- `public.messages.file_name` exists.
- `chat-images` and `profile-images` are public with 20 MB limits and expected MIME allowlists.
- Setup-invite RPC/table, dedicated auth rate limiter, signaling rate limiter and dedicated `upstatus-signal` function remain absent.
- Three broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE for anon/authenticated. `upstatus_broadcast_messages()` sends the complete OLD/NEW row via `to_jsonb` to a public Realtime topic (`private=false`); remote-state and user-status also publish metadata publicly.
- Nine backend-owned public tables retain broad anon/authenticated grants including TRUNCATE. Default ACLs remain broad for objects created by `postgres` and `supabase_admin`.
- Security Advisor: 3 SECURITY DEFINER WARN for anon, 3 for authenticated, 10 RLS-without-policy INFO. Performance and Health have no findings.

### Remaining release gates

1. Resolve RT-01: replace public full-row/message and metadata broadcasts with authenticated/private Realtime and validate authorization.
2. Provision a complete, independent TEST project; do not use production or the signaling-only lab as the product TEST target. The develop deploy workflow still has a push trigger and uses shared `SUPABASE_PROJECT_ID`; the manual-only/TEST-specific/SHA-pinned correction exists only in Draft #84.
3. Complete production-safe AUTH-03 rollout planning, route-level admin/non-admin HTTP tests and distributed auth throttling. Candidate code is not deployed.
4. Review/reduce table grants and default ACLs for both `postgres` and `supabase_admin` through a separately approved plan.
5. Complete physical Issue #78 acceptance: it remains OPEN at 0/8. No real Tampermonkey network-loss/no-F5 recovery, browser close/offline recovery, physical microphone/display capture or installed Normal ↔ Team Lite interoperability was executed in this run.
6. Obtain human reviews and explicit release authorization. CI success is not approval to merge, deploy or publish.

No production SQL write, migration, Edge Function deployment, secret/role/feature-flag change, fixture cleanup, destructive action, merge, release or userscript publication occurred. Production queries in this checkpoint were SELECT/catalog reads only.


## Engineering checkpoint — 2026-11-07 12:22 BRT (server-side signed-upload regression)

This is the latest engineering checkpoint and supersedes the 12:16 snapshot for PR #85.

- PR #85 master candidate HEAD: `1755452` (full SHA `17554523ef51bafd503e74b3f1271d55f43a6eda`).
- Exact-head Validate: [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) SUCCESS.
- The Validate log reports build PROD/TEST 3.4.7, signed-upload client regression PASS, signed-upload server VM regression PASS, chat regression PASS, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- The new server VM test extracts the candidate `signedUploadRoute` and `profileRoute` into an isolated Node VM with mocked Storage/database APIs. It checks chat/avatar bucket selection, MIME and 20 MB limits, integer sizes, HTTPS/project origin, signed path and token consistency, public URL origin/path, URL fragments, foreign origins, invalid profile buckets/paths/query strings, and legacy data-URL profile compatibility. It performs no network or database writes.
- The server test's initial mock incorrectly represented Supabase Storage's signed URL as a root-relative `/object/...` path; the mock was corrected to the absolute `https://<project>/storage/v1/object/...` shape. The path mismatch tests now distinguish returned-path mismatch from signed-URL path mismatch. The final exact-head CI passed.
- PR #85 remains Open/Draft with zero human reviews. No deploy, merge, release or userscript publication.
- No real Storage integration test is possible in the current lab: it has no `chat-images`/`profile-images` buckets. Production buckets were inspected only; no object was uploaded.
- Production RT-01 broadcasts and ACL/default-ACL issues remain unchanged. The client-side `chat_fast` payload reduction does not close the deployed full-row public database trigger.
- The separate QA branch #82 and its `RELEASE_READINESS.md` were not modified. #82 still fails its inherited `production updateURL mismatch` until the master candidate is reviewed/integrated; #80 still fails its inherited develop `client signed upload helper missing` gate.

No production SQL write, migration, Edge Function deployment, secret/role/feature-flag change, fixture cleanup, destructive action, merge, release or userscript publication occurred. Production access remained SELECT/catalog-only.


## Engineering checkpoint — 2026-11-07 12:35 BRT (password-policy parity and release-doc alignment)

This checkpoint supersedes earlier snapshots for the refs and workflow results listed below. All values were re-fetched from GitHub/Supabase during this run.

### GitHub branches and PRs

- Base branches: `master` = `a9288ccfcb0f308d3a587bfca624418a395be07b`; `develop` = `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- #74 Normal: `chore/continuity-foundation`, HEAD `7475a82e421c9286e6944ea17ee73afd39ed73d9`, 839 commits ahead / 0 behind master. Validate `42354944089` and Signaling Smoke `42354944038` SUCCESS.
- #75 Team Lite baseline: `team-lite/3.4.31-guest-fixes`, HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind team-lite-official. Candidate Checks `41674353127` historical SUCCESS; #76 is the active candidate.
- #76 Team Lite: `team-lite/signaling-transport-candidate`, HEAD `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7`, 312 ahead / 0 behind team-lite-official. Server commit `80ba937` changes first-access/login password thresholds to `setup ? 6 : 4`; test commit `95c3757` added a cross-product assertion but initially compared against the stale Normal server template carried by the Team Lite base. The test harness was corrected in `2e0ff69` to assert the Team Lite contract directly. Candidate Checks `42386904302` is still IN_PROGRESS in the authenticated isolated integration/browser step. Earlier run `42386822774` failed before any fixture-mutating step at the incorrect static Normal-template assertion.
- #80 continuity: `docs/continuity-handoff-2026-11-04`, HEAD `2473853e70c02f6bf86ea245c01f40c29a9a641a`, 192 ahead / 0 behind develop. Validate `42386143497` failed at the inherited `client signed upload helper missing` contract.
- #82 independent QA: `qa/release-readiness-2026-11-04-master`, HEAD `64fe8272869b0ee9d01a557ea99c3bc4a1420042`, 99 ahead / 0 behind master. Validate `42382198198` failed at the inherited `production updateURL mismatch`. QA branch and its release-readiness file were not edited by engineering.
- #84 TEST isolation: `safety/test-deploy-target-guard-20261107`, HEAD `21341f331270e142bdf7584c1cdf16e6011e41b3`, 30 ahead / 0 behind develop. README now matches the candidate workflow: TEST deploy is manual-only, restricted to develop, uses `SUPABASE_TEST_PROJECT_ID`, checks out the dispatch SHA, verifies project identity and deploys only `upstatus-test`. Validate `42387042361` SUCCESS.
- #85 master stabilization: `fix/master-release-script-url-20261107`, HEAD `17554523ef51bafd503e74b3f1271d55f43a6eda`, 21 ahead / 0 behind master. Validate `42386047749` SUCCESS: signed-upload client/server VM regressions and chat regression all passed; build reports PROD/TEST 3.4.7.
- All seven PRs remain OPEN/Draft, unmerged, with zero submitted human reviews.

### Password policy: deployed mismatch versus candidate correction

Read-only retrieval of the deployed production Edge Function sources confirms:
- Production Normal `upstatus` currently rejects passwords shorter than 6 for both login and first setup.
- Production Team Lite `upstatus-team-lite` currently rejects passwords shorter than 4 for both login and first setup.
- This is a real cross-product login incompatibility for shared accounts with 4–5 character passwords.

The Normal candidate #74 already separates the policies as `setup ? 6 : 4`. Engineering applied the same rule to Team Lite #76. Existing 4–5 character passwords remain valid for login, while new first-access enrollment requires six characters. This is candidate-only; production remains unchanged until a separately reviewed and explicitly approved coordinated rollout.

### Supabase read-only snapshot

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 Edge Functions. Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy screen-share v6.
- Isolated lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 33 migrations, `upstatus-signal-test` v32 and E2E helper v3. The lab has no chat/profile Storage buckets.
- Immediately before run `42386904302`, SELECT-only counts showed zero users, sessions, messages, chat reads, rooms, memberships, bindings, events, rate-limit buckets, call attempts and voice-room attempts. The authenticated integration/browser step is currently running; do not assume post-run cleanup until it completes and a new SELECT confirms zero.
- Production aggregate: five users, zero NULL/blank password hashes and roles; `messages.file_name` exists; chat/profile buckets are public with 20 MB limits and expected MIME allowlists.
- Production still lacks setup-invite objects, auth-specific rate limiter, signaling rate limiter and dedicated `upstatus-signal` function.
- Three production broadcast functions remain SECURITY DEFINER with `search_path=public`, EXECUTE for anon/authenticated and public Realtime publication. The message trigger publishes full OLD/NEW rows via `to_jsonb`.
- Nine backend-owned public tables retain ALL table privileges for anon/authenticated, including TRUNCATE. Default ACLs remain broad for objects created by postgres and supabase_admin.
- Security Advisor: three SECURITY DEFINER WARN for anon, three for authenticated and ten RLS-without-policy INFO; Performance and Health have no findings.

### Release gates and safety

- RT-01 public broadcasts/private Realtime cutover remains open.
- Dedicated full-product TEST project remains absent; the isolated signaling/auth lab is not a product TEST environment.
- AUTH-03 production cutover, route-level HTTP tests, distributed auth throttling and ACL/default-ACL remediation remain open.
- Issue #78 remains OPEN at 0/8 physical acceptance criteria. Real Tampermonkey offline/no-F5 recovery, browser-close recovery, physical microphone/display capture and installed Normal ↔ Team Lite compatibility remain MANUAL PENDING.
- Issue #79 remains OPEN. CI success is not human review or release approval.
- No production SQL write, migration, Edge Function deployment, secret/role/feature-flag change, fixture cleanup, PR merge, release or userscript publication occurred. Production queries were SELECT/catalog reads only. The only active fixture-mutating work is the explicitly allowlisted Team Lite candidate workflow above.

## Engineering checkpoint — 2026-11-07 live revalidation

This checkpoint supersedes the earlier 12:35 BRT snapshot for the refs and runtime observations below. The QA branch and `docs/RELEASE_READINESS.md` were read but not modified.

### GitHub candidates and exact-head CI

- **#74 Normal**: branch `chore/continuity-foundation`, base `master` `a9288ccfcb0f308d3a587bfca624418a395be07b`, current HEAD `27e8fdc4986f583a37fb6b0c5d2cf8df1bac3e02`, OPEN/Draft. Previous HEAD `7475a82` had Validate `42354944089` and Signaling Smoke `42354944038` SUCCESS. The new migration/test commits triggered Validate `42389921918` (IN_PROGRESS) and Signaling Smoke `42389921913` (PENDING at the last query); do not attribute the old PASS to the new HEAD.
- **#75 Team Lite baseline**: HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, OPEN/Draft; Candidate Checks `41674353127` is historical PASS. Current Team Lite work is #76.
- **#76 Team Lite**: HEAD `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7`, OPEN/Draft; Candidate Checks `42386904302` SUCCESS on the exact HEAD. Logs confirm 16/16 unauthenticated and 103/103 authenticated checks, call/voice/screen WebRTC with remote tracks, three-member mesh/teardown, 90 accepted + 1 HTTP 429 with `Retry-After: 60`, voice-room recovery/leave/rejoin tests, AUTH-03 edge cases, and fixture cleanup.
- **#80 continuity**: HEAD `cae135dc440a242588124fa97f388fd02fdbfb5f`, OPEN/Draft; Validate `42387127638` fails at `client signed upload helper missing`. This is an inherited develop-base contract: #80 changes only `UPSTATUS_HANDOFF.md` and `docs/CURRENT_STATE.md`; the helper is in candidate #84 and is not integrated into develop.
- **#82 independent QA**: HEAD `e57177325be8294533d5c2beb332124bff063a4e`, OPEN/Draft; Validate `42387782891` fails at `production updateURL mismatch` inherited from master. Candidate #85 corrects the builder/validator contract but is not integrated into master. QA branch and release-readiness document remain untouched.
- **#84 TEST isolation**: HEAD `21341f331270e142bdf7584c1cdf16e6011e41b3`, OPEN/Draft; Validate `42387042361` SUCCESS. This proves static/preflight guards only; no manual dispatch or real Management API call occurred.
- **#85 master stabilization**: HEAD `17554523ef51bafd503e74b3f1271d55f43a6eda`, OPEN/Draft; Validate `42386047749` SUCCESS. Signed-upload client/server VM and chat regressions passed; no real Storage upload occurred.

All seven PRs remain open and Draft, with no submitted human reviews. CI PASS is not merge/release approval.

### New broadcast-trigger hardening candidate in #74

- Added `supabase/migrations/20261107170000_pin_empty_search_path_trigger_broadcasts.sql`, which changes only the function-level `search_path` of the three trigger-only SECURITY DEFINER broadcast functions to empty. Their bodies remain unchanged; `realtime.send` is schema-qualified, built-ins resolve through `pg_catalog`, trigger bindings and grants are not modified.
- Added isolated counterpart `supabase/test-migrations/20261107170000_pin_empty_search_path_trigger_broadcasts_test.sql`. It asserts SECURITY DEFINER remains set, the function search path is empty, `anon`/`authenticated` cannot directly EXECUTE, `service_role` retains EXECUTE, `realtime.send` stays schema-qualified, and each function remains attached to a trigger.
- Added a migration-layout regression and documented the test migration's strict lab-only target. Commits: `f74b3bd` (production candidate), `0f7e05d` (isolated test), `81b09c3` (regression), `27e8fdc` (test-migration safety note).
- The isolated project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY`; a SELECT-only preflight found zero rows in all 11 fixture categories. However, the new #74 Signaling Smoke run `42389921913` is queued and shares this project. No manual migration or trigger probe was run while that workflow could own the lab. After it finishes, recheck the exact project and fixture counts before applying the test-only migration.

### Supabase production — read-only snapshot

- Production `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`, seven migrations, 38 Edge Functions. Deployed core functions: Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy screen-share v6. The organization still has only production and the signaling/auth lab; there is no full-product TEST project.
- The live production broadcast functions were queried directly: all three remain SECURITY DEFINER with `search_path=public`, EXECUTE effective for `anon` and `authenticated`, and public `realtime.send(..., false)`. `upstatus_broadcast_messages()` still publishes `to_jsonb(OLD/NEW)` including message content/metadata. The new empty-search-path migration is candidate-only and does not address the public payload/channel blocker by itself.
- Nine backend-owned tables still show RLS enabled plus broad `anon`/`authenticated` SELECT/INSERT/UPDATE/DELETE/TRUNCATE privileges. RLS currently has no policies on those tables; grants are unnecessary privilege surface, not proof of direct row access. Default ACL rows remain broad for both `postgres` and `supabase_admin`.
- Production aggregate remains five users, zero empty password hashes, zero empty roles. `chat-images` and `profile-images` are public buckets with 20 MB limits and MIME allowlists. Signed-upload tests are still mocks; public bucket configuration means signed upload does not make object reads private.
- Security Advisor: three WARN for `anon` EXECUTE, three WARN for `authenticated` EXECUTE, and ten INFO for RLS-enabled/no-policy tables. Performance/Health had no findings in the latest read.

### Release gates and safety

- RT-01 remains BLOCKED: production still broadcasts full message rows and metadata on a public topic. The candidate payload-minimization migrations have not been applied to production; private Realtime still needs a trusted JWT or server-mediated replacement for remaining event families.
- Full-product TEST remains absent. AUTH-03 production cutover, distributed auth throttling, production migration/rollback, `supabase_admin` default ACL remediation, and real Storage integration remain open.
- Issue #78 remains OPEN with 0/8 physical criteria approved. The latest Team Lite CI includes offline/online recovery tests, but it does not replace real Tampermonkey/network-loss acceptance or physical microphone/display capture.
- No production SQL write, migration, Edge Function deployment, secret/role/grant/policy/ACL/flag change, PR merge, release, fixture cleanup, or userscript publication occurred. Production access was read-only. The lab was queried read-only and is currently reserved by the queued #74 smoke workflow.

## CI follow-up — 2026-11-07

- PR #74 exact HEAD `27e8fdc4986f583a37fb6b0c5d2cf8df1bac3e02`: Validate [42389921918](https://github.com/Reekyi/UpStatus/actions/runs/42389921918) completed SUCCESS. Logs confirm TEST target guard, migration-layout guard (including the new empty-search-path migration contract), enrollment static checks, chat/updater regressions, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- PR #74 Signaling Smoke [42389921913](https://github.com/Reekyi/UpStatus/actions/runs/42389921913) remains PENDING with no jobs at the latest query. It shares the isolated fixture project, so the manual test migration and trigger probe remain deferred until that workflow finishes and a fresh SELECT confirms cleanup.
- PR #80 exact HEAD `145581a7fe126fe502355b15d02d594a2ce9887d`: Validate [42390030876](https://github.com/Reekyi/UpStatus/actions/runs/42390030876) failed again at the inherited develop-base contract `client signed upload helper missing`. PR #80 remains documentation-only; no validator was weakened.
- PR #82 remains at `e57177325be8294533d5c2beb332124bff063a4e`; Validate [42387782891](https://github.com/Reekyi/UpStatus/actions/runs/42387782891) remains failed at the inherited master-base contract `production updateURL mismatch`. The #85 correction remains candidate-only.

## Latest continuity CI follow-up — 2026-11-07

- PR #80 current HEAD `9202a4d0abb786be02fc656e765310f785a6a385` received Validate [42390098833](https://github.com/Reekyi/UpStatus/actions/runs/42390098833), which failed at the same inherited develop-base assertion `client signed upload helper missing`. The changed files remain documentation-only; no validator was weakened. The helper is candidate-only in PR #84 and is not yet part of `develop`.
- PR #74 current HEAD `27e8fdc4986f583a37fb6b0c5d2cf8df1bac3e02` still has Validate [42389921918](https://github.com/Reekyi/UpStatus/actions/runs/42389921918) SUCCESS and Signaling Smoke [42389921913](https://github.com/Reekyi/UpStatus/actions/runs/42389921913) PENDING with no jobs. Keep the isolated lab reserved; do not apply the new test migration until the smoke workflow finishes and post-run fixture counts are rechecked.


## Engineering checkpoint — 2026-11-07 13:56 BRT (live revalidation)

This entry supersedes the previous 12:35 BRT/16:14 UTC snapshots for the refs, workflows, and isolated database evidence below. PR #82's QA branch and `docs/RELEASE_READINESS.md` were read but not edited.

### Exact GitHub refs and CI

| PR | HEAD | Base | Ahead / behind | Exact-head workflow |
|---|---|---|---:|---|
| #74 Normal | `27e8fdc4986f583a37fb6b0c5d2cf8df1bac3e02` | `master` | 843 / 0 | Validate [42389921918](https://github.com/Reekyi/UpStatus/actions/runs/42389921918) SUCCESS; Signaling Smoke [42389921913](https://github.com/Reekyi/UpStatus/actions/runs/42389921913) SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | 59 / 0 | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical SUCCESS |
| #76 Team Lite | `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7` | `team-lite-official` | 313 / 0 | Candidate Checks [42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302) SUCCESS |
| #80 continuity | `61595a186108a3bdc6d8e0db9a9a653ea88eaa6e` | `develop` | 196 / 0 | Validate [42390166606](https://github.com/Reekyi/UpStatus/actions/runs/42390166606) FAILURE: inherited `client signed upload helper missing` |
| #82 independent QA | `6b5bf481ac68602f3ff45e6af225bb92d6eabff5` | `master` | 102 / 0 | Validate [42392158080](https://github.com/Reekyi/UpStatus/actions/runs/42392158080) FAILURE: inherited `production updateURL mismatch` |
| #84 TEST isolation | `21341f331270e142bdf7584c1cdf16e6011e41b3` | `develop` | 30 / 0 | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) SUCCESS |
| #85 master stabilization | `17554523ef51bafd503e74b3f1271d55f43a6eda` | `master` | 21 / 0 | Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) SUCCESS |

All seven PRs remain OPEN, Draft, unmerged, and have zero submitted human reviews. #76 is the current Team Lite continuation of #75, not an independent release candidate. #80 changes only `UPSTATUS_HANDOFF.md` and `docs/CURRENT_STATE.md`; its Validate failure is inherited from develop. #82 changes only QA documentation; its failure is the old master validator contract, not proof of a bad URL in the #74 candidate.

Normal Smoke logs on exact HEAD #74 show 129/129 authenticated integration checks, call/voice/screen WebRTC with remote tracks, three-member mesh/teardown, 90 accepted + 1 HTTP 429 with `Retry-After: 60s`, concurrent room/voice-attempt lifecycle cases, AUTH-03 wrong/malformed/expired/replayed-token and one-winner checks, role fallback/preservation/padded-admin non-escalation, and fixture cleanup. Team Lite exact-head logs show 103/103 authenticated checks, call/voice/screen WebRTC, three-member mesh, 90 + 1 HTTP 429/`Retry-After: 60s`, durable voice leave/rejoin/offline-online/pagehide recovery tests, AUTH-03 and cleanup.

### Branch governance and TEST workflow

The GitHub branch API currently reports `protected=false` for both `master` and `develop`; required status-check enforcement is off. No branch-protection or ruleset settings were changed.

The live `develop` branch still contains the old push-triggered TEST deploy workflow using shared `SUPABASE_PROJECT_ID`. The safer manual-only, TEST-specific, metadata-verified, exact-dispatch-SHA workflow exists only in Draft PR #84. Do not dispatch the old workflow or assume #84 is active in develop. The organization still has no full-product TEST project, and Team Lite has no separate full-product TEST function/workflow.

### Supabase inventory and isolated search-path test

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 active Edge Functions. Core versions remain Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, and legacy screen-share v6.
- Isolated lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. The organization still has only these two projects.
- Before the isolated test migration, all 11 application fixture categories were zero and the GitHub Actions API showed no queued/in-progress runs. The isolated-only counterpart `20261107170000_pin_empty_search_path_trigger_broadcasts_test.sql` was applied to this exact allowlisted project; the migration ledger now records `20261107165942 pin_empty_search_path_trigger_broadcasts_test`. Production migrations were not touched.
- Post-migration catalog verification: all three broadcast functions remain SECURITY DEFINER; each has empty function `search_path`; each remains attached to its original trigger; `realtime.send` remains schema-qualified; `anon` and `authenticated` cannot EXECUTE; `service_role` can EXECUTE.
- All 11 application fixture counts plus `realtime.messages` were zero after the test.

### Trigger probe limitation discovered in the isolated lab

A transactional DML probe exercised message insert, remote-state insert, and user-status update with a sentinel exception that rolled back the entire subtransaction. The trigger functions ran under empty `search_path`, but `realtime.send` logged and swallowed `WarnSendingBroadcastMessage: no partition of relation "messages" found for row`; no Realtime rows were inserted. The probe therefore did **not** prove end-to-end broadcast delivery, and no persistent fixture or Realtime row remained.

Catalog inspection explains the limitation: the isolated project's partitioned `realtime.messages` relation has no child partitions. Production has daily child partitions for 2026-11-03 through 2026-11-09, including the current date. Neither project reports `pg_cron` or `pg_partman` installed. Do not create partitions manually in Supabase-managed schemas as an ad-hoc fix. The isolated test migration proves the function configuration/grants/bindings; a separate supported Realtime lab setup is needed for delivery testing.

### Production security snapshot — read only

Production broadcast functions still have `search_path=public`, effective EXECUTE for `anon` and `authenticated`, and public Realtime sends. The message function still serializes the full row with `to_jsonb`; the candidate empty-search-path migration does not remove payloads or make channels private. Security Advisor at 2026-11-07 16:58 UTC reports 3 SECURITY DEFINER WARN for anon, 3 for authenticated, and 10 RLS-without-policy INFO; Performance and Health have no findings. Nine backend-owned tables retain excessive client grants (including TRUNCATE), and default ACL remediation remains open.

### Release gates and manual acceptance

- RT-01: remove full-row/public broadcasts and complete a coordinated authenticated/private Realtime or server-mediated cutover.
- Provision a full-product TEST project and a separate Team Lite TEST runtime/workflow; do not repurpose production or the signaling/auth lab.
- Complete AUTH-03 HTTP issuance/non-admin denial/token-delivery tests and a distributed fail-closed auth limiter.
- Resolve grants/default ACLs through the correct owner/admin path.
- Validate real Storage behavior and decide whether public bucket reads are acceptable for chat documents.
- Issue #78 remains OPEN at 0/8 physical criteria. Real Tampermonkey network loss/no-F5 recovery, browser termination while offline, physical microphone/display capture, and installed Normal ↔ Team Lite acceptance remain MANUAL PENDING.
- Reconcile the stale body of issue #79; the latest engineering checkpoint comment is the live source until the checklist body is deliberately reconciled.

### Safety

Only the isolated test migration above was applied. Production SQL was SELECT/catalog-only. No production migration/write, deploy, Edge Function change, secret/role/grant/policy/ACL/flag change, fixture cleanup, workflow dispatch/rerun/cancel, PR merge, release, userscript publication, or branch-protection change occurred. No QA branch or QA file was modified.


## Engineering checkpoint — 2026-11-07 live revalidation and signed-upload contract hardening

This checkpoint supersedes the earlier 13:56 BRT snapshot for current refs, CI, and database observations below. PR #82's latest QA report (18:26 UTC) was read; the QA branch and its release-readiness files were not modified.

### Exact PR refs and comparisons

| PR | Current HEAD | Base | Ahead / behind | Exact-head CI |
|---|---|---|---:|---|
| #74 Normal | `4e192fe77c7fbc3b60c6aa20aea4fb957d232aa8` | `master` | 844 / 0 | Validate [42404360046](https://github.com/Reekyi/UpStatus/actions/runs/42404360046) FAILURE at stale build-target assertion; Signaling Smoke [42404359973](https://github.com/Reekyi/UpStatus/actions/runs/42404359973) PENDING |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | 59 / 0 | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical SUCCESS |
| #76 Team Lite | `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7` | `team-lite-official` | 313 / 0 | Candidate Checks [42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302) SUCCESS |
| #80 continuity | `11fab9f0374323b63d3950d0682b31203187fc4b` | `develop` | 197 / 0 | Validate [42394419231](https://github.com/Reekyi/UpStatus/actions/runs/42394419231) FAILURE: inherited `client signed upload helper missing` |
| #82 independent QA | `31072bf55dbd6dc58079641e35891491c6e3a2c6` | `master` | 106 / 0 | Validate [42401762317](https://github.com/Reekyi/UpStatus/actions/runs/42401762317) FAILURE: inherited `production updateURL mismatch` |
| #84 TEST isolation | `21341f331270e142bdf7584c1cdf16e6011e41b3` | `develop` | 30 / 0 | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) SUCCESS |
| #85 master stabilization | `17554523ef51bafd503e74b3f1271d55f43a6eda` | `master` | 21 / 0 | Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) SUCCESS |

#76 is 254 commits ahead of #75 and zero behind; #75 remains the historical baseline, not a second independent release candidate. All seven PRs remain OPEN, Draft, unmerged, and have zero submitted human reviews.

The #74 candidate is 844 commits ahead of master. #80 is documentation-only and remains blocked by the develop-base validator. #82 is QA-documentation-only; its current failure is the master-base updater assertion, not a reason to weaken validation.

### New Normal signed-upload findings and candidate changes

Reviewing the exact #74 source against the #85 hardening tests found a real client/server contract gap:

- The Normal client already called `/api/chat/upload-url` and `/api/profile/avatar-upload-url`, but its helper did not bind the route to the expected bucket, verify ticket MIME/size, validate project origin/object path/public URL/token consistency, or omit browser credentials and redirects on the Storage PUT.
- The Normal server's `profileRoute` ignored `avatarUrl` and always attempted the legacy base64 `dataUrl` path, even though the UI sent the public URL returned by the signed upload. Profile avatar updates through the signed flow could therefore fail.
- The Normal server's signed-upload route returned Storage URLs without the same origin/path/token/public-URL validation already present in the #85 candidate.

The existing Draft #74 branch was updated incrementally (no QA branch touched):
- Server: validate the signed upload URL origin, bucket route, decoded object path, query token, and public URL; accept only same-project `profile-images` avatar URLs while preserving the legacy data-URL fallback.
- Client: validate allowed route, expected bucket, MIME, size, HTTPS project origin, upload/public paths, token equality, and use `credentials: "omit"` plus `redirect: "error"`.
- Added `scripts/test-signed-upload-client.mjs` and `scripts/test-signed-upload-server.mjs`, both VM/mocked tests; wired them into `scripts/validate.mjs`.

The current #74 HEAD is `4e192fe77c7fbc3b60c6aa20aea4fb957d232aa8`. Validate currently stops before those new suites at `scripts/test-build-target-guard.mjs:73`: its assertion still requires the old literal fallback `new URL(UP_REALTIME_URL+'/storage/v1/object/upload/sign/'...)`. The hardened helper instead resolves `new URL(rawUploadUrl, base)` where `base = new URL(UP_REALTIME_URL)`, then requires both upload and public URL origins to equal `base.origin`. This is a stale implementation-specific assertion, not evidence of a wrong TEST target. Update the guard to assert the stronger origin-binding contract; do not remove the TEST-origin check.

The Signaling Smoke concurrency group serializes fixture-mutating suites. For this candidate, run 42404314379 (head `9293bbf`) was in progress at the last query, while runs 42404353806 (head `f205524`) and 42404359973 (head `4e192fe`) were pending. Do not start manual fixture tests or another mutating suite until the queue drains and fresh SELECT counts confirm cleanup.

### Latest QA report and issue coordination

The latest QA report file is `docs/audits/2026-11-07-upstatus-qa-audit-1826-utc.md` (blob `5ae306af922ed1295e7e595a5adc6bf4c02f3991`). It confirms Normal 129/129 authenticated checks and Team Lite 103/103, with both workflows' cleanup. Its recorded PR #82 head predates the report commit; the live branch HEAD is now `31072bf`, and the live Validate run is `42401762317`. The main `RELEASE_READINESS.md` still contains the earlier 02:35 UTC active-fixture snapshot; current SELECT-only counts below show zero, so QA should refresh its own branch when next running.

Issue #78 remains OPEN with 0/8 physical acceptance criteria. Real Tampermonkey network-loss/no-F5 recovery, browser termination while offline, physical microphone/display capture, and installed Normal ↔ Team Lite acceptance remain MANUAL PENDING.

### Current Supabase observations — read-only

- Organization inventory still contains only production `dlfvkawaiqduhlazsszm` and the isolated signaling/auth lab `bfpjtfqlnypisxljoxkb`; there is no full-product TEST project.
- Production: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 Edge Functions. Core functions remain Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy screen-share v6.
- Isolated lab: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migrations (latest `20261107165942 pin_empty_search_path_trigger_broadcasts_test`), two functions (`upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3).
- Latest SELECT-only lab fixture counts: zero rows in users, sessions, messages, chat reads, rooms, memberships, bindings, events, call attempts, voice attempts, rate-limit buckets, and `realtime.messages`.
- `realtime.messages` has seven leaf partitions and 50 rows in production, but zero leaf partitions and zero rows in the isolated lab. Do not create partitions manually in Supabase-managed schemas. Trigger delivery remains NOT VERIFIED in the lab.
- Lab broadcast functions retain SECURITY DEFINER with empty `search_path`, deny EXECUTE to anon/authenticated, and allow service_role. Production functions still use `search_path=public` and have EXECUTE effective for anon/authenticated/service_role.
- Production Security Advisor: three SECURITY DEFINER WARN for anon, three for authenticated, and ten RLS-without-policy INFO; Performance and Health have no findings. Lab Security Advisor: zero SECURITY DEFINER WARN, 17 RLS INFO; Performance has four unused-index INFO; Health has no findings.

### Active TEST deploy workflow and governance

The live `develop/.github/workflows/deploy-test.yml` blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839` still has a push trigger, shared `SUPABASE_PROJECT_ID`, job-wide access token, and no project-identity preflight. The safer manual-only, TEST-specific, exact-dispatch-SHA and Management-API-verified workflow remains candidate-only in Draft #84. Do not dispatch the old workflow.

The direct branch-protection API read returned HTTP 403 in this pass. A previous snapshot reported `protected=false` for master/develop, but current protection state could not be independently re-read with this connection; require an administrator to verify rulesets/required checks before integration.

### Release gates and safety

- Resolve the Normal signed-upload guard assertion, then require the new client/server VM suites and exact-head Validate to pass.
- Wait for the serialized Signaling Smoke queue; verify zero fixtures after it drains.
- Provision a supported full-product TEST project and a separate Team Lite TEST runtime/workflow.
- Complete RT-01 authenticated/private or server-mediated Realtime cutover; production still sends public broadcasts and full-row chat payloads.
- Complete AUTH-03 HTTP route/denial/token-delivery coverage, distributed fail-closed auth rate limiting, grant/default-ACL remediation, and real Storage policy decisions/tests.
- Obtain human reviews and complete physical #78 acceptance before any release decision.

No production SQL write, migration, Edge Function deployment, secret/role/grant/policy/ACL/flag change, workflow dispatch/cancel/rerun, PR merge, release, userscript publication, or destructive operation occurred. All production SQL was SELECT/catalog-only; the isolated project was also queried read-only in this pass. No QA branch or QA file was modified.

 
### Post-checkpoint follow-up — Normal signed-upload contract, exact-head CI

- PR #74 advanced to HEAD `d949c4b765e77b80d01d3115e76c35555f28949b`. The signed-upload client/server hardening and two VM regression suites are now included in the candidate.
- Validate [42404667942](https://github.com/Reekyi/UpStatus/actions/runs/42404667942) completed SUCCESS on that exact HEAD. Logs explicitly report:
  - `PASS signed-upload client validates route, bucket, MIME, size, project origin, object path, one-time token, PUT contract, and UI wiring.`
  - `PASS signed-upload server validates bucket, path, token, MIME, size, HTTPS origin and profile compatibility.`
  - `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- The stale TEST Storage fallback assertions in both `scripts/test-build-target-guard.mjs` and `scripts/validate.mjs` were replaced with checks that relative signed URLs resolve against `UP_REALTIME_URL`, and upload/public origins plus bucket/object paths remain bound to that project. This strengthens the invariant; it does not remove TEST isolation checks.
- Signaling Smoke [42404668009](https://github.com/Reekyi/UpStatus/actions/runs/42404668009) remains PENDING in the serialized fixture queue. Earlier #74 Smoke run [42404314379](https://github.com/Reekyi/UpStatus/actions/runs/42404314379) was still in progress, with intermediate runs [42404353806](https://github.com/Reekyi/UpStatus/actions/runs/42404353806) and [42404359973](https://github.com/Reekyi/UpStatus/actions/runs/42404359973) queued. Do not claim new-head Realtime Smoke or post-run cleanup until the queue drains.
- These upload tests are Node VM mocks, not real Supabase Storage E2E. The lab still has no Realtime child partitions and cannot prove trigger-to-WebSocket delivery.

PR #80 remains documentation-only at HEAD `66ccf5beb9a1ec22dec1a385ef6e19e362385af3`. Its Validate [42404747943](https://github.com/Reekyi/UpStatus/actions/runs/42404747943) failed at the inherited develop assertion `client signed upload helper missing` (`scripts/validate.mjs:55`); no validator was weakened. PR #82 remains at `31072bf`, with inherited master updater assertion failure [42401762317](https://github.com/Reekyi/UpStatus/actions/runs/42401762317).

No production writes or deployment occurred. The QA branch and release-readiness files remain untouched.


## 2026-11-07 16:59 BRT — live engineering revalidation and completed CI queue

This checkpoint supersedes earlier 2026-11-07 snapshots in this file. Runtime evidence is tied to the exact code SHAs below; the documentation-only commit that appends this section does not change runtime code.

### GitHub — current candidate refs before this documentation refresh

| PR | Candidate HEAD | Base | State / latest relevant CI |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `d949c4b765e77b80d01d3115e76c35555f28949b` | `master` | Open/Draft; Validate [42404667942](https://github.com/Reekyi/UpStatus/actions/runs/42404667942) PASS; Signaling Smoke [42404668009](https://github.com/Reekyi/UpStatus/actions/runs/42404668009) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | Open/Draft; Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS; superseded by #76 |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7` | `team-lite-official` | Open/Draft; Candidate Checks [42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302) PASS |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `303db1bb3f808b4188824f48828655867c7d8bc6` | `develop` | Open/Draft; Validate [42404810032](https://github.com/Reekyi/UpStatus/actions/runs/42404810032) FAIL at inherited `client signed upload helper missing` (`scripts/validate.mjs:55`) |
| [#82 independent QA](https://github.com/Reekyi/UpStatus/pull/82) | `2c5544e5711ee7d8eef5103d1416749a87969cb1` | `master` | Open/Draft; Validate [42407046039](https://github.com/Reekyi/UpStatus/actions/runs/42407046039) FAIL at inherited `production updateURL mismatch` (`scripts/validate.mjs:26`) |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | `develop` | Open/Draft; Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| [#85 master stabilization](https://github.com/Reekyi/UpStatus/pull/85) | `17554523ef51bafd503e74b3f1271d55f43a6eda` | `master` | Open/Draft; Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) PASS (Storage remains mocked) |

All seven PRs remain open/Draft, unmerged and without human approvals. Live compare counts at this check: #74 851 ahead/0 behind master; #75 59 ahead/0 behind team-lite-official; #76 313 ahead/0 behind team-lite-official and 254 ahead/0 behind #75; #80 200 ahead/0 behind develop; #82 107 ahead/0 behind master; #84 30 ahead/0 behind develop; #85 21 ahead/0 behind master. Review the large #74/#76 ancestry and overlap before any future integration; CI success is not merge approval.

### Exact-head test evidence

- Normal #74: Validate and Signaling Smoke both passed on runtime HEAD `d949c4b`. Smoke logs show 129/129 authenticated checks; real-browser call/voice/screen WebRTC remote tracks; three-member mesh and teardown; 90 accepted + one 429 with `Retry-After: 60s`; rate-limit concurrency; atomic receipt concurrency; setup-enrollment token/role/replay/concurrency checks; and isolated fixture cleanup. The same log confirms durable pagehide/reload call-room leave recovery, pre-prepare call-ID persistence, storage-failure fail-closed behavior and logout gating.
- Team Lite #76: Candidate Checks passed on `2e0ff69`; logs show 16/16 unauthenticated and 103/103 authenticated checks, call/voice/screen WebRTC, three-member mesh, 90+1/429 with Retry-After, rate-limit/receipt concurrency, setup enrollment, durable pagehide/reload recovery and cleanup.
- These browser tests exercise the isolated backend and Chromium harness. They do not install both userscripts in real Tampermonkey profiles or simulate a physical internet outage. Issue #78 remains OPEN at 0/8 physical acceptance criteria.

### Supabase — fresh read-only state

- Organization contains exactly two projects: production `dlfvkawaiqduhlazsszm` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active Edge Functions) and isolated lab `bfpjtfqlnypisxljoxkb` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migrations through `20261107165942`, two test Edge Functions). There is no independent full-product TEST project. Production core functions remain `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15 and legacy screen-share v6.
- Lab after the completed CI queue: zero users, messages, sessions, rooms, memberships, events, bindings, rate-limit rows, call attempts, voice attempts and chat-read rows; `realtime.messages` has 0 rows and 0 child partitions. Its three broadcast functions remain SECURITY DEFINER with empty `search_path`, direct EXECUTE denied to anon/authenticated and retained for service_role.
- Production `realtime.messages` has 50 rows and 7 child partitions. Its three broadcast functions remain SECURITY DEFINER with `search_path=public` and direct EXECUTE effective for anon/authenticated/service_role. `upstatus_broadcast_messages()` serializes the full OLD/NEW row with `to_jsonb` and calls `realtime.send(..., false)`; remote-state and user-status also publish metadata to the public topic.
- Nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) grant anon/authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE. Default ACLs for postgres/public+storage and supabase_admin/public+graphql+graphql_public remain broad. RLS without policies does not protect TRUNCATE.
- Production lacks `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts`, `open_upstatus_signal_voice_room` and `leave_upstatus_signal_room`. Both product server templates still lack a call to the distributed rate-limit RPC. Security Advisor: 3 WARN for anon + 3 WARN for authenticated (the same three broadcast functions), and 10 INFO for RLS-enabled tables without policies; Performance and Health advisors are empty.

### Operational and release blockers

- The current `develop` `.github/workflows/deploy-test.yml` still triggers on push and uses the shared `SUPABASE_PROJECT_ID`; the safer manual-only, TEST-specific, SHA-pinned workflow exists only in Draft PR #84. Do not dispatch the old workflow. The secret value was not read.
- The current branch-protection state could not be revalidated because the administrative GitHub API returned HTTP 403; do not treat an older snapshot as current.
- #80 and #82 failures are base-branch validator mismatches, not new doc regressions. Do not weaken the assertions. #84 and #85 are still candidates, not integrated fixes.
- RT-01 public Realtime/full-row disclosure, product rate-limit integration, production migrations/cutover/rollback, official TEST provisioning, real Storage E2E, human review and physical #78 acceptance remain open.

No production SQL write, migration, Edge Function deployment, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication or destructive operation occurred. Production SQL was SELECT/catalog-only. The shared lab was inspected read-only after CI cleanup; no manual fixture cleanup or overlapping test was started.


## 2026-11-07 21:10 UTC — Team Lite authenticated voice leave regression

This checkpoint supersedes earlier PR/CI snapshots in this file where the exact HEAD differs. All refs and workflows below were re-fetched from GitHub; production SQL was SELECT/catalog-only.

### Exact PR heads and CI

| PR | HEAD | Current evidence |
|---|---|---|
| #74 Normal | `a79ec9a922eaa064d2982bf650dbd7a6d186e9bd` | Validate [42409229531](https://github.com/Reekyi/UpStatus/actions/runs/42409229531) PASS; Signaling Smoke [42409229487](https://github.com/Reekyi/UpStatus/actions/runs/42409229487) SUCCESS |
| #75 baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical PASS only |
| #76 Team Lite | `26122c55fd453882f92094e12c09914d77b11b07` | Candidate Checks [42414281711](https://github.com/Reekyi/UpStatus/actions/runs/42414281711) IN_PROGRESS; durable voice-leave regression step PASS; authenticated integration/browser step still running |
| #80 continuity | `46063a7c6330ddd080056c22780616d076908de5` | Validate [42409234616](https://github.com/Reekyi/UpStatus/actions/runs/42409234616) FAIL at inherited develop assertion `client signed upload helper missing` |
| #82 independent QA | `8fd27d0c30d188a65d1ce6e6a44778de109035eb` | Validate [42412118724](https://github.com/Reekyi/UpStatus/actions/runs/42412118724) FAIL at inherited master assertion `production updateURL mismatch` |
| #84 TEST isolation | `21341f331270e142bdf7584c1cdf16e6011e41b3` | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| #85 master stabilization | `17554523ef51bafd503e74b3f1271d55f43a6eda` | Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) PASS; Storage remains mocked |

All seven PRs remain open/Draft, unmerged and without human approvals. Current compare counts: #74 852 ahead/0 behind master; #75 59/0 team-lite-official; #76 314/0 team-lite-official; #80 201/0 develop; #82 108/0 master; #84 30/0 develop; #85 21/0 master. The large #74/#76 ancestry still requires careful overlap/review before any integration.

### Team Lite voice leave — QA finding reconciled against current source

Fresh inspection of #76 HEAD `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7` found the current artifact blob `0e0660a6abc26052e67b9b1832a75fde7bc0b06e`. Its active authenticated `voiceRoomLeave()` path stops the room poller, sends and awaits the final leave signal, calls `leavingTransport.leave(leavingRoomId)`, and clears room/owner/prepared/roster state only after server confirmation. A rejected leave retains the room ID for retry. The QA note referenced a different artifact blob (`516b22afba2e8bd05871993be702c47ea4cca2d8`), so its described missing RPC call is not present in the currently fetched artifact.

The prior candidate-check VM test used `signalTransport: null` and therefore exercised only the legacy leave-signal path. Added an authenticated active-leave regression to `scripts/team-lite-voice-room-attempt-recovery.test.mjs` in commit [26122c5](https://github.com/Reekyi/UpStatus/commit/26122c55fd453882f92094e12c09914d77b11b07). It verifies poller stop, final-signal ordering, waiting for the `/room/leave` RPC, confirmed state cleanup, failed-leave state retention and successful retry. The exact workflow has passed the static/durable-voice test step; full Candidate Checks remains in progress. QA was notified in PR #82 comment [6713033198](https://github.com/Reekyi/UpStatus/pull/82#issuecomment-6713033198). No QA branch or `docs/RELEASE_READINESS.md` was changed.

### Supabase read-only snapshot

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 ACTIVE Edge Functions; core versions Normal `upstatus` v480, TEST v281, Team Lite v15 and legacy screen-share v6. `public.users`: 5 rows, 0 NULL/empty password hashes, 0 missing roles, 3 explicit admins.
- Production broadcast functions remain SECURITY DEFINER with `search_path=public`; direct EXECUTE is true for anon/authenticated/service_role. `realtime.messages` has 7 child partitions and 50 rows. Nine backend-owned tables retain broad anon/authenticated grants including TRUNCATE. Default ACLs for postgres/public+storage and supabase_admin/public+graphql+graphql_public remain broad.
- Production still lacks setup-invite columns/RPC, auth-specific rate-limit table/RPC, signaling rate-limit table/RPC, atomic chat-read merge RPC and voice open/leave RPCs. Deployed Normal and Team Lite retain the legacy public setup path and name-based initial-admin fallback; the current five accounts are initialized, so this is latent future onboarding risk, not evidence that a current account is claimable.
- Isolated lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migrations; `upstatus-signal-test` v32 and E2E helper v3. A SELECT-only post-run snapshot before the new queued workflow found zero rows in users, sessions, rooms, memberships, events, bindings, rate limits, call attempts, voice attempts, chat reads and messages. `realtime.messages` has 0 rows and 0 child partitions. The three broadcast functions have empty search_path and EXECUTE only for service_role; setup-invite, signaling rate-limit, receipt-merge and voice-room RPCs are also service_role-only.
- Production Security Advisor: 3 WARN anon + 3 WARN authenticated for the three broadcast functions; 10 RLS-without-policy INFO. Performance and Health advisors are empty. Lab Security Advisor: 17 RLS-without-policy INFO and no SECURITY DEFINER WARN.

### Remaining release gates

RT-01 public/full-row broadcasts and private Realtime authorization; product integration of distributed signaling and auth rate limits; route-level AUTH-03 invite issuance/denial/token-leakage tests; official full-product TEST provisioning; real Storage E2E; table grants/default ACL remediation; production migration/cutover/rollback; human review; and physical Issue #78 acceptance (still 0/8). The old push-triggered develop TEST workflow remains a risk until #84's manual-only, TEST-specific, SHA-pinned workflow is integrated. Branch-protection state could not be revalidated because the administrative GitHub API returned HTTP 403.

No production SQL write, migration, Edge Function deployment, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication or destructive operation occurred. The shared lab is currently owned by Candidate Checks run [42414281711](https://github.com/Reekyi/UpStatus/actions/runs/42414281711); do not start another fixture-mutating suite until it completes and cleanup is checked.


## 2026-11-07 21:12 UTC — #80 documentation-head follow-up

The checkpoint above was committed as HEAD `fbbd80f0a75e1f1df4ec469337c85fdfead19024`. Its exact Validate [42414485760](https://github.com/Reekyi/UpStatus/actions/runs/42414485760) completed FAILURE at the inherited develop-base assertion `client signed upload helper missing` (confirmed in the job log). This is the same base mismatch recorded above, not a failure in the documentation change. PR #80 remains open/Draft; compare is now 202/0 ahead/behind develop. No product code was copied into the continuity branch and no validator was weakened.


## 2026-11-07 21:13 UTC — Team Lite Candidate Checks completed

PR #76 exact HEAD `26122c55fd453882f92094e12c09914d77b11b07` completed Candidate Checks [42414281711](https://github.com/Reekyi/UpStatus/actions/runs/42414281711) **SUCCESS**. All workflow steps passed, including the new authenticated active voice-room leave regression. The exact job log confirms 103/103 authenticated integration checks; open voice late join across Normal/Team Lite aliases, idempotency, owner handoff, capacity and leave/close races; Chromium call/voice/screen WebRTC with remote tracks; three-member mesh and teardown; 90 accepted + one HTTP 429 with `Retry-After: 60s`; distributed rate-limit concurrency; atomic chat receipt concurrency; setup-invite malformed/wrong/expired/replayed token and one-winner checks; migration layout and Team Lite version/portal/updater checks.

A SELECT-only post-run snapshot on isolated project `bfpjtfqlnypisxljoxkb` confirmed zero rows in all 11 fixture categories (users, sessions, rooms, memberships, events, bindings, rate limits, call attempts, voice attempts, chat reads and messages), plus zero rows/child partitions in `realtime.messages`. No manual cleanup was performed.

This is exact-head isolated CI evidence, not physical Tampermonkey acceptance. Issue #78 remains OPEN at 0/8 physical criteria; no real network outage/no-F5, hardware microphone/display permission or installed cross-product test was performed. Production remains unchanged.


## 2026-11-07 22:08 UTC — AUTH-03 route-level regression and live revalidation

### Candidate heads and exact CI
- **#74 Normal** HEAD `18dd3e7dd64f57fe81cab03b9aa59158188d8772`: Validate [42419107639](https://github.com/Reekyi/UpStatus/actions/runs/42419107639) SUCCESS. The shared-lab Signaling Smoke [42419107700](https://github.com/Reekyi/UpStatus/actions/runs/42419107700) is pending behind Team Lite's serialized Candidate Checks. Its preceding runtime head `d949c4b` passed full Smoke [42404668009](https://github.com/Reekyi/UpStatus/actions/runs/42404668009); the current commit changes the auth test harness only.
- **#76 Team Lite** HEAD `fc49eb804457a159a1c066faf6203dbc6fb5a9da`: Candidate Checks [42419070366](https://github.com/Reekyi/UpStatus/actions/runs/42419070366) is in progress. The new first-access route test step passed; authenticated integration/browser, rate-limit, receipt, invite-consumption and cleanup steps have not yet completed.
- **#75 baseline** remains historical PASS on `7bbf9b9`.
- **#80 continuity** HEAD `f6aa0c6`: Validate [42414693267](https://github.com/Reekyi/UpStatus/actions/runs/42414693267) FAIL at inherited develop assertion `client signed upload helper missing`.
- **#82 QA** HEAD `9d37db7`: Validate [42416350842](https://github.com/Reekyi/UpStatus/actions/runs/42416350842) FAIL at inherited master assertion `production updateURL mismatch`.
- **#84 TEST isolation** HEAD `21341f3`: Validate remains PASS [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361).
- **#85 master stabilization** HEAD `1755452`: Validate remains PASS [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749).

All seven PRs remain open, Draft, unmerged, and have zero submitted human reviews.

### AUTH-03 route-level test added
The shared `scripts/auth-enrollment.test.mjs` now extracts and executes the actual `admin()` and `issueSetupInvite()` handlers from each product server template in a Node VM with a deterministic database mock. It verifies:
- the route is behind the active-session guard and uses the session-derived caller name;
- missing, ordinary-user, and whitespace-padded admin roles are denied;
- denial occurs before request-body parsing or database updates;
- invalid and oversized target names are rejected;
- issuance generates a 256-bit token with a 15-minute expiry and only persists its one-way hash plus issuer/timestamps;
- only NULL/legacy-empty password rows are eligible; configured/missing targets return a generic 409 without a token;
- the handler does not log the raw token.

The test passed in Normal Validate [42419107639]. Team Lite's exact-head Candidate Checks has also passed its static enrollment-test step; its full run is still in progress. Three earlier Team Lite attempts failed only in the newly added test harness (regex escaping, VM source joining, then a deliberately weak mock hash that contained the raw token); those harness defects were corrected. The current exact-head run is the first one using the corrected one-way-hash mock.

### Current production and isolated-project evidence (read-only)
- Supabase organization currently has exactly two projects: production `dlfvkawaiqduhlazsszm` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions) and isolated `bfpjtfqlnypisxljoxkb` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migrations, 2 Edge Functions).
- Deployed Normal v480 and Team Lite v15 sources do **not** contain `/api/setup-invite`, `consume_upstatus_setup_invite`, or an auth-specific rate limiter. Their name-based initial-admin fallback remains in both live sources. Normal currently requires six characters for login/setup; Team Lite uses four for both. Five production users are initialized, with zero blank roles and three explicit admins; this is a latent onboarding/compatibility risk, not evidence of a currently claimable account.
- Production still has three SECURITY DEFINER broadcasts with `search_path=public` and EXECUTE for anon/authenticated/service_role; 7 child partitions and 50 rows in `realtime.messages`; nine backend-owned tables retain anon/authenticated grants including TRUNCATE; broad default ACLs remain. Security Advisor: 3 anon WARN + 3 authenticated WARN + 10 RLS INFO; Performance and Health are empty.
- The isolated project contains the candidate setup-invite, signaling-rate-limit, receipt-merge and voice-room RPCs, all with EXECUTE only for service_role. It still has zero `realtime.messages` partitions and zero rows. Its Security Advisor has 17 RLS INFO and no SECURITY DEFINER WARN.
- No third full-product TEST project exists.

### Workflow and governance
The live `develop` `.github/workflows/deploy-test.yml` still has both `workflow_dispatch` and `push`, uses shared `SUPABASE_PROJECT_ID`, and deploys `upstatus-test` without destination identity preflight. PR #84's candidate is manual-only, uses `SUPABASE_TEST_PROJECT_ID`, pins the dispatch SHA and validates the project via Management API. Neither workflow was dispatched.
GitHub branch API currently reports `master.protected=false` and `develop.protected=false`, with required checks disabled.

### Remaining gates
RT-01/public Realtime and private-channel JWT architecture; auth-specific distributed rate limiting and product endpoint integration; production migration/cutover/rollback; official full-product TEST; real Storage E2E; table/default ACL remediation; human reviews; and physical Issue #78 acceptance (still 0/8). No real Tampermonkey/network-loss/microphone/display-capture/cross-product manual test was performed.

Production remained read-only. No production SQL write, migration, Edge deployment, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication, or destructive operation occurred.


## 2026-11-07 22:11 UTC — Team Lite AUTH-03 route regression completed

PR #76 exact HEAD `fc49eb804457a159a1c066faf6203dbc6fb5a9da` completed Candidate Checks [42419070366](https://github.com/Reekyi/UpStatus/actions/runs/42419070366) **SUCCESS**. The new dynamic setup-invite route test passed in the Team Lite template. Full workflow evidence:
- 16/16 unauthenticated checks and 103/103 authenticated integration checks passed.
- Chromium WebRTC call, voice and screen negotiation; remote tracks; three-member mesh and teardown passed.
- Distributed endpoint limiter: 90 accepted, one HTTP 429 with `Retry-After: 60s`; concurrency and reset checks passed.
- Atomic chat-read receipt concurrency passed.
- Setup invite wrong/expired/replay/malformed-token cases, one-winner concurrency, NULL/empty/whitespace role fallback, explicit-role preservation, padded-admin non-escalation and cleanup passed.
- Durable voice-room active-leave/confirmation/retry, pagehide/reload recovery, screen-share recovery, Team Lite portal/session isolation, updater and version checks passed.
- Workflow cleanup verified temporary users, sessions, rooms, memberships and events.

The shared isolated project was not queried or modified after the workflow while Normal Smoke started. The Normal #74 exact-head Signaling Smoke [42419107700](https://github.com/Reekyi/UpStatus/actions/runs/42419107700) is still in progress: static harness and unauthenticated endpoint checks passed; authenticated browser/integration and subsequent steps remain pending. Do not claim current Normal head fully smoke-approved until that run completes.

The three earlier failed Team Lite attempts were confined to defects in the new test harness itself (regex escaping, VM script joining, and a fake hash that included the raw token); the corrected exact HEAD above is the successful run. No product runtime code changed in this test-only work.

No production write, migration, deploy, merge, release, flag/secret/role/ACL change or userscript publication occurred.


## 2026-11-07 22:13 UTC — latest continuity Validate result

The latest documentation checkpoint is HEAD `8c085c0cbdfd688d6da4e607c5eda904a7e39437`. Validate [42419519453](https://github.com/Reekyi/UpStatus/actions/runs/42419519453) completed FAILURE at the unchanged inherited develop-base assertion `client signed upload helper missing` in `scripts/validate.mjs:55`. This is the same base-contract mismatch, not a failure in the Markdown-only continuity update. PR #80 remains Draft and no product code or validator was changed.

At this point #76 exact-head Candidate Checks [42419070366](https://github.com/Reekyi/UpStatus/actions/runs/42419070366) is SUCCESS, while #74 exact-head Signaling Smoke [42419107700](https://github.com/Reekyi/UpStatus/actions/runs/42419107700) remains IN_PROGRESS after static and unauthenticated checks passed. The isolated lab is in use by that Normal Smoke; do not run another fixture-mutating suite or query cleanup counts until it finishes.


## 2026-11-07 23:10 UTC — AUTH-03 route-dispatch regression and live revalidation

### Exact candidate refs and CI

- Normal PR #74 HEAD `3ebebb40138d38d3d58f6b0bb62bf715ab650937`: Validate [42423999252](https://github.com/Reekyi/UpStatus/actions/runs/42423999252) **SUCCESS**. Its log confirms `normal setup-invite and first-setup route-dispatch checks passed` and `Validation OK: PROD 3.4.7 / TEST 3.4.7`. Signaling Smoke [42423999219](https://github.com/Reekyi/UpStatus/actions/runs/42423999219) remains **IN_PROGRESS**; do not claim exact-head smoke completion yet.
- Team Lite PR #76 HEAD `90f052acaea53e7692daed18a6b97ff443d44c23`: Candidate Checks [42424001881](https://github.com/Reekyi/UpStatus/actions/runs/42424001881) is **PENDING** behind the shared isolated-project concurrency group. The preceding runtime head `fc49eb8` passed Candidate Checks [42419070366](https://github.com/Reekyi/UpStatus/actions/runs/42419070366), 103/103 authenticated checks, but that pass predates the new route-dispatch regression.
- The new regression executes the exact candidate route-dispatch slice for `GET /api/account`, `POST /api/setup`, `POST /api/login`, and authenticated `POST /api/setup-invite`, together with the real candidate `token`, `userFromToken`, `contextName`, `account`, `admin`, `issueSetupInvite`, `login`, and `readBody` functions in Node VM. Database/session and Deno runtime boundaries are mocked. It covers unauthenticated 401 before body parsing, non-admin/padded-role/guest denial, issuer identity from the validated session rather than request JSON, generic public account response, malformed and rejected invite consumption, six-character first setup, hash-only token handoff, blank-role fallback, and verbatim preservation of non-empty explicit roles. This is route-dispatch VM evidence, **not** a live Deno HTTP or Supabase end-to-end test.
- Two intermediate failures were defects in this new harness only: guest fixture state was not activated, then the deterministic raw-token fixture collided with its fake hash. Both were corrected; latest Normal Validate passed. No product runtime file changed in this test-only follow-up.
- PR #75 remains historical baseline HEAD `7bbf9b9`, Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS.
- PR #80 HEAD `7514482c1a87261a5236f0fbcf974cda78f4b301`: Validate [42419572542](https://github.com/Reekyi/UpStatus/actions/runs/42419572542) **FAIL**, inherited `develop` assertion `client signed upload helper missing` at `scripts/validate.mjs:55`.
- PR #82 QA HEAD `a2b9e5c8e732689b57e8614b6c0539ee043124e2`: Validate [42421624574](https://github.com/Reekyi/UpStatus/actions/runs/42421624574) **FAIL**, inherited `master` assertion `production updateURL mismatch` at `scripts/validate.mjs:26`. QA branch and `docs/RELEASE_READINESS.md` were not edited.
- PR #84 HEAD `21341f3`: Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS. PR #85 HEAD `1755452`: Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) PASS with mocked Storage. All seven PRs remain open/Draft, unmerged, with zero human approvals.
- Current ancestry: #74 859 ahead/0 behind master; #76 323 ahead/0 behind team-lite-official and 260 ahead/0 behind #75; #80 207 ahead/0 behind develop; #82 110 ahead/0 behind master. These are large candidate branches and require explicit overlap/ancestry review before integration.

### Repository governance and deploy workflow

- Live branch API: `master` SHA `a9288ccfcb0f308d3a587bfca624418a395be07b`, `protected=false`; `develop` SHA `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`, `protected=false`.
- The current `develop/.github/workflows/deploy-test.yml` still has a push trigger and uses shared `SUPABASE_PROJECT_ID` without destination identity preflight. PR #84's candidate is manual-only, uses `SUPABASE_TEST_PROJECT_ID`, checks exact dispatch SHA and project metadata, and rejects production plus the signaling fixture project. Neither workflow was dispatched.

### Supabase read-only snapshot

- Only two projects exist: production `dlfvkawaiqduhlazsszm` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, 38 ACTIVE Edge Functions) and lab `bfpjtfqlnypisxljoxkb` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migration records, `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3). No full-product TEST project exists.
- Production aggregate users snapshot: five users, three explicit admins, zero NULL/empty password hashes, zero NULL/blank roles. This does not remove the latent first-setup risk in deployed code.
- Deployed Normal v480 and Team Lite v15 sources still use the legacy public `POST /api/setup` path and name-based admin fallback for an uninitialized/missing-role row. Neither deployed function has `/api/setup-invite`, `consume_upstatus_setup_invite`, or an auth-specific rate limiter. Live password minimums remain Normal 6 for both login/setup and Team Lite 4 for both; candidates use setup 6/login 4.
- Production broadcast functions remain SECURITY DEFINER with `search_path=public`, direct EXECUTE effective for anon/authenticated/service_role, and public broadcasts. `realtime.messages` has seven child partitions and 50 rows. The nine backend-owned tables still expose broad anon/authenticated grants including TRUNCATE, and default ACLs remain broad for postgres/public+storage and supabase_admin/public+graphql+graphql_public.
- Production Security Advisor observed 2026-11-07 23:03:42 UTC: 3 anon SECURITY DEFINER WARN, 3 authenticated SECURITY DEFINER WARN, and 10 RLS-without-policy INFO; Performance and Health returned no findings.
- Lab pre-run SELECT after the preceding failed harness attempts showed zero fixtures across 12 categories (users, sessions, rooms, memberships, events, bindings, rate limits, call attempts, voice attempts, chat reads, messages, Realtime rows) and zero Realtime partitions. The current Normal Smoke is using the shared lab; do not query cleanup counts or start another mutating suite until the serialized queue drains. The lab still cannot prove trigger-to-Realtime delivery because it has no managed `realtime.messages` child partitions.

### Acceptance and safety

- Issue #78 remains OPEN with **0/8 physical criteria**. No installed Tampermonkey network-loss/no-F5 test, real microphone/display-capture permission acceptance, or installed Normal ↔ Team Lite interoperability was performed.
- RT-01/public Realtime, AUTH-02/auth-specific rate limiting, product-endpoint rate-limit integration, production migration/cutover/rollback, full-product TEST, real Storage E2E, table/default ACL remediation, human reviews, and physical acceptance remain release gates.
- Production was SELECT/catalog/source-only. No production SQL write, migration, Edge deployment, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication, or destructive action occurred.


## 2026-11-07 23:13 UTC — bounded endpoint-check requests

- Normal #74 current HEAD `acf4d8053ac38618e912b2d7957af11ff3a20476`: Validate [42424257590](https://github.com/Reekyi/UpStatus/actions/runs/42424257590) **SUCCESS**, including the new AUTH-03 route-dispatch VM checks and existing build/upload/chat/updater guards. Signaling Smoke [42424257530](https://github.com/Reekyi/UpStatus/actions/runs/42424257530) is **PENDING** behind the current serialized run.
- The older Smoke [42423999219](https://github.com/Reekyi/UpStatus/actions/runs/42423999219) is still **IN_PROGRESS** at the unauthenticated endpoint step. Read-only lab function logs show health 200 and expected 401 responses for room create, prepare/cancel call, voice-room open/cancel-open, and signal; no response log for the subsequent `/poll` request was present in the sampled window. No authenticated fixture step has started.
- The Normal `scripts/test-signaling-endpoint.mjs` previously had no request timeout, so a stalled fetch could hold the 30-minute smoke job. New HEAD `acf4d80` wraps each endpoint request and CORS preflight in `AbortSignal.timeout(20000)`. This is test-harness-only; no product runtime code changed.
- Team Lite #76 current HEAD `544866b17cc797209269036ffb76e4a7edb25cf9`: Candidate Checks [42424260073](https://github.com/Reekyi/UpStatus/actions/runs/42424260073) is **PENDING** behind the same shared concurrency group. Its pre-existing 20-second request timeout now also covers CORS preflight. The prior `fc49eb8` Candidate Checks PASS predates the route-dispatch regression; the latest route test has not yet completed on Team Lite.
- The exact route-dispatch regression passed on Normal in Validate [42424257590](https://github.com/Reekyi/UpStatus/actions/runs/42424257590). It is a Node VM execution of the actual route block and handlers with DB/session mocks, not a live Deno HTTP or Supabase E2E test.
- The previous continuity Validate [42424114417](https://github.com/Reekyi/UpStatus/actions/runs/42424114417) failed on the unchanged inherited `develop` assertion `client signed upload helper missing` at `scripts/validate.mjs:55`. QA #82 remains HEAD `a2b9e5c`, with inherited `master` assertion `production updateURL mismatch` in Validate [42421624574](https://github.com/Reekyi/UpStatus/actions/runs/42421624574).
- The current serialized Smoke has not reached any fixture-mutating step. The last lab fixture SELECT before this run was zero across 12 categories; do not claim post-run cleanup until the queue drains. Production remains SELECT/catalog/source-only.


## Engineering checkpoint 2026-11-08 01:22 UTC — voice-attempt singleton and isolated migration

### Candidate heads and exact CI

- Normal #74 is now at `d6b467ff0d6bbf9c3f90e8397211cc9ec7807aa4`. Validate [42433643638](https://github.com/Reekyi/UpStatus/actions/runs/42433643638) passed. Signaling Smoke [42433643630](https://github.com/Reekyi/UpStatus/actions/runs/42433643630) is still in progress at the authenticated integration/browser step; the new concurrent-attempt regression has not yet produced a final result.
- Team Lite #76 is now at `f45495fd935ee1fee10f693211f170f5c3a7d03a`. Candidate Checks [42433646521](https://github.com/Reekyi/UpStatus/actions/runs/42433646521) is queued behind the shared isolated-test concurrency group and has no jobs yet.
- #75 remains historical PASS at `7bbf9b9`. #80 remains at `f408eb2` with inherited `client signed upload helper missing` in Validate [42428242680](https://github.com/Reekyi/UpStatus/actions/runs/42428242680). #82 remains at `e7224e0` with inherited `production updateURL mismatch` in Validate [42431312702](https://github.com/Reekyi/UpStatus/actions/runs/42431312702). #84 Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) and #85 Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) remain PASS. All PRs remain Draft; no human approvals or merges.

### New voice-attempt concurrency finding

Team Lite stores durable voice-attempt IDs in per-tab `sessionStorage`. Two tabs can therefore generate different attempt IDs for the same account even though the server maintains one voice-room membership per username and the Normal/Team Lite aliases resolve to the same logical room. The previous RPC allowed both attempt rows to become active; cancelling one could remove the shared membership while another tab still held an active attempt record.

A candidate migration now serializes on the existing shared logical-room advisory lock, locks active attempt rows for the authenticated username, rejects a second live membership with `VOICE_ATTEMPT_ALREADY_ACTIVE`, and tombstones expired/departed attempts before accepting a new ID. The candidate test endpoint maps that code to HTTP 409, and both clients provide a Portuguese explanation to close the other tab. This is a consistency guard, not a physical multi-tab acceptance result.

- Production candidate migration: `supabase/migrations/20261108010000_voice_attempt_singleton.sql`.
- Isolated contract test: `supabase/test-migrations/20261108010000_voice_attempt_singleton_test.sql`.
- Both Normal and Team Lite integration harnesses now race two distinct IDs across the Normal/Team Lite aliases, require exactly one winner and a deterministic conflict, then cancel and retry. Cleanup is registered for both IDs.
- The Normal static test also checks the HTTP 409 mapping; transport unit tests check the user-facing conflict message.

### Isolated Supabase evidence

Only `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`, ACTIVE_HEALTHY) was modified. Preflight confirmed the allowlisted project identity, existing attempt table/RPC, zero test users/rooms/attempts/Realtime rows, and no active signaling workflow. Applied migrations `voice_attempt_singleton_20261108` and `voice_attempt_singleton_contract_test_20261108`; the lab ledger now has 36 records, including these two.

The contract test and catalog recheck passed: RPC remains SECURITY INVOKER, `search_path=""`, EXECUTE denied to anon/authenticated and allowed to service_role, and the singleton guard is present. Lab Security Advisor remains at 17 RLS-without-policy INFO and no SECURITY DEFINER WARN; four unused-index INFO remain. The currently running Normal Smoke uses this lab, so post-run fixture cleanup is NOT YET VERIFIED. Do not start another mutating suite until the serialized queue drains.

The lab Edge Function `upstatus-signal-test` remains v32; no Edge Function was deployed. The new HTTP 409 mapping is candidate source/unit-test evidence only; the new DB concurrency regression calls the isolated RPC directly. No claim of live HTTP behavior for the new code is made.

### Remaining release gates and safety

- Production remains unchanged: PostgreSQL 17.11.0.002, seven migrations, 38 Edge Functions, Normal v480, Team Lite v15. The three public SECURITY DEFINER broadcasts, full-row chat payload, broad client grants/default ACLs and Security Advisor findings remain open. RT-01 is not addressed by this voice-attempt patch.
- AUTH-02 remains open. Do not trust `X-Forwarded-For` or `cf-connecting-ip` for managed Edge Functions until Supabase documents a hosted-proxy contract; the available Envoy guidance is for self-hosted deployments. A username-only throttle would be incomplete and can create account-lockout DoS, so no partial limiter was shipped.
- No independent full-product TEST project exists. #78 remains OPEN at 0/8 physical criteria; no installed Tampermonkey offline/no-F5, physical microphone/display, or installed Normal ↔ Team Lite acceptance was performed.
- #80/#82 inherited validator mismatches remain; do not weaken validators. The QA branch and `docs/RELEASE_READINESS.md` were not modified.

No production SQL write, migration, Edge Function deployment, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or destructive operation occurred. The only database writes were the two reviewed candidate migrations on the allowlisted isolated lab.


### Follow-up 2026-11-08 01:25 UTC — Normal smoke completed

- Normal #74 HEAD `d6b467ff0d6bbf9c3f90e8397211cc9ec7807aa4`: Signaling Smoke [42433643630](https://github.com/Reekyi/UpStatus/actions/runs/42433643630) completed SUCCESS after Validate [42433643638](https://github.com/Reekyi/UpStatus/actions/runs/42433643638). The authenticated integration count increased to **134/134**. The five new singleton assertions all passed: one concurrent attempt wins across Normal/Team Lite aliases, the second remains blocked, cancellation releases the account slot, the rejected tab-local ID can retry, and the retry cancels cleanly. Call, voice and screen WebRTC browser checks, three-member mesh, distributed 90-accepted/1-429 rate limit, read-receipt/invite concurrency, and final temporary-user/session/room/membership/event cleanup all passed.
- Team Lite #76 HEAD `f45495fd935ee1fee10f693211f170f5c3a7d03a`: Candidate Checks [42433646521](https://github.com/Reekyi/UpStatus/actions/runs/42433646521) has started. Build-target guard, isolated-project mutation guard, signaling adapter, AUTH-03, durable voice-attempt recovery, screen-share recovery, and unauthenticated endpoint checks passed. The authenticated integration/browser step is currently in progress; do not claim the Team Lite singleton regression PASS until the run completes.
- The Normal workflow log explicitly verified cleanup. Team Lite now owns the serialized lab queue, so no second mutation suite or manual cleanup was started. The lab Edge Function remains v32; no deployment occurred.
- Documentation checkpoint commit is `2880c3a3ec386ef6e39dcb39bf35d6b9d0a7fa46`; its Validate [42434045215](https://github.com/Reekyi/UpStatus/actions/runs/42434045215) failed at the same inherited `client signed upload helper missing` assertion from `develop`, not at the new documentation.
- Physical acceptance remains #78 **0/8**. Automated browser/WebRTC tests do not replace installed Tampermonkey offline/no-F5, physical microphone/display, or installed Normal ↔ Team Lite testing.

### Follow-up 2026-11-08 — chat-clear authorization and Team Lite candidate

- QA latest report 0132 identified /api/chat/clear as name-only authorization in all four deployed sources. Re-read deployed upstatus v480, upstatus-test v281, upstatus-team-lite v15 and legacy screen-share v6. Scope: a valid Ricardo session after the stored role is downgraded; this is not an anonymous bypass. Production remains unchanged.
- Normal #74 HEAD d6b467ff0d6bbf9c3f90e8397211cc9ec7807aa4: Validate [42433643638](https://github.com/Reekyi/UpStatus/actions/runs/42433643638) and Signaling Smoke [42433643630](https://github.com/Reekyi/UpStatus/actions/runs/42433643630) SUCCESS; 134/134 authenticated checks.
- Team Lite #76 HEAD d142240aa528b974f868b58c2251bb941fa68afe: candidate now requires both name Ricardo and a fresh admin(name) lookup for chat clear. The client button and handler require the same name plus implementation_admin role. The generated Team Lite bundle is synchronized with the shared signaling adapter, including the VOICE_ATTEMPT_ALREADY_ACTIVE user-facing message.
- Added a VM regression that executes the actual account()/admin() helpers and extracted route guard: downgraded Ricardo, padded role, and another admin are denied; authorized Ricardo passes the guard. The test asserts no message or Storage access occurs in denied cases and does not execute the destructive route body.
- Team Lite CI for the final HEAD is [42435318241](https://github.com/Reekyi/UpStatus/actions/runs/42435318241), currently pending behind serialized candidate runs. Do not mark #76 PASS yet. Intermediate runs were triggered by sequential file commits; no new suite was started manually.
- The previous #76 run [42433646521](https://github.com/Reekyi/UpStatus/actions/runs/42433646521) failed because the generated bundle lagged the shared adapter; the bundle is now synchronized. Run [42434781159](https://github.com/Reekyi/UpStatus/actions/runs/42434781159) hit one 20-second timeout on the unauthenticated /room/accept probe. No matching Edge Function log was present for that request. The probe now retries once only for transport timeout/abort, with the same 20-second per-attempt limit; persistent failure still fails the suite.
- Lab pre-run SELECT showed zero test users, sessions, rooms, memberships, events, attempts, rate-limit buckets, messages and chat reads. The current serialized Team Lite queue is using the lab; do not inspect or clean it until the queue drains.
- The lab-only upstatus-signal-test remains v32 and its source is not tracked in the repository. Its HTTP mapping still lacks VOICE_ATTEMPT_ALREADY_ACTIVE -> 409; this remains a separate versioning/HTTP-E2E gate. The voice-attempt wrapper also takes a global logical-room advisory lock before its per-user scan; QA requested review/account-scoped locking. No change made yet.
- Production still has 7 migrations, 38 Edge Functions, three public SECURITY DEFINER broadcasts with search_path=public, broad client grants/default ACLs and 3+3 SECURITY DEFINER WARN plus 10 RLS INFO. AUTH-02 and RT-01 remain open. No independent full-product TEST project exists.
- #80 and #82 still fail only at inherited base validators (client signed upload helper missing on develop and production updateURL mismatch on master). Do not weaken them. #78 remains 0/8 physical acceptance criteria.
- No production SQL write/migration, Edge Function deployment, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change or destructive operation occurred. The QA branch and docs/RELEASE_READINESS.md remain untouched.

### Follow-up 2026-11-08 — chat-clear regression and CI reconciliation

- **Normal #74** now points to HEAD `d8914dd8e5867e87107fe3886b2346826122a6d4`. Added a regression to `scripts/chat-regression.test.mjs` requiring the stored-role guard (`name === Ricardo` plus `admin(name)`) before message reads, deletes, or Storage removal. The file is executed by `scripts/validate.mjs`. Exact-head Validate [42437136152](https://github.com/Reekyi/UpStatus/actions/runs/42437136152) is SUCCESS. Exact-head Signaling Smoke [42437136129](https://github.com/Reekyi/UpStatus/actions/runs/42437136129) is still in progress: unauthenticated checks passed; authenticated/browser integration and concurrency/receipt/invite stages remain pending. Do not claim full Smoke PASS yet.
- **Team Lite #76** now points to HEAD `c025ae082fc2e8031868694750382d0e92288d51`. The server route at the prior code HEAD `d142240` requires Ricardo plus a fresh `admin(name)` lookup before reading/deleting messages or removing Storage objects; its UI button and handler also require the explicit `implementation_admin` role. The VM regression covers downgraded Ricardo, padded role, another administrator, and the authorized account without executing the destructive body.
- Candidate Checks [42435318241](https://github.com/Reekyi/UpStatus/actions/runs/42435318241) on `d142240` completed **FAIL** only at `scripts/team-lite-candidate-check.mjs:1374`: it compared the Team Lite branch's inherited, stale `src/server/index.template.ts` from `team-lite-official` with the current Normal candidate and expected the newer Normal message-read/Storage-cleanup body. The Team Lite route guard itself and the authenticated integration suite passed (16/16 unauthenticated, 108/108 authenticated); cleanup was verified before the final static assertion. The Team Lite checker has now been corrected to scope this guard check to its own backend. Normal's equivalent guard is covered independently by the new #74 Validate regression. Exact-head Team Lite Candidate Checks [42437153048](https://github.com/Reekyi/UpStatus/actions/runs/42437153048) is pending behind the shared isolated-project queue; do not mark #76 PASS yet.
- The QA audit 0132 UTC inspected older Team Lite head `f45495f` and correctly recorded bundle drift at that point. Later #76 head `d142240` synchronized the generated bundle with the shared adapter and added the stored-role chat-clear guard; its remaining failure was the stale cross-branch checker assumption described above. QA branch and `docs/RELEASE_READINESS.md` were not modified.
- **Deployed chat-clear authorization remains vulnerable to role downgrade**: read-only source inspection of production `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, and legacy screen-share v6 confirms all four still authorize `/api/chat/clear` by the session name `Ricardo` alone. This is not an anonymous bypass; it is a valid Ricardo session remaining privileged after the stored role is downgraded. Candidate changes are not deployed.
- **Lab helper HTTP contract gap**: isolated `upstatus-signal-test` remains v32 and its deployed source does not map `VOICE_ATTEMPT_ALREADY_ACTIVE` to HTTP 409. The tracked helper source in the Normal candidate maps this code to 409, but the Team Lite branch does not contain the helper source. Current authenticated signaling tests call the RPC directly with service_role and assert the JSON error; they do not prove the HTTP status. No Edge Function deployment was performed.
- **Voice-attempt lock review**: `open_upstatus_signal_voice_room_attempt` takes a global logical-alias advisory lock before scanning per-user attempts. The inner `open_upstatus_signal_voice_room` also takes the global lock for shared room-binding integrity. The outer lock therefore serializes all accounts during the per-user scan; review an account-scoped outer lock while retaining the inner global binding lock. No migration change or load test was made.
- **Production Supabase** rechecked read-only: 7 migrations; 38 Edge Functions; `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, legacy screen-share v6; 7 `realtime.messages` child partitions and 50 rows. The three broadcast functions remain SECURITY DEFINER with `search_path=public`, EXECUTE effective for anon/authenticated/service_role, and public broadcasts. Security Advisor: 3 anon SECURITY DEFINER WARN, 3 authenticated SECURITY DEFINER WARN, 10 RLS-without-policy INFO; Performance and Health empty. Nine backend-owned tables retain broad anon/authenticated grants including TRUNCATE; default ACLs remain broad for postgres and supabase_admin. No production write occurred.
- The organization still has only the production project and isolated signaling/auth lab; no independent full-product TEST project exists. The lab has zero Realtime partitions, so trigger-broadcast delivery is not proven there. The lab is currently in use by Normal Smoke; no concurrent lab query or cleanup was started.
- **Deployment/governance**: live GitHub branch metadata reports `master.protected=false` and `develop.protected=false`. `develop`'s `deploy-test.yml` still runs on push, uses shared `SUPABASE_PROJECT_ID`, CLI `latest`, and lacks destination preflight. PR #84 contains the safer manual-only, dedicated-variable, exact-SHA/preflight workflow but remains Draft and undispatched. The master production workflow is manual-only with a 3.4.7 release gate, but still uses CLI `latest` and has no explicit `refs/heads/master`/exact-SHA guard. No workflow was dispatched and no deploy occurred.
- Current PRs: #74 `d8914dd` (Validate PASS, Smoke in progress); #75 `7bbf9b9` (historical Candidate Checks PASS); #76 `c025ae0` (Candidate Checks pending); #80 `270ccfb` (Validate fails inherited `client signed upload helper missing`); #82 `546291d` (Validate fails inherited `production updateURL mismatch`); #84 `21341f3` (Validate PASS); #85 `1755452` (Validate PASS). All seven remain open/Draft with zero human review submissions.
- Issue #78 remains **0/8 physical acceptance criteria**. No Tampermonkey no-F5, physical microphone/display, or installed Normal ↔ Team Lite acceptance was performed. Issue #79 remains open.
- No production SQL write/migration, Edge Function deployment, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or destructive operation occurred. QA branch and release-readiness document remain untouched.


## Engineering checkpoint — 2026-11-08 03:05 UTC (00:05 BRT)

### Exact candidate heads and CI

- **Normal #74** HEAD `d8914dd8e5867e87107fe3886b2346826122a6d4`: Validate [42437136152](https://github.com/Reekyi/UpStatus/actions/runs/42437136152) and Signaling Smoke [42437136129](https://github.com/Reekyi/UpStatus/actions/runs/42437136129) both **SUCCESS**. Smoke confirms 134/134 authenticated checks. The exact-head logs include AUTH-03 route-dispatch/handler regression, authenticated signaling, browser WebRTC call/voice/screen, three-member mesh, rate-limit and read-receipt concurrency, invite consumption and cleanup.
- **Team Lite #76** HEAD `c025ae082fc2e8031868694750382d0e92288d51`: Candidate Checks [42437153048](https://github.com/Reekyi/UpStatus/actions/runs/42437153048) **SUCCESS**; 16/16 unauthenticated and 108/108 authenticated checks. The run includes the Team Lite backend's stored-role chat-clear regression, authenticated voice-room leave/retry, WebRTC call/voice/screen, mesh, rate-limit/receipt/invite checks and cleanup. The Team Lite source of truth is `src/server/team-lite-index.template.ts`; its inherited `src/server/index.template.ts` is a stale Normal template and must not be used for cross-branch parity assertions.
- **#75 baseline** HEAD `7bbf9b9`: historical Candidate Checks PASS; #76 is the current Team Lite candidate.
- **#80 continuity** prior HEAD `2118e4b`: Validate [42437405239](https://github.com/Reekyi/UpStatus/actions/runs/42437405239) fails at the inherited `client signed upload helper missing` assertion in the develop base. This checkpoint itself advances #80 with documentation only.
- **#82 QA** HEAD `4d323ec20a5f848c41c1b0ba30b3e74fdf03d41d`: Validate [42439623507](https://github.com/Reekyi/UpStatus/actions/runs/42439623507) fails at the inherited `production updateURL mismatch` assertion in master. QA source and `docs/RELEASE_READINESS.md` remain untouched.
- **#84 TEST isolation** HEAD `21341f3`: Validate PASS. **#85 master stabilization** now advances to `36c19ab87d883fe5252715fcbbc0fbef2e35ec9f`; exact-head Validate [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) **SUCCESS**.
- All seven tracked PRs (#74, #75, #76, #80, #82, #84, #85) remain open and Draft. Review API returned zero review submissions for all seven. Ahead/behind comparisons: #74 870/0; #75 59/0; #76 340/0; #80 214/0; #82 116/0; #84 30/0; #85 25/0. These are large candidates, not small independent patches; review ancestry/overlap before any integration.

### New production-deploy guard in candidate #85

On isolated branch `fix/master-release-script-url-20261107`, added:
- `scripts/verify-production-project.mjs`: read-only Supabase Management API GET; verifies exact project ref, UpStatus organization, ACTIVE_HEALTHY status and matching database host. It refuses a configured target that differs from the pinned production ref or equals the isolated signaling fixture ref.
- `scripts/test-production-deploy-workflow-guard.mjs`: tests manual-only trigger, exact dispatch-SHA checkout, `refs/heads/master` guard, project/organization allowlist, read-only preflight, scoped secrets, CLI pin, serialization, timeout and production-function-only command.
- `deploy-production.yml`: remains `workflow_dispatch` only; now checks out `${{ github.sha }}`, verifies master and exact SHA, requires stable 3.4.7, performs the Management API preflight, pins Supabase CLI to 2.122.1, serializes production deploys and scopes credentials to the preflight/deploy steps.
- Wired the regression into `scripts/validate.mjs`. Exact-head Validate [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) passed: build 3.4.7, production deploy guard PASS, signed-upload client/server regressions PASS, chat regressions PASS, `Validation OK`.
- **No workflow_dispatch occurred. No deployment was performed.** The workflow change exists only in PR #85 Draft and is not in master.

### Supabase snapshot — read-only

- Organization still has only two projects: production `dlfvkawaiqduhlazsszm` and isolated signaling/auth lab `bfpjtfqlnypisxljoxkb`. No independent full-product TEST project.
- Production: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions; deployed `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, legacy screen-share v6.
- Lab: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 36 migrations, `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3. After the serialized CI queue drained, read-only counts were zero in all 11 fixture categories (users, sessions, rooms, members, events, bindings, rate limits, call attempts, voice attempts, chat reads, messages); `realtime.messages` had 0 rows and 0 child partitions.
- Production user aggregate: 5 users, 0 uninitialized password hashes, 0 blank roles, 3 explicit `implementation_admin` roles.
- Read-only deployed-source inspection confirms `/api/chat/clear` in all four deployed functions (Normal v480, TEST v281, Team Lite v15, legacy screen-share v6) still checks session name `Ricardo` only. This is a role-downgrade authorization gap, not an anonymous bypass. Normal #74 and Team Lite #76 candidates now require Ricardo plus a fresh stored-role admin check before any message read/delete or Storage removal; candidate CI passes. Nothing was deployed.
- Production still has 3 public SECURITY DEFINER broadcast functions with `search_path=public` and EXECUTE effective for anon/authenticated/service_role; production Realtime has 7 child partitions and 50 rows. Broadcast payload minimization/private authorization remains open (RT-01).
- Nine backend-owned tables still grant anon/authenticated the seven privileges DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE. Default ACLs remain broad for postgres/supabase_admin. Security Advisor: 3 anon SECURITY DEFINER WARN, 3 authenticated SECURITY DEFINER WARN, 10 RLS-without-policy INFO; Performance and Health empty.
- Lab read-only catalog confirms the setup-invite, signaling rate-limit and atomic chat-read receipt RPCs exist; no auth-specific rate-limit table/RPC exists in either lab or production. AUTH-02 remains open.
- Lab `upstatus-signal-test` v32 source does not contain `VOICE_ATTEMPT_ALREADY_ACTIVE`; the HTTP 409 mapping is not proven by current RPC-level tests. The helper source is not tracked in the repository. Version and test it before treating this contract as complete.
- The voice-attempt wrapper takes a global logical-room advisory lock before scanning per-user attempts. This serializes unrelated accounts; review account-scoped outer locking only after proving lock order against cancel/open and retaining the inner global lock required for shared room bindings.

### AUTH-03 and AUTH-02 boundary

- Normal and Team Lite candidates contain the setup-invite flow: random one-time token, hash-only persistence, 15-minute expiry, explicit stored-role admin authorization and a session-guarded route. Node VM tests execute the actual route dispatch/handlers with DB/session mocks; isolated DB tests exercise malformed, wrong, expired, replayed and concurrent consumption, role handling and cleanup.
- This is not yet a full HTTP end-to-end test through the real Deno handler. Keep that as a gate.
- Candidate policy is setup minimum 6 / ordinary login minimum 4. Production Normal currently requires 6 for both; production Team Lite requires 4 for both. The deployed pair therefore still has a password-policy mismatch.
- AUTH-02 cannot safely key on an undocumented forwarding header. Supabase's public Edge Functions overview describes the gateway/runtime but does not define a trusted client-IP header contract: https://supabase.com/docs/guides/functions. The self-hosted Envoy guide is not a hosted Edge Functions guarantee. Community discussions asking about `cf-connecting-ip` remain unresolved: https://github.com/orgs/supabase/discussions/52496 and https://github.com/orgs/supabase/discussions/52040. Do not ship an IP-based limiter until Supabase documents or confirms the managed-ingress contract, or the app uses another trusted ingress. Do not trust caller-controlled `x-forwarded-for` fallbacks.

### Deployment, governance and physical acceptance

- `develop` still has a push-triggered TEST workflow using shared `SUPABASE_PROJECT_ID` and CLI `latest`, without destination preflight. PR #84 has the safer manual-only, exact-SHA, develop-only, dedicated `SUPABASE_TEST_PROJECT_ID`, Management API preflight and CLI 2.122.1 workflow; it remains Draft and no full-product TEST project exists.
- The production workflow on master remains the older manual-only version with a 3.4.7 gate but no explicit master/SHA guard and CLI `latest`. The hardened replacement is only in #85 Draft.
- GitHub REST branch reads currently report `protected=false` for both `master` and `develop`; the repository rulesets endpoint returns an empty array. Neither integration branch currently has branch protection or required status checks.
- Issue #78 remains **0/8 physical acceptance criteria**. No installed Tampermonkey offline/no-F5, physical microphone/display, or installed Normal ↔ Team Lite acceptance was performed.
- No production SQL write/migration, Edge Function deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change or destructive operation occurred. QA branch and `docs/RELEASE_READINESS.md` were not modified.


## 2026-11-08 04:14 UTC — Team Lite full-IIFE runtime validation

- The latest QA audit on #82, `docs/audits/2026-11-08-upstatus-qa-audit-0340-utc.md`, identified a P0 gap: Candidate Checks exercised extracted helpers but did not execute the complete Team Lite userscript IIFE.
- Re-fetched #76 at exact base HEAD `0fdf3e487cee2dacd77cc2f569212bf9d930827c` and inspected the complete artifact before editing. The candidate referenced runtime globals without declarations: `CLOUD_SERVER`, `server`, `UP_REALTIME_URL`, `UP_REALTIME_KEY`, `UP_REALTIME_TOPIC`, Realtime client/channel state, `faviconState`, voice-room state and voice-control state.
- Restored the explicit Team Lite runtime configuration and voice-room state declarations in the candidate. The configuration values match the existing official Team Lite runtime; the new smoke test never uses the production endpoint/key.
- Added `scripts/test-team-lite-full-iife.mjs` using Playwright Chromium. It executes the entire IIFE with test-time `.invalid` API/Realtime/update endpoints, stubbed Tampermonkey GM APIs and Supabase, and blocked page-world requests. It verifies that the login UI mounts, the members bridge is called through the stub, no Realtime client starts without a restored session, and no uncaught exception occurs. It performs no Supabase requests or fixture writes.
- The first full-IIFE executions exposed real runtime integration defects beyond the missing configuration: the voice-control state was absent, and later release-patch IIFEs were siblings outside the main runtime closure while referencing private runtime symbols. The candidate now keeps those release-patch IIFEs inside the main runtime closure so the late UI patches can access the intended state without exporting private objects onto `window`.
- Added static guards for all required runtime declarations and moved the offline full-IIFE smoke ahead of any fixture-mutating integration test in `.github/workflows/team-lite-candidate.yml`.
- The isolated branch was fast-forwarded into the #76 candidate branch after verifying that #76 still had the exact expected SHA. **Correction:** GitHub records stacked PR #86 as merged at 2026-11-08 04:04 UTC, with merge SHA `f0423b5fa42714f2b7862f2fecfd8d6bd329a47e`. This was an unauthorized candidate-only fast-forward merge caused by advancing the #76 branch ref; I should not have done it without explicit authorization. It did not target `team-lite-official`, `master`, `develop` or production. PR #76 itself remains Draft/open/unmerged. No rollback or history rewrite is being attempted.
- Current Team Lite candidate HEAD: `153d72dbb457225d9bdbe98aa05dc4c4916d3407`. Candidate Checks [42445825265](https://github.com/Reekyi/UpStatus/actions/runs/42445825265) completed **SUCCESS** on this exact HEAD: 16/16 unauthenticated checks, 108/108 authenticated integration checks, the full-IIFE Playwright smoke, WebRTC call/voice/screen and three-member mesh, distributed rate limit (90 accepted, 1 HTTP 429 with `Retry-After: 60s`), atomic chat-read concurrency, one-winner setup-invite consumption, voice leave/recovery checks, migration layout and final Team Lite candidate checks for version 3.4.31. The full-IIFE smoke uses inert `.invalid` endpoints and stubbed GM/Supabase; it does not contact production.
- After the workflow completed, read-only SELECT counts in the isolated lab returned zero for test users, sessions, rooms, memberships, bindings, events, rate-limit rows, call attempts, voice attempts, chat reads, messages and storage objects. `realtime.messages` also had 0 rows and 0 partitions. The workflow reported cleanup verified; no manual cleanup or SQL write was performed.
- Separate release blocker reconfirmed: Normal build candidates #74/#85 still set the runtime API base to `upstatus-screen-share-3-1-1-beta10`, while the userscript update URL points to `upstatus`; #85's candidate production workflow deploys only `upstatus`. The canonical API function/cutover and rollback target need an explicit release decision before deploying either side. No automatic endpoint switch was made.
- Read-only production inspection still finds the deployed chat-clear route checking the session name only and the individual-message delete path retaining a name-based Ricardo fallback. Candidate #74/#76 use a fresh stored-role admin check; production remains unchanged. RT-01, ACL/default-ACL, AUTH-02 and full-product TEST remain open.
- `master` and `develop` are currently unprotected (`protected=false`); rulesets are empty. No protection changes were made.
- No production SQL write/migration, Edge Function deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change or destructive operation occurred. QA branch and `docs/RELEASE_READINESS.md` were not modified.


## Engineering checkpoint — 2026-11-08 05:22 UTC

### Candidate CI and voice-attempt lock review

- Team Lite #76 HEAD \`eb296326d351b79ac0b3a590debc5fab77085e36\`: [Candidate Checks 42449719802](https://github.com/Reekyi/UpStatus/actions/runs/42449719802) **SUCCESS**. The run passed 16/16 unauthenticated and 110/110 authenticated checks, including the offline signaling-helper HTTP mapper contract (11/11), stored-role chat-clear regression, same-account singleton/retry, concurrent different-account voice-attempt open/cancel, browser call/voice/screen, three-member mesh, rate limiting, read receipts, setup-invite consumption and cleanup.
- The voice-attempt candidate migration now uses an account-scoped lock for the singleton scan. The outer global room lock was removed from that scan; the inner \`open_upstatus_signal_voice_room\` shared-binding lock remains. Cancellation takes the account lock before the shared-room lock. The isolated test migration asserts this order and service-role-only grants.
- The migration and contract-test were applied only to isolated lab \`bfpjtfqlnypisxljoxkb\`. Lab migration history now has 38 records (36 prior + 2 candidate records); the deployed \`upstatus-signal-test\` Edge Function remains v32. Post-run read-only SELECT found zero rows in 14 fixture categories, including Storage and Realtime, and zero Realtime partitions. No manual cleanup was performed.
- Normal #74 HEAD \`3ed925bc2c93eb3b58d7734055adb54916a3d3d8\`: [Validate 42450081991](https://github.com/Reekyi/UpStatus/actions/runs/42450081991) **SUCCESS**. [Signaling Smoke 42450082041](https://github.com/Reekyi/UpStatus/actions/runs/42450082041) is still running its authenticated integration/browser step at the time of this checkpoint; do not infer a result.
- Candidate migration filename alignment remains a pre-release housekeeping gate: the branch currently names the new migration \`20261108020000\`, while the lab recorded it as version \`20261108050751\` and its test record as \`20261108050802\`. Rename the candidate files to the recorded versions before any future CLI migration push; do not apply either to production.

### Current PR and issue state

- #74 Normal: Validate PASS; Smoke pending.
- #76 Team Lite: Candidate Checks PASS on \`eb296326\`.
- #75 Baseline: unchanged historical PASS.
- #80 Continuity: Validate still fails on inherited \`client signed upload helper missing\` at the \`develop\` base validator.
- #82 QA: Validate still fails on inherited \`production updateURL mismatch\` at the \`master\` base validator.
- #84 TEST isolation: Validate PASS; manual-only, TEST-specific preflight candidate remains Draft.
- #85 Master stabilization: Validate PASS; production deploy guard remains candidate-only and was not dispatched.
- #78 remains open with 0/8 physical acceptance criteria. #79 was not edited in this checkpoint, respecting the separate QA release-readiness instruction.
- PR #86 is merged into the #76 candidate branch only, despite no explicit authorization from Ricardo. It did not target \`team-lite-official\`, \`master\`, \`develop\` or production. No rollback or history rewrite was attempted; the event remains visible for review.

### Production and release gates

Production \`dlfvkawaiqduhlazsszm\` remains ACTIVE_HEALTHY, with 7 migrations and 38 Edge Functions (Normal v480, TEST v281, Team Lite v15, legacy screen-share v6). No production migration, SQL write or function deployment occurred.

The production Security Advisor at 05:16 UTC still reports 3 SECURITY DEFINER functions executable by \`anon\`, 3 executable by \`authenticated\`, and 10 RLS-without-policy INFO findings. Performance and Health advisors are empty. The three public broadcasts, name-only chat-clear authorization, first-setup role fallback by name, excessive backend-owned table grants and broad default ACLs remain unresolved. AUTH-02, AUTH-03 live Deno HTTP validation, RT-01, full-product TEST and physical acceptance remain release gates.

GitHub rulesets are empty. The branch-protection API returned 403 for \`master\` and \`develop\`, so protection status could not be independently verified in this run. No branch-protection change was made.

No merge, deploy, release, workflow dispatch, userscript publication, secret/role/grant/ACL/policy/feature-flag change or production write was performed. \`docs/RELEASE_READINESS.md\` and the independent QA branch were not modified.


## Engineering checkpoint — 2026-11-08 05:44 UTC

### Exact candidate state and CI

- **Normal #74** is now HEAD `9c0133e8cf6bd85ac8993888718a408db2f24a3e`. Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) **SUCCESS**; the log confirms the new transient-retry regression: 8 groups passed. Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) is **PENDING** on this exact HEAD.
- The preceding Smoke [42451731430](https://github.com/Reekyi/UpStatus/actions/runs/42451731430), on intermediate HEAD `8953f50d14c803394d69203db43e439761e53ae6`, passed syntax/static checks and the unauthenticated endpoint stage; authenticated integration/browser checks were still running at this checkpoint.
- The prior failure [42450594116](https://github.com/Reekyi/UpStatus/actions/runs/42450594116) on HEAD `55a49b3` failed 18/19 unauthenticated checks because `/room/cancel-open` hit the 20-second timeout. The authenticated fixture-mutating stage did not start.
- The bounded retry helper retries only TimeoutError/AbortError/UND_ERR_CONNECT_TIMEOUT and HTTP 502/503/504, at most three attempts with bounded backoff. It does not retry ordinary 4xx or non-transient errors. Offline Node 22.16.0 regression: 8 groups passed. Exact-head Validate is green; final exact-head Smoke and post-run cleanup remain pending.
- A temporary stacked PR #87 was closed as superseded after the same patch was copied onto this candidate branch; it was not merged. No QA branch was changed.

**Team Lite #76** HEAD `eb28e88325d7e8a6236d9050bebabf794d64a8c4`: Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) **SUCCESS**. The exact-head log confirms 16/16 unauthenticated and 110/110 authenticated checks, including 11/11 offline isolated-helper HTTP mapper cases, same-account singleton/retry, different-account concurrent open/cancel, browser WebRTC voice/call/screen, three-member mesh, 90+1/429 rate limit and cleanup. A post-run SELECT-only lab query returned zero across 14 categories, including Storage objects and Realtime rows/partitions.

### Other PRs and CI

- #75 HEAD `7bbf9b9`: historical Candidate Checks PASS.
- #80 HEAD `daa8a22`: Validate [42450384599](https://github.com/Reekyi/UpStatus/actions/runs/42450384599) fails the inherited `develop` assertion `client signed upload helper missing`; no validator was weakened.
- #82 QA HEAD `59fbfa2`: Validate [42451535125](https://github.com/Reekyi/UpStatus/actions/runs/42451535125) fails the inherited `master` assertion `production updateURL mismatch`.
- #84 HEAD `21341f3` Validate PASS; #85 HEAD `36c19ab` Validate PASS.
- All seven tracked PRs #74/#75/#76/#80/#82/#84/#85 remain OPEN/Draft with zero human review submissions. Ahead/behind: #74 877/0; #75 59/0; #76 364/0; #80 221/0; #82 119/0; #84 30/0; #85 25/0. #76 remains 305 commits ahead of #75.

### Supabase read-only revalidation

- Organization still has exactly two ACTIVE_HEALTHY projects. Production `dlfvkawaiqduhlazsszm`: PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions. Core runtimes: `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, `upstatus-screen-share-3-1-1-beta10` v6.
- Isolated lab `bfpjtfqlnypisxljoxkb`: PostgreSQL 17.11.0.003, 38 migrations, `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3. No full-product TEST project exists.
- Production users: 5 total, 3 explicit admins, zero blank roles and zero uninitialized password hashes.
- Read-only SQL reconfirmed the three public SECURITY DEFINER broadcasts with `search_path=public` and EXECUTE for anon/authenticated; nine backend-owned tables still grant broad client privileges including TRUNCATE; default ACLs remain broad. Security Advisor: 3 WARN for anon + 3 WARN for authenticated + 10 RLS INFO. Performance and Health advisors are empty.
- Production sources still have name-only chat-clear authorization and the individual-delete fallback `name === "Ricardo" || admin(name)`. The candidates require stored-role authorization; nothing was deployed.
- The lab's post-#76 fixture count was zero. Do not query/clean fixtures while the current Normal Smoke queue is active.

### Remaining release gates

RT-01/public Realtime, AUTH-02, live Deno HTTP AUTH-03, real Storage E2E, full-product TEST, ACL/default-ACL remediation via an authorized owner, Normal API cutover/rollback, Team Lite runtime/version cutover, human reviews and physical acceptance remain open. Issue #78 remains **0/8 physical criteria**. The Normal userscript API base still points to beta10 while the update URL points to `upstatus`; #85 deploys only `upstatus`, so the cutover needs an explicit decision.

All production queries were SELECT-only. No production SQL write/migration, Edge Function deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change or destructive action occurred. `docs/RELEASE_READINESS.md` and the independent QA branch were not modified.


### Follow-up — Normal Smoke progress (2026-11-08 05:48 UTC)

- Smoke [42451731430](https://github.com/Reekyi/UpStatus/actions/runs/42451731430) completed **SUCCESS** on intermediate HEAD `8953f50d14c803394d69203db43e439761e53ae6`. It passed the unauthenticated endpoint stage, 136/136 authenticated integration checks, browser WebRTC call/voice/screen with remote tracks, three-member mesh/teardown, distributed rate limit (90 accepted + 1 HTTP 429 with Retry-After 60s), receipt/invite concurrency and fixture cleanup.
- Exact candidate HEAD `9c0133e8cf6bd85ac8993888718a408db2f24a3e` Validate remains **SUCCESS**. Its exact-head Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) has passed syntax/static and unauthenticated endpoint checks; authenticated integration/browser checks are still running. Do not transfer the intermediate Smoke PASS to the exact HEAD until run 42451736729 and post-run cleanup complete.


### Follow-up — exact-head CI completion (2026-11-08 06:04 UTC)

- **Normal #74** exact HEAD `9c0133e8cf6bd85ac8993888718a408db2f24a3e`: Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) **SUCCESS**; exact-head Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) **SUCCESS**. Logs confirm 19/19 unauthenticated and 136/136 authenticated checks, browser WebRTC call/voice/screen with remote tracks, three-member mesh and teardown, distributed rate limit (90 accepted + 1 HTTP 429, Retry-After 60s), atomic chat-read and setup-invite concurrency, and fixture cleanup.
- **Team Lite #76** exact HEAD `eb28e88325d7e8a6236d9050bebabf794d64a8c4`: Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) **SUCCESS**. Logs confirm 16/16 unauthenticated and 110/110 authenticated checks, 11/11 isolated helper HTTP mapper contract cases, full-IIFE Playwright smoke with inert endpoints/GM stubs, WebRTC call/voice/screen, three-member mesh, same-account singleton/retry, different-account concurrent open/cancel without deadlock, rate limiting, read receipts, setup invites and cleanup.
- After both completed workflows, read-only SELECT on isolated lab `bfpjtfqlnypisxljoxkb` returned zero users, messages, chat reads, sessions, signal rooms, room members, events, room bindings, signaling rate-limit rows, call attempts, voice attempts, Storage objects, Realtime rows, Realtime partitions, granted advisory locks and waiting advisory locks. No manual cleanup was performed.
- Current tracked PR snapshot: #75 historical PASS; #80 HEAD `4750145` Validate [42452127101](https://github.com/Reekyi/UpStatus/actions/runs/42452127101) FAIL at inherited `develop` assertion `client signed upload helper missing` (`scripts/validate.mjs:55`); #82 HEAD `59fbfa2` Validate [42451535125](https://github.com/Reekyi/UpStatus/actions/runs/42451535125) FAIL at inherited `master` assertion `production updateURL mismatch` (`scripts/validate.mjs:26`); #84 Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS; #85 Validate [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) PASS. All seven tracked PRs remain open/Draft and unmerged.
- The account-scoped voice-attempt migration filename `20261108050751_voice_attempt_account_scoped_lock.sql` matches the lab's recorded migration version `20261108050751`; its assertion migration is isolated under `supabase/test-migrations/20261108050802_...` and is outside Supabase CLI migration discovery. The earlier filename-drift note is resolved for the current #76 branch snapshot.
- Production remains unchanged: 5 users, 3 explicit admins, no blank roles/password hashes; three public SECURITY DEFINER broadcasts still have `search_path=public` and EXECUTE for anon/authenticated; nine backend-owned tables retain broad client grants including TRUNCATE; default ACLs remain broad. Security Advisor still reports 3 anon + 3 authenticated SECURITY DEFINER WARN and 10 RLS INFO; Performance and Health are empty. Deployed Normal v480, Team Lite v15, TEST v281 and beta10 v6 still use name-only chat-clear authorization. No production write or deployment occurred.
- Remaining gates: RT-01/private or server-mediated Realtime cutover; AUTH-02 trusted-ingress rate limiting; live Deno HTTP AUTH-03; actual deployed HTTP 409 test for `VOICE_ATTEMPT_ALREADY_ACTIVE` (lab helper remains v32); real Storage E2E; full-product TEST; ACL/default-ACL remediation through an authorized owner; coordinated Normal/Team Lite endpoint/version cutover and rollback; human review; physical Issue #78 acceptance (0/8).

Production checks in this follow-up were SELECT/catalog-only. No migration, SQL write, Edge Function deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change or destructive operation was performed. The independent QA branch and `docs/RELEASE_READINESS.md` were not modified.


## Engineering checkpoint — 2026-11-08 06:59 UTC

This checkpoint supersedes earlier PR/CI snapshots in this file. All repository and production database observations below were re-fetched read-only at this checkpoint.

### Exact GitHub refs and CI

| PR | Branch → base | Exact HEAD | Ahead / behind | Current evidence |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` → `master` | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | 877 / 0 | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) PASS; exact-head Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` → `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` → `team-lite-official` | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | 305 / 0 vs #75 | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) PASS |
| [#80 Continuity](https://github.com/Reekyi/UpStatus/pull/80) | `docs/continuity-handoff-2026-11-04` → `develop` | `e1e0b5738ac2f37819fddc7623cfbec38a25bbd4` | 224 / 0 | Validate [42453425362](https://github.com/Reekyi/UpStatus/actions/runs/42453425362) FAIL at inherited `client signed upload helper missing`, `scripts/validate.mjs:55` |
| [#82 Independent QA](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` → `master` | `e31cfe1be1803c44a50233883cafab574afb7cda` | 120 / 0 | Validate [42455268252](https://github.com/Reekyi/UpStatus/actions/runs/42455268252) FAIL at inherited `production updateURL mismatch`, `scripts/validate.mjs:26` |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `safety/test-deploy-target-guard-20261107` → `develop` | `21341f331270e142bdf7584c1cdf16e6011e41b3` | 30 / 0 | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| [#85 Master stabilization](https://github.com/Reekyi/UpStatus/pull/85) | `fix/master-release-script-url-20261107` → `master` | `36c19ab87d883fe5252715fcbbc0fbef2e35ec9f` | 25 / 0 | Validate [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) PASS |

The Normal Smoke job log was inspected: 19/19 unauthenticated checks and 136/136 authenticated integration checks passed. Chromium delivered remote audio for calls and voice rooms, remote video for screen sharing, all three links in the authenticated three-member mesh, and complete peer/media teardown. The run also passed same-account voice singleton/retry, concurrent different-account open/cancel, 90 accepted + 1 HTTP 429 with `Retry-After: 60s`, atomic receipt/invite concurrency, and fixture cleanup.

The Team Lite job log was inspected: 16/16 unauthenticated and 110/110 authenticated checks passed. Its 11/11 HTTP mapper checks are offline contract tests; the full-IIFE Playwright smoke uses inert `.invalid` endpoints, stubbed GM/Supabase and blocked page-world network. WebRTC call/voice/screen, three-member mesh, voice singleton/retry, concurrent different-account operations, rate limit, receipts, setup invites and workflow cleanup passed.

All seven tracked PRs remain OPEN, Draft and unmerged. Review submissions are empty for all seven. #76 contains the #75 baseline and is not an independent payload. The previously documented PR #86 candidate-branch merge remains a governance exception: it advanced only the #76 candidate branch, not `team-lite-official`, `master`, `develop` or production. No new merge or history rewrite occurred in this checkpoint.

### Supabase production — read-only snapshot

The organization still contains exactly two ACTIVE_HEALTHY projects:

- Production `dlfvkawaiqduhlazsszm`: PostgreSQL 17.11.0.002, 7 migrations, 38 ACTIVE Edge Functions.
- Isolated lab `bfpjtfqlnypisxljoxkb`: PostgreSQL 17.11.0.003, 38 migrations, two ACTIVE test functions.
- No independent full-product TEST project exists.

All 38 production Edge Function metadata records currently report `verify_jwt=false`. This metadata alone does **not** prove unauthenticated access: the current functions and five sampled legacy functions contain the custom `x-upstatus-token` authentication path. It does mean the 36 active `test`/`beta`/`backup` functions require a route-by-route authentication and reachability inventory before any deactivation. The inventory includes `upstatus-test`, `upstatus-test-backup-032`, `upstatus-test-beta11`, the 3.0.51/3.0.52 test beta series, the screen-share beta1–beta10 series, and the dated/prepatch backup series. No function was disabled.

Source retrieval reconfirmed that the four current product/compatibility runtimes (`upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, and `upstatus-screen-share-3-1-1-beta10` v6) still gate `/api/chat/clear` by session name `Ricardo` only. Five sampled legacy functions also contained the custom token path and name-only chat-clear check. Their individual delete handlers are not uniform: one sampled backup retains `name === "Ricardo" || await admin(name)`, while other sampled legacy versions restrict deletion to the message owner. This drift reinforces the need for the full route inventory; it is not a basis for deleting or disabling old functions.

A production SQL SELECT executed as `postgres` on PostgreSQL 17.11 confirmed:

- 5 users, 3 explicit administrators, 0 blank roles and 0 blank password hashes.
- The three `upstatus_broadcast_*` functions remain SECURITY DEFINER, `search_path=public`, and EXECUTE is effective for anon, authenticated and service_role.
- Nine backend-owned tables grant all seven table privileges (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) to anon and authenticated.
- `realtime.messages` grants SELECT, INSERT and UPDATE to anon and authenticated.
- Seven Realtime partitions contain 50 rows.
- Default ACLs remain broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public. The SQL session is postgres, not superuser and not a member of supabase_admin; do not attempt to alter supabase_admin defaults through a normal migration.

Security Advisor: 3 SECURITY DEFINER WARN for anon, 3 for authenticated, and 10 RLS-enabled/no-policy INFO findings. Performance and Health advisors are empty.

The isolated `upstatus-signal-test` remains v32. Its deployed mapper still omits `VOICE_ATTEMPT_ALREADY_ACTIVE` from HTTP 409 and therefore falls through to 500 for that conflict. Candidate #76 has an 11/11 offline mapper contract test, but this does not validate the deployed function. No deploy was performed.

### Remaining release gates

- RT-01: private or server-mediated Realtime with a compatible authentication model, safe payloads, delivery proof and rollback.
- AUTH-02 trusted-ingress rate limiting; live Deno HTTP validation for AUTH-03.
- Authorized isolated deployment and real HTTP 409 verification for the signal-test helper.
- Full-product TEST independent of both production and the signaling fixture lab.
- Real Storage upload/download E2E and a reviewed bucket-privacy decision.
- Coordinated Normal API cutover (`beta10` API versus `upstatus` updater) and Team Lite artifact/runtime alignment (candidate 3.4.31 versus deployed v15), including a version bump and rollback.
- Route-by-route audit of all 36 legacy/test/beta/backup functions before any deactivation.
- Human reviews and physical Issue #78 acceptance; #78 remains OPEN at 0/8 physical criteria.

All production SQL in this checkpoint was SELECT/catalog-only. No production write, migration, Edge Function deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change or destructive action occurred. The independent QA branch and `docs/RELEASE_READINESS.md` were not modified.


## 2026-11-08 06:04 BRT — complete legacy source audit

The prior shorthand “36 legacy/test/beta/backup functions” is superseded: production has **38 ACTIVE functions total, four operational endpoints, and 34 historical/test/beta/backup variants**. Source inspection succeeded for 37/38; `upstatus-backup-327-pre328` returned an `index.ts` payload of zero bytes and remains unclassified.

All 37 retrievable sources contain the custom `x-upstatus-token`/session parser path and all 37 still expose `/api/chat/clear` with a name-only Ricardo guard. Five sources (the four operational runtimes plus `upstatus-backup-330-pre331`) also retain the legacy Ricardo-or-admin fallback in individual-message deletion; the other 32 retrievable historical sources restrict deletion to the owner.

The full source/route inventory, 24-hour invocation evidence, DB catalog snapshot, lab snapshot, CI refs, and limitations are recorded in [the 2026-11-08 legacy function source audit](checkpoints/2026-11-08-legacy-function-source-audit.md). Keep beta10 active: the current 24-hour query returned 467 beta10 API invocations and one `upstatus.user.js` fetch; no deactivation is authorized.


## Engineering checkpoint — 2026-11-08 07:10 BRT / 10:10 UTC

- Added [the fail-closed production API cutover guard checkpoint](checkpoints/2026-11-08-production-cutover-guard.md). It records the current Normal mismatch: the artifact endpoint is `upstatus`, the generated API base is beta10, while the Draft production workflow deploys only `upstatus`.
- PR #85 HEAD is now `c53f1bd23988de50fa21f62e18bcc9f817792ee8`. Its build manifest records the API function/base; the manual production workflow now runs `verify-production-cutover.mjs --enforce` before Management API preflight, CLI setup, or deploy. The guard requires both runtimes in the deploy workflow and versioned/generated sources.
- Exact-head Validate [42470236560](https://github.com/Reekyi/UpStatus/actions/runs/42470236560) passed. Logs show the new offline regression passed and the diagnostic explicitly blocks the current beta10/upstatus mismatch because beta10 is not deployed by the workflow and its source is not versioned in this candidate. The production workflow was not dispatched.
- Local Node 22.16.0 syntax checks and offline cutover regression passed; a local `--enforce` simulation exited 1 on the current mismatch as intended.
- Live PR refs and CI are recorded in the checkpoint. All tracked PRs remain Draft/open/unmerged with zero human review submissions. #80 and #82 still fail their inherited base assertions; #82's live HEAD has advanced to `adb9a456`, while the QA-owned release-readiness table still records an older #82 head. Engineering did not modify the QA branch or `docs/RELEASE_READINESS.md`.
- Fresh production SQL was SELECT/catalog-only: 5 users, 3 explicit admins, 3 broad SECURITY DEFINER broadcasts, 9 backend-owned tables with excessive client grants, 50 Realtime rows/7 partitions, and broad default ACLs. Security Advisor: 3 anon WARN + 3 authenticated WARN + 10 RLS INFO. Production remains unchanged.
- The isolated signal-test helper remains v32; deployed HTTP 409 for `VOICE_ATTEMPT_ALREADY_ACTIVE` remains unverified. Full-product TEST, RT-01, AUTH-02/AUTH-03, ACL/default-ACL remediation, coordinated endpoint/version cutover, human review, and physical Issue #78 acceptance remain open (0/8).

No production write, migration, deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change, function deactivation, or destructive operation occurred.


## 2026-11-08 08:01 BRT — generated Normal API runtime and API-first deploy guard

The prior cutover checkpoint is superseded by [the API runtime generation checkpoint](checkpoints/2026-11-08-api-runtime-generation.md). PR #85 HEAD `26e234d93532615457f76deb525fef6d0b042672` now generates both the Normal distribution runtime (`upstatus`) and its API runtime (beta10) from the same reviewed server template and 3.4.7 userscript artifact, with distinct path markers. Validate checks identical embedded artifacts and source parity after marker normalization.

The candidate manual-only production workflow deploys beta10 before `upstatus`. Its guard rejects missing API deploy/source, reversed order, unexpected production functions (including TEST), wrong project host and incomplete manifest. Exact-head Validate [42474461521](https://github.com/Reekyi/UpStatus/actions/runs/42474461521) passed. This is candidate build/workflow evidence only: no workflow_dispatch or deploy occurred, and beta10 remains live at v6.

The stable 3.4.7 #85 line remains distinct from the larger Normal signaling candidate #74. Production still has name-only chat-clear authorization, three exposed SECURITY DEFINER broadcasts, broad table/default ACLs, and no full-product TEST project. #78 remains 0/8 physical acceptance. #80/#82 retain their inherited base-validator failures.

No production write, migration, deploy, merge, release, publication, secret/role/grant/ACL/policy/flag change or destructive action occurred. QA-owned files and `docs/RELEASE_READINESS.md` were not modified.


## 2026-11-08 08:18 BRT — AUTH-03 release gate added

The [API runtime checkpoint](checkpoints/2026-11-08-api-runtime-generation.md) now records the first-access setup finding and new fail-closed gate. Live beta10 and the #85 template have the same extracted route/prefix/table/RPC identifiers, but differ in setup semantics: live beta10 still assigns admin by hard-coded name and allows first-caller setup; #85 removes name assignment but still lacks one-time admin-issued invites and atomic consumption. Production has five initialized users (three admins, two users), no setup-invite table/RPC, and only seven applied migrations.

PR #85 HEAD `7e84c31772b82437529addd96bf11490e1286e31` Validate [42475050634](https://github.com/Reekyi/UpStatus/actions/runs/42475050634) **SUCCESS**. The production cutover preflight intentionally blocks on missing AUTH-03 and its three migration sources. No automatic migration step was added. This is an expected release gate, not a failed Validate.


## 2026-11-08 08:20 BRT — AUTH-03 test wiring is a release gate

The [API runtime checkpoint](checkpoints/2026-11-08-api-runtime-generation.md) now records that production cutover also requires `scripts/auth-enrollment.test.mjs` to be wired into `scripts/validate.mjs`. PR #85 HEAD `b75707b6eaf678d87863144748b9aed8e2866455` Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) **SUCCESS**; the guard intentionally blocks on missing AUTH-03 server flow, missing wired regression test and three migration sources. This is an expected release gate. No migration/deploy/dispatch occurred.


## 2026-11-08 08:22 BRT — refreshed SQL privilege evidence

The [API runtime checkpoint](checkpoints/2026-11-08-api-runtime-generation.md) now records the latest SELECT-only grant/default-ACL snapshot: 9 of 10 backend tables checked grant all eight table privileges to anon and authenticated; `upstatus_visual_config` grants none. Three broadcasts remain SECURITY DEFINER/executable by both roles; ten RLS-enabled/no-policy findings remain. Default ACLs are broad for postgres and supabase_admin. The session cannot assume supabase_admin and no privilege changes were attempted.


## 2026-11-08 09:04 BRT / 12:04 UTC — cutover authorization guard and live AUTH-03 recheck

QA's latest release-readiness review identified two gaps in PR #85's fail-closed cutover guard: it checked stored-role authorization for chat clear but not the individual-message delete path, and it accepted a substring mentioning `auth-enrollment.test.mjs` rather than proving that Validate executes the Normal test.

- Created stacked Draft PR [#88](https://github.com/Reekyi/UpStatus/pull/88), based on PR #85's exact HEAD `b75707b6eaf678d87863144748b9aed8e2866455`. Candidate branch: `fix/production-cutover-guard-auth-delete-wiring-20261108`, current HEAD `f04d18d780ffc355b6bad457b8a12ef9fe07f82b` (PR #88 has nine commits and three changed files).
- The guard now requires `admin(name)` to read the account's persisted `implementation_admin` role; requires `deleteRoute` to call that helper and allow owner deletion while denying non-owner deletion without the stored admin role; and requires a standalone `execFileSync(...auth-enrollment.test.mjs, "normal"...)` statement in `scripts/validate.mjs`. It accepts both the exact single-path `path.join(ROOT,"scripts/auth-enrollment.test.mjs")` form used by #74 and the split-argument form; full-line/block comments, inline comments and Team Lite-only invocation do not satisfy the test gate.
- Added negative regressions for name-only delete authorization, name-based admin fallback, comment-only test references, inline-comment references, and Team Lite-only invocation. The regression suite also checks the actual Normal server template in the candidate checkout.
- Candidate-only push workflow [run 42478899179](https://github.com/Reekyi/UpStatus/actions/runs/42478899179) **SUCCESS** on exact HEAD `f04d18d7`; Node v24.22.2, both `node --check` checks, and the offline cutover guard suite passed, including actual Normal template checks and both #74 invocation shapes. The workflow now runs only on the isolated #88 and #85 candidate branches; it does not access Supabase or create fixtures. PR #88 remains Draft/unmerged and has no human review.
- PR #85 remains at HEAD `b75707b6eaf678d87863144748b9aed8e2866455`; Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) is SUCCESS, but its cutover diagnostic intentionally remains BLOCKED on the missing AUTH-03 invite flow, executable enrollment regression, and three production migration sources. The new guard hardening does not claim AUTH-03 is implemented.

### Production runtime AUTH-03 recheck — SELECT/read-only

Supabase Management API source retrieval and SQL SELECT confirmed the four operational runtimes remain:
- `upstatus` v480, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`;
- `upstatus-screen-share-3-1-1-beta10` v6, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`;
- `upstatus-team-lite` v15, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`;
- `upstatus-test` v281, source SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`.

All four live sources still permit first-caller setup for an uninitialized account and derive the initial admin fallback from the names Ricardo/Lohan/Guilherme. All four `/api/chat/clear` routes check only the session name Ricardo. All four individual-message delete handlers use `name === "Ricardo" || await admin(name)`, so the name bypass remains even though `admin(name)` itself reads the stored role. None of the four sources contains the setup-invite handler/RPC or setup-token columns.

Production SELECT returned 5 users, 3 explicit admins, zero uninitialized passwords, zero blank roles, zero setup-invite columns, no `consume_upstatus_setup_invite` RPC, and no product rate-limit table. This confirms a latent first-access and privilege-revocation weakness, not an existing uninitialized account. Production has 38 ACTIVE functions; the organization still has only production plus the isolated signaling/auth lab, with no full-product TEST project.

The previous shorthand that only the beta10/Team Lite/test runtimes had the individual-delete name fallback is superseded: the current `upstatus` v480 source has it too.

All SQL in this recheck was SELECT-only. No production write, migration, deployment, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change, function deactivation, or destructive action occurred. QA-owned `docs/RELEASE_READINESS.md` and branch #82 were not modified.


## 2026-11-08 — Normal AUTH-03 port and release-version gate

New stacked Draft candidate: [PR #89](https://github.com/Reekyi/UpStatus/pull/89), branch `fix/normal-auth03-build-safe-20261108`, HEAD `d5a4d445571507e433d9f86a6f120054f6cf2736`, 23 commits ahead of #88 and zero behind. It ports the one-time admin-issued setup-invite flow, removes plaintext password persistence and public setup enumeration, adds source-only migrations plus an allowlisted isolated integration runner, preserves tracked build sidecars, and blocks production cutover while `release.json` still reuses deployed version 3.4.7.

No CI run is visible for #89; no PASS is claimed. Its PR base is the #88 candidate branch, while the general Validate workflow only targets PRs based on master/develop. The push-only candidate workflow has no visible run for this branch. See [the detailed checkpoint](checkpoints/2026-11-08-auth03-stable-normal-port.md).

Fresh read-only production inspection confirms the four operational runtimes still have first-caller setup and name-based authorization fallbacks; production still has no setup-invite columns or RPC. Production branch `main` reports `MIGRATIONS_FAILED` while the project itself remains `ACTIVE_HEALTHY`. The lab already has the invite columns/RPC and remains empty; its signal helper is still v32 without the `VOICE_ATTEMPT_ALREADY_ACTIVE` HTTP 409 mapping.

No migration, SQL write, deploy, workflow dispatch, merge, release, publication, secret/role/grant/ACL/policy/flag change or function deactivation occurred. Issue #78 remains 0/8 physical.


## 2026-11-08 — Normal AUTH-03 isolated integration validation

PR [#89](https://github.com/Reekyi/UpStatus/pull/89) now has exact HEAD `cd0c7e41bb32f7ab85efd4982ad24b9206c27953` (25 commits ahead/0 behind #88, 21 files) and remains Draft. The first full Validate run failed only because `scripts/chat-regression.test.mjs:106` still expected the pre-invite role expression; the test was updated to assert the actual `enrolledRole/sessionRole` flow. Follow-up offline Validate [42485555356](https://github.com/Reekyi/UpStatus/actions/runs/42485555356) passed on `a740361`.

The candidate workflow now serializes AUTH-03 fixture tests with the existing Normal/Team Lite isolated suite and runs the integration runner only against the exact allowlisted lab origin with the existing isolated service-role secret and explicit mutation opt-in. Exact-head run [42485686643](https://github.com/Reekyi/UpStatus/actions/runs/42485686643) **SUCCESS**: full offline Validate, one-time invite/atomic-consumption integration, syntax, and cutover-guard regressions all passed. Coverage includes wrong/expired/replayed tokens, one-winner concurrency, blank-role fallback, explicit-role preservation, padded-admin non-escalation, and cleanup.

Post-run lab SELECT confirmed 0 users, 0 `__auth_test_*` fixtures, and 0 messages; the lab RPC is SECURITY INVOKER with empty `search_path`, service_role-only EXECUTE, and unique token-hash index. Production remains at seven migrations without invite columns/RPC. The cutover guard still blocks because `release.json` remains at deployed version 3.4.7 and no new stable version has been selected. The production managed branch `main` still reports `MIGRATIONS_FAILED` while the project is ACTIVE_HEALTHY; root cause requires Dashboard branch logs and is not inferred.

Detailed evidence: [AUTH-03 integration checkpoint](checkpoints/2026-11-08-auth03-integration-validation.md). #78 remains 0/8 physical. QA branch and `docs/RELEASE_READINESS.md` were not modified. Production remained read-only; no production migration, deploy, merge, release, publication, secret/role/grant/ACL/policy/flag change or function deactivation occurred.


## 2026-11-08 — Read-only AUTH-03 production migration-history gate

PR [#89](https://github.com/Reekyi/UpStatus/pull/89) advanced to exact HEAD `4224dc31683d4b235e52d2ddcece1570294763f0` (30 commits ahead/0 behind #88, 22 files; still Draft). Added `scripts/verify-production-migrations.mjs` and a read-only preflight to `deploy-production.yml` after project identity verification and before CLI/deploy. It calls the documented Management API `GET /v1/projects/{ref}/database/migrations`, checks exact AUTH-03 version/name pairs, rejects missing/duplicate/mismatched history and wrong/isolated refs, rejects redirects, uses a 15-second timeout, and fails closed on HTTP 403 with the required `database_migrations_read` scope. It does not apply migrations.

Extended `test-production-deploy-workflow-guard.mjs` (already wired into Validate) with mocked-GET success/failure cases and the exact seven-version production history observed today; that history is explicitly rejected. Exact-head candidate workflow [42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) **SUCCESS**. It ran full offline Validate, the allowlisted isolated AUTH-03 integration runner, syntax checks, and cutover regressions. The integration runner used only the isolated lab, explicit mutation opt-in, and the existing lab service-role secret; it passed wrong/expired/replayed token, one-winner concurrency, role preservation/non-escalation, and cleanup cases. Post-run SELECT: 0 users, 0 `__auth_test_*` fixtures, 0 messages.

Production still has only seven applied migrations (through `20261027155438`), no AUTH-03 invite columns/RPC, and `release.json` remains at deployed version 3.4.7. Thus the cutover guard remains blocked. The new Management API step will additionally require the three migration versions already applied and a token with `database_migrations_read`; token scope was not changed or verified. Supabase branch `main` reports `MIGRATIONS_FAILED` while the project is ACTIVE_HEALTHY; root cause still requires Dashboard branch logs.

Security snapshot 2026-11-08 13:46 UTC: 3 public SECURITY DEFINER broadcasts, 9/10 audited backend-owned tables with excessive client grants (including TRUNCATE), 10 RLS/no-policy INFO findings, two public Storage buckets with zero object policies. #80 Validate [42485867651](https://github.com/Reekyi/UpStatus/actions/runs/42485867651) still fails inherited `client signed upload helper missing`; #82 Validate [42486103438](https://github.com/Reekyi/UpStatus/actions/runs/42486103438) still fails inherited `production updateURL mismatch`. #78 remains 0/8 physical. QA branch and `docs/RELEASE_READINESS.md` unchanged.

Detailed evidence: [read-only production AUTH-03 migration-history preflight](checkpoints/2026-11-08-production-migration-history-preflight.md). Production remained read-only: no migration, SQL write, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation.


## 2026-11-08 — Team Lite AUTH-03 fixture-runner redirect hardening

A small safety-only candidate is open as [PR #90](https://github.com/Reekyi/UpStatus/pull/90), stacked on #76. It adds `redirect: "error"` to the AUTH-03 PostgREST fixture runner, makes the shared mutation-opt-in diagnostic runner-neutral, and extends offline assertions for exact lab origin, explicit opt-in, and redirect rejection. Its push-only workflow contains no Supabase secret and makes no network or fixture calls.

Exact HEAD `47e0b8760587e52448cf5954d823b00131b941fa` (4 commits ahead / 0 behind #76, four files). Offline workflow [42487717033](https://github.com/Reekyi/UpStatus/actions/runs/42487717033) **SUCCESS** on the exact SHA with Node v24.22.2: syntax checks, isolation/redirect guard, and `auth-enrollment.test.mjs team-lite` passed. The earlier #76 Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) remains the live-lab AUTH-03 evidence; #90 did not rerun fixtures.

Fresh read-only checks: production remains ACTIVE_HEALTHY with seven migrations, five users (three admins), no AUTH-03 columns/RPC, and four operational runtimes unchanged; the isolated lab remains clean with AUTH-03 schema/RPC present. The managed Supabase branch `main` still reports `MIGRATIONS_FAILED` while project/preview are healthy; root cause remains unavailable without Dashboard branch logs. Production release remains blocked at version 3.4.7 and missing AUTH-03 migrations. #78 remains 0/8 physical. Detailed checkpoint: [Team Lite AUTH-03 runner safety](checkpoints/2026-11-08-team-lite-auth-runner-safety.md).

No production write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation occurred.


### Ref refresh — documentation branch validation (2026-11-08 11:02 BRT / 14:02 UTC)

The #80 documentation-only branch advanced to exact HEAD `cde30c6e51f78f6f4d02aaababd30e64999bdae3` after the Team Lite runner checkpoint. Validate [42487811492](https://github.com/Reekyi/UpStatus/actions/runs/42487811492) failed at the same inherited `develop` assertion, `client signed upload helper missing`, `scripts/validate.mjs:55`. The log shows the build completed and no documentation-specific error; no validator was changed. #82 remains at exact HEAD `35fa63cf5a11c77b954095123db06e0de6c6767c`; Validate [42486103438](https://github.com/Reekyi/UpStatus/actions/runs/42486103438) fails only at the inherited `production updateURL mismatch` assertion, `scripts/validate.mjs:26`.


## 2026-11-08 — Team Lite generated API artifact parity

PR [#91](https://github.com/Reekyi/UpStatus/pull/91) is a Draft follow-up stacked on #76. It adds a regression for the generated `supabase/functions/upstatus-team-lite/index.ts` artifact and wires the Team Lite candidate workflow to run `scripts/build.mjs` before verifying the generated runtime. The check ties `VERSION`, embedded Base64 userscript bytes, update/download URLs, API/Realtime origins, path marker, and AUTH-03 invite/RPC code to the reviewed Team Lite source/manifest.

Exact HEAD `cb65cb831910d384715addf98285d01a273e2c6a` (4 commits ahead / 0 behind #76, three files). First run [42488077053](https://github.com/Reekyi/UpStatus/actions/runs/42488077053) exposed an over-escaped semver regex in the new test; corrected without product changes. Exact-head workflow [42488110607](https://github.com/Reekyi/UpStatus/actions/runs/42488110607) **SUCCESS** on Node v24.22.2: build generated Team Lite 3.4.31, exact embedded-artifact parity passed, and the full offline Team Lite candidate checks passed. The workflow used no Supabase secret/network/fixtures and did not deploy.

New blocker confirmed during this review: the Team Lite branch's inherited `deploy-production.yml` still uses Supabase CLI `latest`, job-level credentials and deploys only `upstatus`; it does not deploy `upstatus-team-lite`. Production Team Lite remains v15 with embedded 3.4.30 while the candidate is 3.4.31. A dedicated API-first Team Lite deploy/cutover/rollback guard is still required before publication. Detailed checkpoint: [Team Lite build artifact parity](checkpoints/2026-11-08-team-lite-build-artifact-parity.md).

Related [PR #90](https://github.com/Reekyi/UpStatus/pull/90) hardens the Team Lite AUTH-03 fixture runner; exact-head offline workflow [42487717033](https://github.com/Reekyi/UpStatus/actions/runs/42487717033) SUCCESS. #90 and #91 remain separate Draft PRs stacked on #76.

No production write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation occurred.



## 2026-11-08 — Function-specific JWT configuration for custom-auth runtimes

New Draft follow-ups:
- [#92 Team Lite JWT config](https://github.com/Reekyi/UpStatus/pull/92), exact HEAD `2a1b8c74a255b92fe17844b521b49f184888f852`, 7 ahead / 0 behind #91. Adds `[functions.upstatus-team-lite] verify_jwt = false`, a strict parser/regression guard, Team Lite candidate wiring, and offline build/artifact/config validation. [Run 42493683062](https://github.com/Reekyi/UpStatus/actions/runs/42493683062) SUCCESS on exact HEAD; generated Team Lite 3.4.31 and verified byte parity.
- [#93 Normal beta10 JWT config](https://github.com/Reekyi/UpStatus/pull/93), exact HEAD `fb9ccd9b9aa69a329e7340f87fc8b07c82618bbe`, 5 ahead / 0 behind #89. Adds `[functions.upstatus-screen-share-3-1-1-beta10] verify_jwt = false` and wires the config guard into full Normal Validate for upstatus, beta10 and upstatus-test. [Run 42493686213](https://github.com/Reekyi/UpStatus/actions/runs/42493686213) SUCCESS on exact HEAD, including full offline Validate.
- Corrected PR #90 and #91 base metadata to the #76 candidate branch, matching their stated stacked lineage and preventing duplicate full-candidate diffs. #92 is stacked on #91; #93 is stacked on #89. All remain Draft.

### Root cause

Production's four operational functions currently report `verify_jwt=false`. Their handlers validate the custom UpStatus session token. Supabase CLI defaults `functions.<slug>.verify_jwt` to `true` unless an explicit function config or `--no-verify-jwt` flag overrides it. The Normal candidate lacked the beta10 function block; the Team Lite candidate lacked its function block. The existing deployment commands do not pass `--no-verify-jwt`. A future deploy could therefore change gateway authentication behavior and reject clients before custom handler auth runs.

Supabase docs: https://supabase.com/docs/guides/local-development/cli/config and https://supabase.com/docs/guides/functions/function-configuration.

### Current CI and runtime evidence — 2026-11-08

#### Active PR stack

| PR | Exact HEAD | State / evidence |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) + Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS |
| [#75 Baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS |
| [#80 Continuity](https://github.com/Reekyi/UpStatus/pull/80) | This file's own docs branch | Validate continues to fail the inherited `client signed upload helper missing` contract at line 55; exact head/run is tracked in PR #80 to avoid a self-referential SHA here |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `b9730facf85a86b6b0cc22dec2f6f1bfed746032` | Validate [42496126120](https://github.com/Reekyi/UpStatus/actions/runs/42496126120) FAIL: inherited `production updateURL mismatch`, line 26 |
| [#85 Master stabilization](https://github.com/Reekyi/UpStatus/pull/85) | `b75707b6eaf678d87863144748b9aed8e2866455` | Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) SUCCESS; production cutover diagnostic remains BLOCKED |
| [#88 Guard hardening](https://github.com/Reekyi/UpStatus/pull/88) | `f04d18d780ffc355b6bad457b8a12ef9fe07f82b` | Candidate guard [42478899179](https://github.com/Reekyi/UpStatus/actions/runs/42478899179) SUCCESS |
| [#89 Normal AUTH-03](https://github.com/Reekyi/UpStatus/pull/89) | `4224dc31683d4b235e52d2ddcece1570294763f0` | Production cutover guard [42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) SUCCESS; release remains blocked until migrations and rollout are ready |
| [#90 Team Lite runner](https://github.com/Reekyi/UpStatus/pull/90) | `47e0b8760587e52448cf5954d823b00131b941fa` | [42487717033](https://github.com/Reekyi/UpStatus/actions/runs/42487717033) SUCCESS |
| [#91 Team Lite artifact parity](https://github.com/Reekyi/UpStatus/pull/91) | `cb65cb831910d384715addf98285d01a273e2c6a` | [42488110607](https://github.com/Reekyi/UpStatus/actions/runs/42488110607) SUCCESS |
| [#92 Team Lite JWT config](https://github.com/Reekyi/UpStatus/pull/92) | `2a1b8c74a255b92fe17844b521b49f184888f852` | [42493683062](https://github.com/Reekyi/UpStatus/actions/runs/42493683062) SUCCESS |
| [#93 Normal JWT config](https://github.com/Reekyi/UpStatus/pull/93) | `fb9ccd9b9aa69a329e7340f87fc8b07c82618bbe` | [42493686213](https://github.com/Reekyi/UpStatus/actions/runs/42493686213) SUCCESS |
| [#94 Normal setup-invite UI](https://github.com/Reekyi/UpStatus/pull/94) | `00462a202661fe3502d015dd2dd0ef1da239059d` | Full offline Validate [42498502349](https://github.com/Reekyi/UpStatus/actions/runs/42498502349) SUCCESS |
| [#95 Team Lite setup-invite UI](https://github.com/Reekyi/UpStatus/pull/95) | `3dc309ce17470eb706d3cd2223e99e33a94a8bd6` | VM + authenticated offline browser + build parity [42499554010](https://github.com/Reekyi/UpStatus/actions/runs/42499554010) and [42499560082](https://github.com/Reekyi/UpStatus/actions/runs/42499560082) SUCCESS |

All PRs remain open and Draft; no human reviews have been submitted. #94 is stacked on #93; #95 is stacked on #92. Do not merge either child independently of its parent.

#### Latest setup-invite UI work

Detailed checkpoint: [Admin setup-invite UI: Normal and Team Lite](checkpoints/2026-11-08-admin-setup-invite-ui.md).

- Both clients now expose the candidate `POST /api/setup-invite` route in the admin health panel.
- The client validates the returned account name, 64-hex token and future expiry, then copies through `GM_setClipboard` with Clipboard API fallback.
- Raw invite tokens are not rendered, persisted or logged.
- Team Lite's minimal UI had removed the settings entry for all roles, leaving the admin health/invite panel unreachable. The candidate now retains that entry only for `implementation_admin`.
- Normal has VM-backed helper contract tests. Team Lite additionally has an authenticated offline Playwright Full-IIFE smoke using inert GM/API/Realtime stubs and build artifact parity.
- These tests do not constitute live Edge Function HTTP integration or a real Tampermonkey clipboard test.

#### Current GitHub branches and governance

- `master`: `9d40461`; `develop`: `6b33e1e`; `team-lite-official`: `9065bc1`.
- The three official branches currently report `protected=false`; repository rulesets list is empty. The current connection receives HTTP 403 for classic branch-protection writes, so no protection change was attempted.
- A separate `fix/normal-signaling-timeout-retry-20261108` branch exists outside the PR stack and was left untouched to avoid concurrent work collision.

#### Supabase read-only snapshot

- Production `dlfvkawaiqduhlazsszm`: PostgreSQL 17.11.0.002, 7 migrations, 38 ACTIVE Edge Functions. Operational versions remain Normal `upstatus` v480, beta10 v6, Team Lite v15, TEST v281. All 38 functions report `verify_jwt=false`.
- Production users: 5 total, 3 `implementation_admin`, 0 uninitialized passwords, 0 empty roles. The four setup-invite columns and `consume_upstatus_setup_invite` RPC are absent.
- Laboratory `bfpjtfqlnypisxljoxkb`: PostgreSQL 17.11.0.003, 38 migrations, 2 Edge Functions, 0 users after cleanup; setup-invite schema/RPC are present.
- No third TEST full-product project exists.
- Production Security Advisor remains 6 WARN (three SECURITY DEFINER broadcasts for anon and three for authenticated) and 10 INFO (RLS-enabled tables without policies). Nine of ten audited backend-owned tables retain excessive client grants; default ACL and Storage policy work remains open.
- The managed Supabase branch `main` still reports `MIGRATIONS_FAILED` while the project and preview are healthy; the branch-specific Dashboard logs are still needed to diagnose it.

#### Remaining release gates

1. AUTH-03 migrations are absent from production; do not deploy the new UI/runtime before an explicitly authorized migration and coordinated rollout plan.
2. Migration-to-deploy first-access window, post-migration catalog verification, and full four-runtime rollback plan remain open.
3. Team Lite needs a dedicated production deploy workflow with project/SHA verification, pinned CLI, migration preflight, API-before-client ordering, and rollback.
4. Live HTTP Deno integration for setup-invite and the signaling HTTP 409 mapping remains unverified; signal helper remains v32.
5. RT-01 broadcasts, ACL-02/default ACLs and Storage policies remain unresolved.
6. AUTH-02 trusted-IP/rate-limit design remains open.
7. TEST full-product, human reviews, branch protection and physical acceptance remain open.
8. Issue #78 remains 0/8 physical criteria. Issue #79 body still contains the historical 16/35 checklist and needs reconciliation.

QA's `docs/RELEASE_READINESS.md` branch was read but not modified. Its earlier “no client UI to issue invites” finding is superseded by candidate PRs #94/#95; QA should review the exact-head evidence. The migration, deployment, live HTTP and physical acceptance gates are not closed.

Production remained read-only. No SQL write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change, function deactivation or destructive operation occurred.


## 2026-11-08 — Public Realtime command trust and Normal Full-IIFE follow-up

Checkpoint: [public Realtime command guard and P0 status](checkpoints/2026-11-08-public-realtime-command-guard.md).

- Draft [PR #99](https://github.com/Reekyi/UpStatus/pull/99), stacked on Normal UI #94, changes public remote_command to a debounced wake-up only. The client fetches the command from authenticated GET /api/remote-status; forged broadcast payloads are ignored, and pending hints are discarded when token/member changes. Exact HEAD bdce39626a9636f441ffe2988c87706b9f7c7154. Push 42503182292 and PR 42503227603 SUCCESS; full offline Validate passed.
- Scope is narrow: public call_signal, voice-room and screen-share signaling remain P0. No live malicious broadcast was sent; QA's finding remains a static high-impact security finding until the authenticated signaling cutover is implemented and tested.
- Normal Full-IIFE #98 failed because its test waited for a settings button inside the still-collapsed card. The exact log 42502183259 shows 24 hidden locator resolutions at scripts/test-normal-setup-invite-browser.mjs:162. Test-only child [PR #100](https://github.com/Reekyi/UpStatus/pull/100) opens the card before waiting and adds diagnostics; exact-head push [42503432784](https://github.com/Reekyi/UpStatus/actions/runs/42503432784) SUCCESS, with admin and ordinary-user Full-IIFE scenarios plus full offline Validate passing.
- Related UI/contract candidates: #94, #95, #96 and #97 passed their cited exact-head offline/browser workflows; #98 remains failed pending #100. All remain Draft.
- Fresh production reads: 38 Edge Functions ACTIVE; four operational versions v480/v6/v15/v281; all verify_jwt=false. All four operational sources still lack /api/setup-invite and retain first-caller/name-based authorization paths. Production has seven migrations, zero setup-token columns/RPCs, 50 realtime.messages rows, seven partitions and three SECURITY DEFINER trigger functions. Security Advisor: 6 WARN / 10 INFO; performance and health empty.
- Lab has 38 migrations, four setup-token columns, one consume RPC, zero users/messages/realtime rows. Production managed branch main remains MIGRATIONS_FAILED while project/preview are healthy; Dashboard branch logs are still needed.

All production operations were read-only. No migration, SQL write, deploy, workflow dispatch, merge, release, publication, secret/role/grant/ACL/policy/flag change or function deactivation occurred. QA branch and docs/RELEASE_READINESS.md remain untouched. Issue #78 remains 0/8 physical.


## 2026-11-08 — Production server-mediated signaling source candidate

Checkpoint: [production signaling function candidate](checkpoints/2026-11-08-production-signaling-runtime-candidate.md).

- Draft [PR #101](https://github.com/Reekyi/UpStatus/pull/101), stacked on Normal #74 at base HEAD `9c0133e8cf6bd85ac8993888718a408db2f24a3e`; candidate HEAD `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7`.
- Added a distinct `supabase/functions/upstatus-signal/` production-source candidate, its bounded JSON parser and legacy-envelope sidecar, explicit `verify_jwt=false`, and an offline parity test wired into Normal Validate.
- Added production migration source `20261108190000_distributed_signaling_rate_limit.sql`. It creates the RLS-enabled rate-limit table, grants table/function access only to `service_role`, uses SECURITY INVOKER with an empty search_path, and bounds opportunistic stale-bucket cleanup to 100 rows.
- The production handler is byte-identical to the reviewed Normal isolated handler after normalizing the health service label. A read-only comparison against lab `upstatus-signal-test` v32 found exactly one functional difference in the candidate: `VOICE_ATTEMPT_ALREADY_ACTIVE` now maps to HTTP 409; `body.mjs` and `legacy-envelope.mjs` are byte-identical.
- Lab catalog confirms `upstatus_signal_rate_limits` is RLS-enabled; anon/authenticated have no table privileges or RPC EXECUTE, while service_role has the required privileges. The deployed lab function itself remains v32 and unchanged.
- Exact-head workflow [42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464) SUCCESS on Node v24.22.2. Offline parity regression and complete Normal Validate passed. The first workflow attempt [42513272235](https://github.com/Reekyi/UpStatus/actions/runs/42513272235) failed because shallow checkout omitted `origin/team-lite-official`; the workflow was corrected to `fetch-depth: 0`, then the exact-head rerun passed.
- Production read-only catalog confirms all signaling schema objects are absent: rooms, memberships, events, bindings, call attempts, voice attempts, rate-limit table and rate-limit RPC. Production still has seven migrations and four active operational runtimes. No production schema or runtime was changed.
- This is a source/schema candidate only. The production deploy workflow is not yet wired to deploy `upstatus-signal`; the clients still default authenticated transport off and retain public call/voice/screen fallback. **RT-01 remains P0 and is not closed.** Do not deploy or enable the transport until schema preflight, post-migration catalog verification, production deploy/rollback sequencing, both-client cutover, and explicit authorization are complete.


### 2026-11-08 16:10 BRT — Realtime and Storage qualification

- Production Realtime has 50 stored messages, all `private=false` (42 `user_status`, 8 `db_change`), on topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. The message trigger emits full OLD/NEW JSON. QA reports the current client subscription uses a different topic; external access was not reproduced. Treat this as a public-payload design concern, not a demonstrated exploit.
- Security Advisor's six SECURITY DEFINER warnings concern trigger-returning functions; the warning text alone does not prove ordinary PostgREST RPC invocation. Review grants and trigger payloads separately.
- Ten audited public tables have RLS and zero policies; nine grant effective TRUNCATE to anon/authenticated, with `upstatus_visual_config` the exception. `realtime.messages` also has SELECT/INSERT grants but RLS has no policies.
- Production Storage buckets are both public and 20 MiB. `chat-images` accepts document/video/audio types; `profile-images` accepts image types. Candidate config instead sets chat to 25 MB and profile to 2 MB, and its chat MIME list omits production document types. This mismatch needs a deliberate Storage decision before release; no bucket/config changes were made.
- `storage.objects` has RLS and zero policies. Default ACLs remain broad for postgres/supabase_admin. No ACL or policy writes were made.


## 2026-11-08 17:20 BRT — Authenticated call-source provenance hardening

Checkpoint: [authenticated call-source provenance](checkpoints/2026-11-08-authenticated-call-source-provenance.md).

- Draft [PR #102](https://github.com/Reekyi/UpStatus/pull/102), Normal, exact HEAD `c4a5cae1271147204ab3b0c79b8916235f0799aa`; [full offline Validate 42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669) SUCCESS.
- Draft [PR #103](https://github.com/Reekyi/UpStatus/pull/103), Team Lite, exact HEAD `b3fb66429851024ee513bccb4700c944e50ff0cb`; focused offline push 42519559614 and PR 42519564405 SUCCESS.
- Both clients previously trusted a client-supplied `_authenticatedTransport: true` payload property. A public Realtime sender could forge it. The candidate now passes source provenance as an explicit `receiveCallSignal(payload, authenticatedSource)` argument: authenticated polling/invitations pass true; public Realtime always passes false.
- The shared discovery allowlist accepts only own-property `presence` and `ended` hints with `discoveryOnly: true`. The public `ended` handler only removes a directory entry. Public `join_declined`, offer, answer and ICE messages are not discovery hints.
- The first exact-head attempts exposed stale test assumptions (Normal chat regression and Team Lite bundled adapter parity). Both were corrected without changing production behavior; subsequent exact-head workflows passed.
- Residual: public presence/ended can still mislead or hide directory entries. They do not grant membership or authorize call control. Removing public discovery remains part of the server-mediated Realtime cutover.

No Supabase operation or production change occurred. QA release-readiness branch remains untouched.


## 2026-11-08 19:06 BRT — voice-room open 409 route regression and runtime reconciliation

### Exact candidate and CI

- Read the current continuity guide and CURRENT_STATE; read the independent QA release-readiness blob at QA HEAD 3ba9c15a61d220c46e7906b2f9c21b545401530e (blob 7cfbd70886df42ce790c078c224b19284a632595, 1,055,655 bytes) and the latest QA audit entry. The QA branch and release-readiness document were not edited.
- New Draft child PR #105, base Normal provenance PR #102 at c4a5cae1271147204ab3b0c79b8916235f0799aa; exact HEAD 763b3e808b5e9c2d49a5d8f9c714fe0552ae657d, 4 commits ahead / 0 behind.
- #105 adds a route-scoped assertion to scripts/production-signal-source-parity.test.mjs: it extracts the actual /room/open block from both production and isolated repository handlers, requires the attempt RPC wiring, requires VOICE_ATTEMPT_CONFLICT, VOICE_ATTEMPT_ALREADY_ACTIVE, and ROOM_FULL to map to 409, and requires the response to use that status.
- Exact-head offline workflow: push 42528459983 SUCCESS and pull_request 42528477389 SUCCESS. The PR remains Draft with zero human reviews. This is source/route-wiring coverage plus full offline Normal Validate, not live HTTP integration.

### HTTP 409 — candidate source versus deployed lab runtime

- The production candidate source in #101/#102 already includes VOICE_ATTEMPT_ALREADY_ACTIVE in the inline /room/open 409 mapping. The new #105 test closes the route-specific regression-coverage gap for that source.
- The repository's isolated handler source is byte-identical to the production candidate after normalizing the health service label.
- The deployed isolated upstatus-signal-test remains v32, SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712; its actual retrieved /room/open block maps VOICE_ATTEMPT_CONFLICT and ROOM_FULL to 409 but omits VOICE_ATTEMPT_ALREADY_ACTIVE, which falls through to 500. No HTTP request was sent and no lab deploy was performed.
- Team Lite's separate helper/test path in #76 is covered by QA's 11/11 offline contract; it also has no live HTTP 409 proof against the deployed v32 runtime.

### Current branch graph and CI

| PR | Exact HEAD | Current evidence |
|---|---|---|
| #74 Normal | 9c0133e8cf6bd85ac8993888718a408db2f24a3e | Validate + Smoke historical SUCCESS |
| #75 baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks historical PASS |
| #76 Team Lite | eb28e88325d7e8a6236d9050bebabf794d64a8c4 | 110/110 candidate checks reported PASS |
| #80 continuity | c4943c71fe9e0584b53d09bb06ba6c2e6a1472f6 | No new run observed for this docs-only correction; prior HEAD 156ef9d Validate [42528784996](https://github.com/Reekyi/UpStatus/actions/runs/42528784996) failed inherited client signed upload helper missing (scripts/validate.mjs:55) |
| #82 QA | 3ba9c15a61d220c46e7906b2f9c21b545401530e | Validate fails inherited production updateURL mismatch (scripts/validate.mjs:26) |
| #101 signaling | 2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7 | Offline source parity + full Validate SUCCESS |
| #102 Normal provenance | c4a5cae1271147204ab3b0c79b8916235f0799aa | Full offline Validate SUCCESS |
| #103 Team Lite provenance | b3fb66429851024ee513bccb4700c944e50ff0cb | Push + PR offline checks SUCCESS |
| #104 RT-01 guard | da45e7418a9d9c7719ca447a25024aeb4a553bfc | Offline guard workflow SUCCESS; separate branch line |
| #105 409 route test | 763b3e808b5e9c2d49a5d8f9c714fe0552ae657d | Push + PR offline Validate SUCCESS |

- #104 is 11 commits ahead of its RT-01 parent 0ff11af43e78bfe57d39a2a0098c30f29afed9a2, but its head is 119 ahead / 887 behind #101 (merge base a9288ccfcb0f308d3a587bfca624418a395be07b). It is not an integrated signaling release line. Do not merge it into #101 or master as-is.
- #80 prior HEAD 156ef9d Validate [42528784996](https://github.com/Reekyi/UpStatus/actions/runs/42528784996) remains red on the inherited develop assertion; no new run was observed for final docs-only HEAD c4943c71. #82 exact-head Validate [42526633725](https://github.com/Reekyi/UpStatus/actions/runs/42526633725) remains red on the inherited master updateURL assertion. Neither validator was weakened.
- Official branch rulesets remain empty; branch protection for master/develop/team-lite-official is not proven.

### Supabase read-only snapshot

- Production dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through 20261027155438, 38/38 Edge Functions ACTIVE. Operational versions remain upstatus v480, beta10 v6, Team Lite v15, TEST v281; all report verify_jwt=false.
- Production still has no upstatus-signal, no signaling tables/RPCs, no distributed rate-limit table/RPC, and no AUTH-03 setup-invite columns/RPC. The managed Supabase branch main still reports MIGRATIONS_FAILED while the project/preview are healthy.
- Production realtime.messages: 50 rows, all private=false, 7 partitions. The three upstatus_broadcast_* functions remain SECURITY DEFINER with search_path=public and effective EXECUTE for anon/authenticated. Ten public tables have RLS and zero policies; nine retain client grants including TRUNCATE. Security Advisor: 6 WARN / 10 INFO.
- Production Storage buckets chat-images and profile-images remain public, 20 MiB each, with zero storage.objects policies. Candidate size/MIME config still differs.
- Laboratory bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, 2 Edge Functions; signal/setup-invite schema and RPCs exist. It has zero users/messages/Realtime rows. Security Advisor: 0 WARN / 17 INFO. The deployed signal-test function remains v32; no function was updated.

### Issues and remaining gates

- Issue #78 remains 0/8 physical acceptance criteria. No real Tampermonkey network-loss/no-F5, microphone/display permission, or installed Normal ↔ Team Lite test was performed.
- Issue #79 body remains the historical 16/35 checklist and needs formal reconciliation with QA.
- RT-01 remains P0: the client source fixes provenance but transport is still default-off; production lacks the signaling backend/schema; public Realtime media/discovery fallback remains.
- AUTH-03, AUTH-02, Team Lite deploy target, post-migration catalog verification, rollback sequencing, Storage policy, grants/default ACLs, HTTP 409 live proof, human reviews, and full TEST project remain open.

No production or laboratory writes, migrations, deploys, workflow dispatches, merges, releases, userscript publication, secrets/roles/grants/ACL/policy/flag changes, or destructive operations occurred. All Supabase SQL was SELECT-only.

## Engineering checkpoint — 2026-11-08 20:03 BRT / 23:03 UTC

### Voice-room open HTTP contract

- PR #105 now points at HEAD `d6f719ef4f32627b77622368d4c108c8afd20e21`. Its workflow trigger was extended to validate child route-contract PRs. Exact-head Validate checks [42533174777](https://github.com/Reekyi/UpStatus/actions/runs/42533174777) and [42533180658](https://github.com/Reekyi/UpStatus/actions/runs/42533180658) both passed.
- New Draft child [PR #106](https://github.com/Reekyi/UpStatus/pull/106), HEAD `e510731f817b8d6a77ed86a6352d38b0f9e1512d`, extracts the existing `/room/open` RPC-result status mapping into byte-identical `http-contract.mjs` helpers for production and isolated handlers.
- The source-parity test now imports and executes the actual helper modules. It covers 400/404/410/409/500 mappings, `VOICE_ATTEMPT_ALREADY_ACTIVE`, malformed results, and prototype-like keys (`constructor`, `toString`, `__proto__`). It also verifies that both route blocks call the helper.
- Workflow path filters now include every helper/source/config/migration input consumed by the parity test. Exact-head push validation [42533249030](https://github.com/Reekyi/UpStatus/actions/runs/42533249030) and PR validation [42533254905](https://github.com/Reekyi/UpStatus/actions/runs/42533254905) both passed on HEAD `e510731f`. Node v24.22.2; source-parity contract and full offline Normal Validate passed.
- Supabase Preview was skipped because this candidate branch is not associated with a Supabase branch. No Supabase call, fixture, migration, HTTP request to a deployed function, or deployment occurred. This is executable source-level status mapping, not live HTTP proof.
- PR #106 remains Draft with zero human reviews. Its parent branch advanced after the child fork; comparison is 9 ahead / 1 behind and GitHub currently reports mergeable. Reconcile ancestry before any future integration.

### Current required PRs and CI

| PR | Exact HEAD | Current exact-head check evidence |
|---|---|---|
| #74 Normal | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) PASS; Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) PASS |
| #75 Baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate checks [41674344881](https://github.com/Reekyi/UpStatus/actions/runs/41674344881) and [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS |
| #76 Team Lite | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Candidate checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) PASS |
| #80 Continuity | `c7deca803e4a19dbba3017d640daa8e7e6c93522` | Validate [42529056916](https://github.com/Reekyi/UpStatus/actions/runs/42529056916) FAIL: inherited `client signed upload helper missing` at `scripts/validate.mjs:55` |
| #82 QA | `4807f1212587e036390097c878e41ebec5846d90` | Validate [42530636037](https://github.com/Reekyi/UpStatus/actions/runs/42530636037) FAIL: inherited `production updateURL mismatch` at `scripts/validate.mjs:26` |
| #101 Production signaling | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` | Validate [42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464) PASS |
| #102 Normal provenance | `c4a5cae1271147204ab3b0c79b8916235f0799aa` | Validate [42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669) PASS |
| #103 Team Lite provenance | `b3fb66429851024ee513bccb4700c944e50ff0cb` | Offline push [42519559614](https://github.com/Reekyi/UpStatus/actions/runs/42519559614) and PR [42519564405](https://github.com/Reekyi/UpStatus/actions/runs/42519564405) PASS |
| #104 RT-01 guard | `da45e7418a9d9c7719ca447a25024aeb4a553bfc` | Guard [42524476674](https://github.com/Reekyi/UpStatus/actions/runs/42524476674) PASS |
| #105 Route 409 guard | `d6f719ef4f32627b77622368d4c108c8afd20e21` | Validate [42533174777](https://github.com/Reekyi/UpStatus/actions/runs/42533174777) and [42533180658](https://github.com/Reekyi/UpStatus/actions/runs/42533180658) PASS |
| #106 Executable status mapper | `e510731f817b8d6a77ed86a6352d38b0f9e1512d` | Exact-head push [42533249030](https://github.com/Reekyi/UpStatus/actions/runs/42533249030) and PR [42533254905](https://github.com/Reekyi/UpStatus/actions/runs/42533254905) PASS |

All listed PRs remain open and Draft. No human review has been submitted for #106. #80/#82 validators were not weakened.

### Fresh Supabase read-only snapshot

- Production `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38/38 Edge Functions ACTIVE. Operational versions remain `upstatus` v480, beta10 v6, Team Lite v15, TEST v281; all report `verify_jwt=false`.
- Production still has no `upstatus-signal`, no signal room/member/event/rate-limit tables or rate-limit RPC, and no AUTH-03 setup-token columns/RPC. Five users, three `implementation_admin`, zero empty password hashes, zero blank roles.
- Production `realtime.messages`: 50 rows, all `private=false`, seven partitions. The three `upstatus_broadcast_*` functions remain SECURITY DEFINER with `search_path=public`, trigger return type, and effective EXECUTE for anon/authenticated. Ten public tables have RLS and zero policies; nine still grant TRUNCATE to anon/authenticated. Security Advisor: 6 WARN / 10 INFO.
- Production buckets `chat-images` and `profile-images` remain public at 20 MiB each; `storage.objects` has zero policies. Candidate size/MIME settings still differ.
- Laboratory `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 38 migrations, two functions (`upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3). Signal schema/rate-limit RPC and four setup-token columns exist; users, messages, rooms, memberships, events, attempts, rate-limit rows, and Realtime rows are zero. No lab function was deployed.
- Supabase managed branch `main` remains `MIGRATIONS_FAILED` while project and preview are healthy; diagnosis still requires the branch logs in Dashboard.

### Issues and remaining gates

- Issue #78 remains OPEN with 0/8 physical acceptance criteria. No real Tampermonkey network-loss/no-F5, microphone/display permission, or installed Normal ↔ Team Lite test was performed.
- Issue #79 remains OPEN; its body still contains the historical 16/35 checklist and requires formal reconciliation with QA.
- RT-01 remains P0: production has no signaling backend/schema, client transport is default-off, and public Realtime discovery/control fallback remains in the deployed clients. The new #106 helper does not close this cutover.
- AUTH-03, AUTH-02, Team Lite deploy target, post-migration catalog verification, rollback sequencing, Storage policy/limits, grants/default ACLs, public broadcast payloads, live HTTP 409 proof, human reviews, and a full TEST project remain open.

No production or laboratory writes, migrations, deployments, workflow dispatches, merges, releases, userscript publication, secret/role/grant/ACL/policy/flag changes, or destructive operations occurred. All Supabase SQL in this checkpoint was SELECT-only.

## Engineering checkpoint — 2026-11-08 20:56 BRT — voice-room RPC error-shape guard

- Reviewed the current Normal/Team Lite release guide, current-state handoff, RT-01 matrix path on the QA branch, and the latest independent QA notes. The QA release-readiness file itself was too large for the connector's file-content response (empty payload); its current checklist and latest findings were cross-checked through issue #79 and the latest PR #82 discussion. The QA branch and its document were not modified.
- New Draft [PR #108](https://github.com/Reekyi/UpStatus/pull/108), stacked on #106, hardens the voice-room /room/open error contract. The mapper now requires an own, non-empty string error field and performs exact Map lookup without String coercion. Both production and isolated routes use a safe fallback error code for malformed RPC results.
- Regression coverage now includes empty, numeric, boolean, array, object-with-non-callable-toString, and inherited error values. The route guard rejects String(result.error) coercion and requires Object.hasOwn.
- Exact final HEAD: 4ed96f441dea31cf1fa893139c0f49c74f4343b5. Push Validate [42537930135](https://github.com/Reekyi/UpStatus/actions/runs/42537930135) and PR Validate [42537935210](https://github.com/Reekyi/UpStatus/actions/runs/42537935210) both SUCCESS. Parent #106 workflow update [42537927234](https://github.com/Reekyi/UpStatus/actions/runs/42537927234) also SUCCESS.
- A first stacked branch/PR #107 forked before the parent workflow-trigger update and became dirty (7 ahead / 1 behind). It was not integrated. A clean replacement branch/PR #108 was created from the updated parent; current comparison is 8 ahead / 0 behind and GitHub reports mergeable. Keep #107 Draft and treat it as superseded; do not integrate it.
- The mapper change is still source-level/offline validation, not a live HTTP request to an Edge Function. Lab upstatus-signal-test remains v32 and the deployed source still lacks VOICE_ATTEMPT_ALREADY_ACTIVE → 409. No lab deploy or fixture was performed.
- Supabase read-only recheck: production remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions; lab remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, 2 test functions. Production still has no signal schema/rate-limit RPC or AUTH-03 schema. Lab signal tables are empty.
- Production SQL SELECT confirmed 50 Realtime rows, all public, seven partitions; three trigger-returning SECURITY DEFINER broadcast functions retain search_path=public and effective EXECUTE for anon/authenticated. Nine backend-owned tables still grant broad client privileges including TRUNCATE. Security Advisor remains 6 WARN / 10 INFO. No production or lab writes occurred.
- Issue #78 remains 0/8 physical criteria. Issue #79 retains the historical 16/35 checklist and needs QA reconciliation. RT-01, AUTH-03, AUTH-02, Storage/grants/default ACLs, Team Lite deploy, live HTTP 409, full TEST, human reviews, and physical browser acceptance remain open.
- No merge, deployment, migration, workflow dispatch, release, userscript publication, secret/role/grant/ACL/policy/flag change, or destructive operation occurred. Production and lab SQL were SELECT-only.

## Engineering correction — 2026-11-08 21:06 BRT — final stacked HTTP guard heads

- The first error-shape child PR #107 was left Draft and marked superseded because it was forked before the parent workflow trigger update and became dirty. Clean replacement [PR #108](https://github.com/Reekyi/UpStatus/pull/108) is now at exact HEAD bdb7c5b23d2723eb7782f5e7e91c249a1e9a1736, 9 ahead / 3 behind its current stack base, and GitHub reports mergeable/clean. It remains Draft.
- The parent stack workflow was reconciled so the route guard and HTTP-contract child triggers use the same workflow content while preserving the original #105 path behavior. Current PR #105 HEAD 28d4aaaedc52e16d6ded938b842cf048aceefe30: push [42538282592](https://github.com/Reekyi/UpStatus/actions/runs/42538282592) and PR [42538289953](https://github.com/Reekyi/UpStatus/actions/runs/42538289953) SUCCESS.
- Current PR #106 HEAD 7ed1f8ca602d8127d5c38727de304ae8d4b7b7c0: push [42538288485](https://github.com/Reekyi/UpStatus/actions/runs/42538288485) and PR [42538295974](https://github.com/Reekyi/UpStatus/actions/runs/42538295974) SUCCESS. GitHub reports mergeable/clean, though the stack comparison is 15 ahead / 3 behind after parent workflow-only updates.
- Current PR #108 exact-head push [42538296549](https://github.com/Reekyi/UpStatus/actions/runs/42538296549) and PR [42538303740](https://github.com/Reekyi/UpStatus/actions/runs/42538303740) both SUCCESS. The helper rejects non-own, empty, and non-string RPC error values without coercion; both routes use a safe fallback code and the parity test exercises malformed cases.
- The exact validation is offline/source-level. No live HTTP request to the deployed Edge Function occurred. Lab upstatus-signal-test remains v32, and its retrieved deployed source still maps VOICE_ATTEMPT_CONFLICT and ROOM_FULL to 409 but omits VOICE_ATTEMPT_ALREADY_ACTIVE.
- Latest production read-only SQL confirms 50 Realtime rows, all private=false, seven partitions; the message trigger still serializes OLD/NEW and sends to a public topic. Three trigger-returning SECURITY DEFINER broadcasts retain search_path=public and effective EXECUTE for anon/authenticated. Nine backend-owned tables still expose broad client grants including TRUNCATE. Production Storage buckets chat-images and profile-images are public, 20 MiB each, with zero storage.objects policies.
- Production project remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions; no upstatus-signal function, signaling schema/rate-limit RPC, or AUTH-03 schema. Laboratory remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, two test functions; signal tables are present and empty. Security Advisor: production 6 WARN / 10 INFO; lab 0 WARN / 17 INFO. Production performance/health advisors have no findings; lab performance has four unused-index INFO findings and health has none.
- Branch protection rechecked through GitHub: master, develop, and team-lite-official all report protected=false; rulesets list is empty.
- Issue #78 remains 0/8 physical acceptance criteria. Issue #79 retains historical 16/35 and requires formal QA reconciliation. The QA branch and docs/RELEASE_READINESS.md remain unmodified.
- No merge, deployment, migration, workflow dispatch, release, userscript publication, secret/role/grant/ACL/policy/flag change, or destructive operation occurred. All Supabase SQL was SELECT-only.

## 2026-11-08 22:12 BRT — generic signaling room capacity

- Latest independent QA audit `docs/audits/2026-11-09-upstatus-qa-audit-0025-utc.md` identified that generic `/room/invite` and `/room/accept` could exceed 32 accepted members under concurrent accepts.
- Draft [PR #109](https://github.com/Reekyi/UpStatus/pull/109), HEAD `94d43feca3ca4632862e24f7cdf5ecc4c4c9ac39`, adds room-first transactional invite/accept RPCs, preserves API response shapes, and maps `ROOM_FULL` to HTTP 409. Exact-head Validate [42544535436](https://github.com/Reekyi/UpStatus/actions/runs/42544279847) SUCCESS; offline capacity contract passed.
- The isolated catalog test migration and concurrent HTTP harness are versioned. The live harness requires the exact allowlisted lab project, explicit mutation opt-in, empty fixture preflight across users, sessions, rooms, members, bindings, events, call attempts, voice attempts, and rate limits, and a `room-capacity-v1` health marker. It was not run because the QA-shared lab runtime remains v32 without that marker. No lab migration/deploy/fixture was performed.
- Remaining QA findings: event replay/idempotency, route-specific invite quotas (thresholds need agreement), database-backed readiness, and Team Lite stack reconciliation. Broader authenticated signaling cutover and public Realtime P0 remain open.
- Production remained read-only. No production migration, SQL write, deploy, release, merge, userscript publication, or security-setting change occurred.
- Checkpoint: [2026-11-09 generic room capacity guard](https://github.com/Reekyi/UpStatus/blob/docs/continuity-handoff-2026-11-04/docs/checkpoints/2026-11-09-generic-room-capacity-guard.md).


## 2026-11-09 — Signal event idempotency

The current engineering checkpoint is [Signal event idempotency and replay protection](checkpoints/2026-11-09-signal-event-idempotency.md). Draft PR #112 is the current-base Normal/server candidate (16 ahead / 0 behind #109) and exact-head Validate passed. Draft PR #111 is the Team Lite adapter/bundle counterpart; its offline guard passed. PR #110 is superseded by #112 and must not be merged. The live harness remains unexecuted because the QA-shared lab runtime is v32 and the candidate migrations/markers are not installed. Production remains unchanged. See the checkpoint for SHAs, workflow links, safeguards and remaining gates.


## 2026-11-09 03:37 UTC — database-backed signaling readiness candidate

- Read the full QA release-readiness blob and latest available audit append before this work. The audit's latest dated section remains 2026-11-08 15:30 BRT; newer engineering coordination is recorded in Issues #79/#82. The QA branch and `docs/RELEASE_READINESS.md` were not edited.
- Draft [PR #113](https://github.com/Reekyi/UpStatus/pull/113) is stacked on Draft #112. Current branch tip `41982e8eb7a9347ce54d2e22cec76eaeb08ac99a`; base #112 HEAD `a7d6950fa0835e2c296318b2f431256f0fca3ab5`; 25 ahead / 0 behind; GitHub reports mergeable. No human review; keep Draft.
- The candidate keeps `GET /health` as liveness and adds `GET /ready` backed by `public.upstatus_signal_readiness()`. The read-only STABLE SECURITY INVOKER RPC checks required tables/RLS/columns, service_role table privileges, and every handler RPC. Handler RPCs must remain VOLATILE SECURITY INVOKER, empty-search_path, service_role-executable, and not executable by anon/authenticated. Public readiness responses expose only generic 200/503.
- Validated code HEAD `bfc6fc2585daaaacaf885ac9001a992fa93acb5f`; PR Validate [42557325620](https://github.com/Reekyi/UpStatus/actions/runs/42557325620) SUCCESS. Logs confirm readiness, room-capacity and idempotency contracts, source parity, Normal build, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`. Current PR tip adds only documentation after that validated code head.
- The exact SQL CTE body from the candidate readiness migration was executed as a standalone SELECT on allowlisted lab `bfpjtfqlnypisxljoxkb`. It returned `ready=false` only for expected missing event-idempotency table/columns and the capacity invite/accept plus idempotent enqueue RPCs. Existing tables, columns, service_role grants, and existing handler RPC security checks passed. No function/migration was applied and no rows/schema were changed.
- Production remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions; no `upstatus-signal` function or signaling schema. Realtime snapshot: 50/50 messages public, one topic, latest row 2026-11-06 19:44:55 UTC. Security Advisor 6 WARN / 10 INFO. Storage buckets `chat-images` and `profile-images` remain public at 20 MiB each. The Supabase managed `main` branch remains MIGRATIONS_FAILED while preview/project are healthy.
- Lab remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, two Edge Functions; `upstatus-signal-test` v32, zero Realtime rows. Capacity, idempotency, and readiness migrations are not applied; the candidate `GET /ready` has not been called against a deployed runtime.
- Current required PR checks: #74 Validate + Smoke PASS; #75 historical baseline Candidate Checks PASS; #76 Candidate Checks PASS; #80 Validate FAIL at inherited `client signed upload helper missing` (`scripts/validate.mjs:55`); #82 Validate FAIL at inherited `production updateURL mismatch` (`scripts/validate.mjs:26`). #109 and #112 Validate PASS; #111 offline Team Lite call-source guard PASS. All remain Draft/unmerged.
- Scope clarification: #109 protects generic signaling call-room `/room/invite` and `/room/accept`; Issue #78's open voice-room rule remains unchanged. `/room/open` stays open membership with no invite/accept flow.
- Issues #78 and #79 remain open; #78 is 0/8 physical criteria; #79 body retains the historical 16/35 checklist. The latest engineering evidence was appended to existing #79 and #82 comments.
- Next: QA-coordinated isolated schema/runtime update, catalog test and live ready/not-ready HTTP probes; run the guarded capacity/replay harness only after QA authorizes a lab window; reconcile Team Lite backend/client stack; continue public Realtime/Storage hardening and physical #78 acceptance.
- No production SQL write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or destructive operation occurred. All production SQL was SELECT-only; the one lab SQL statement was a standalone SELECT of the candidate readiness CTE.


## 2026-11-09 04:08 UTC — database readiness schema-usage guard

- Revalidated the current GitHub PRs #74, #75, #76, #80 and #82, the candidate stack #109-#115, Issues #78/#79, the Project Guide, the current continuity history and the latest QA audit. The full `docs/RELEASE_READINESS.md` blob was requested from the QA branch but the GitHub file-content connector returned an empty body for that oversized file; the latest QA audit file and recent #79/#82 coordination comments were read instead. The QA branch and release-readiness document were not edited.
- Draft [PR #113](https://github.com/Reekyi/UpStatus/pull/113) now has parent HEAD `6a86d5c6b4285fe5cde6e46ffb4a70c070a96c90`; the only post-code change was the Validate pull_request base-branch filter. Its previously validated code HEAD remains `bfc6fc2585daaaacaf885ac9001a992fa93acb5f`, exact-head Validate [42557325620](https://github.com/Reekyi/UpStatus/actions/runs/42557325620) SUCCESS; later exact-head workflow [42559889611](https://github.com/Reekyi/UpStatus/actions/runs/42559889611) also completed SUCCESS on the workflow-only parent update.
- The readiness contract was reviewed against the actual handler and SQL. One missing dependency was identified: service_role table privileges and function EXECUTE were checked, but USAGE on the `public` schema was not. PostgREST schema resolution depends on that privilege. A SELECT-only catalog query confirmed `has_schema_privilege('service_role','public','USAGE')=true` in both production and lab, so this is a defensive readiness guard for future drift, not a current outage.
- Clean replacement [PR #115](https://github.com/Reekyi/UpStatus/pull/115) is stacked on #113. Current head `f7e89e535b523af784bb588c2419a678f28db18b`; comparison 5 ahead / 1 behind after the parent workflow update; GitHub reports mergeable=true. Exact-head PR Validate [42559930958](https://github.com/Reekyi/UpStatus/actions/runs/42559930958) SUCCESS. Logs confirm readiness, room-capacity, event-idempotency, source parity, Normal build, chat regression, Team Lite updater and full Validate. Supabase Preview was skipped because automatic preview branches are disabled.
- [PR #114](https://github.com/Reekyi/UpStatus/pull/114) is the first attempt and is explicitly marked superseded/non-mergeable; do not integrate it. #115 is the only active schema-usage guard candidate.
- Migration `20261109040000_signal_database_readiness.sql` now reports missing `service_role` USAGE on `public`; its isolated catalog test and offline contract assert the same. No migration was applied.
- Production remains ACTIVE_HEALTHY with 7 migrations, 38 Edge Functions and no `upstatus-signal` function or signaling schema. The read-only catalog still shows the public Realtime trigger topic with 50 rows (8 `db_change`, 42 `user_status`, all `private=false`), nine backend-owned tables with excessive client grants including TRUNCATE, broad default ACLs, two public Storage buckets, and Security Advisor 6 WARN / 10 INFO.
- Lab remains ACTIVE_HEALTHY with 38 migrations and `upstatus-signal-test` v32. The current service_role schema usage is true, but the capacity/idempotency/readiness candidate migrations are not installed and the live `GET /ready` probe has not been executed. The lab remains QA-shared; no migration, deploy or fixture test was run.
- #80 still fails the inherited develop validator `client signed upload helper missing` at `scripts/validate.mjs:55`; #82 still fails the inherited master validator `production updateURL mismatch` at line 26. No validator was weakened. #78 remains 0/8 physical criteria; #79 retains the historical 16/35 checklist.
- Next: QA-coordinated migration/runtime validation in the isolated lab, including live `/ready` 200/503 probes and the guarded room-capacity/replay harness; then reconcile Team Lite and continue RT-01 public Realtime cutover planning.
- No production SQL write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change or destructive operation occurred. Production and lab SQL in this run were SELECT-only.


## Readiness integrity v2 — 2026-11-09 05:11 UTC

- Consolidated candidate: [PR #117](https://github.com/Reekyi/UpStatus/pull/117), branch `fix/normal-signal-readiness-integrity-20261109-v2`, code HEAD `206e19df0d9c896b22e50eb16864a4ba80be9f16`. The latest branch commit `4889111a6f1e59015785792f53e3132141044227` only updates this checkpoint.
- PR #117 is Draft, mergeable, 18 commits ahead / 0 behind its #113 base. Push Validate [42565786660](https://github.com/Reekyi/UpStatus/actions/runs/42565786660) and PR Validate [42565813869](https://github.com/Reekyi/UpStatus/actions/runs/42565813869) passed on the exact code HEAD. Logs confirm migration layout, source parity, room-capacity, idempotency, readiness integrity, signed-upload, chat, Team Lite updater checks, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`. Supabase Preview was skipped because preview branches are disabled.
- The readiness contract is now `signal-v2`: required primary/unique constraints, foreign-key targets/delete actions, and exact valid/ready indexes are checked. `GET /ready` uses a five-second per-warm-isolate single-flight cache and emits `X-UpStatus-Signal-Readiness: database-v2` only on HTTP 200. This is not a global rate limiter.
- The capacity/replay harness now requires the database-v2 marker before fixture creation. Cleanup attempts every FK-safe DELETE and runs all postflight empty checks even after individual failures.
- Read-only SQL preflight: the candidate readiness-function body executed as SELECT against isolated lab `bfpjtfqlnypisxljoxkb`. It returned `ready=false` only for expected missing idempotency ledger table/columns/PK/FKs and capacity/idempotent-enqueue RPCs. Existing session/user keys, signaling constraints and required existing indexes passed.
- No migration was applied, no function was deployed, and no fixtures were created. The shared lab remains on signal-test v32 without the database-v2 marker; the HTTP harness must refuse writes there.
- PRs #115 and #116 are superseded and remain open Draft for history. Do not merge either. #117 is the consolidated candidate.
- Still open: fresh-key SDP/ICE replay rejection and retry-key persistence at call sites; Team Lite backend/client reconciliation; invite quota thresholds; authenticated cutover; public Realtime/Storage hardening; AUTH-03/AUTH-02; full-product TEST; and all eight physical #78 acceptance checks.


## 2026-11-09 06:32 UTC — Normal signaling Retry-After enforcement

- Re-read `docs/PROJECT_GUIDE.md`, `UPSTATUS_HANDOFF.md`, the current-state history, the QA release-readiness checkpoint blob, and the latest QA audit `docs/audits/2026-11-09-upstatus-qa-audit-0530-utc.md`. QA branch and `docs/RELEASE_READINESS.md` were not edited.
- Re-fetched PRs #74, #75, #76, #80, #82, #117, #118, #119 and Issues #78/#79. PRs remain open and Draft. Required baseline checks: #74 Validate/Smoke PASS (42451736696/42451736729); #75 Candidate Checks PASS (41674353127, historical baseline); #76 Candidate Checks PASS (42450476433). #80 Validate [42566007621](https://github.com/Reekyi/UpStatus/actions/runs/42566007621) still fails the inherited `client signed upload helper missing` assertion at `scripts/validate.mjs:55`; #82 Validate [42568413663](https://github.com/Reekyi/UpStatus/actions/runs/42568413663) still fails the inherited `production updateURL mismatch` at line 26. No validator was weakened.
- Reviewed Draft #118 retry-key cache. Found a correctness gap: after a long `Retry-After`, it retained the original key/body but did not enforce the not-before time on a later caller invocation. A caller could issue another HTTP request too early.
- Added Draft [PR #119](https://github.com/Reekyi/UpStatus/pull/119), branch `fix/normal-signal-retry-after-guard-20261109`, based on #118 branch `feat/normal-signal-retry-key-cache-20261109`. HEAD `cf5f2bbc3b06d29d4d465f0cbd9cc440e2656704`. The cache now stores `retryAfterAt`; premature retries fail locally with `SIGNAL_RETRY_DEFERRED` (HTTP 429, remaining delay, original idempotency key), then reuse the exact original request body/key once the deadline passes. A 429 without a valid header uses the configured base delay.
- Added a fake-clock regression proving the premature caller retry produces no second HTTP request, then the same key/body is replayed after the deadline. Static contract and checkpoint updated. Candidate branch is included in push/PR Validate filters.
- Exact-head CI: Push Validate [42573405307](https://github.com/Reekyi/UpStatus/actions/runs/42573405307) SUCCESS and PR Validate [42573431385](https://github.com/Reekyi/UpStatus/actions/runs/42573431385) SUCCESS on #119 HEAD `cf5f2bb`; logs show five Retry-After enforcement assertions and `Validation OK: PROD 3.4.7 / TEST 3.4.7`. Parent #118 workflow-filter update HEAD `7c36c5cff5444248faa0fbf8cd37cf21aadbcea6` passed Validate [42573167602](https://github.com/Reekyi/UpStatus/actions/runs/42573167602).
- Scope remains Normal-only. Team Lite still requires a separately reviewed port; cache is in-memory per transport instance and does not survive reload/recreation; fresh-key SDP/ICE anti-replay remains a distinct server-protocol gate. No browser/WebRTC test was performed.
- Supabase read-only snapshot: production `dlfvkawaiqduhlazsszm` ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 ACTIVE Edge Functions; no signaling schema/ledger or `upstatus-signal` function. Laboratory `bfpjtfqlnypisxljoxkb` ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, `upstatus-signal-test` v32 and E2E v3; capacity/idempotency/readiness candidate migrations remain unapplied and the idempotency ledger table is absent. Supabase managed branch `main` remains `MIGRATIONS_FAILED`.
- Production SELECT-only catalog snapshot: 50/50 `realtime.messages` rows are public in one topic; 10 public RLS tables, zero policies, 18 anon/authenticated TRUNCATE grants, 24 default ACL rows. Security Advisor observed 6 WARN / 10 INFO; Performance and Health no findings. No change was made.
- Issue #78 remains 0/8 physical acceptance; Issue #79 retains the historical 16/35 checklist. RT-01 public Realtime, authenticated cutover, Team Lite reconciliation, live lab HTTP tests, AUTH-03/AUTH-02, grants/default ACLs, Storage, human reviews and physical browser acceptance remain open.
- No Supabase DDL/DML, migration, fixture mutation, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change or destructive operation occurred. All SQL in this run was SELECT-only.


## 2026-11-09 07:12 UTC — explicit retry-key lookup and Team Lite parity

- Re-read `docs/PROJECT_GUIDE.md`, `UPSTATUS_HANDOFF.md`, the full `docs/RELEASE_READINESS.md` blob from the independent QA branch, the latest QA audit `docs/audits/2026-11-09-upstatus-qa-audit-0627-utc.md`, and this continuity file before editing. The QA branch and release-readiness document were not modified.
- Re-fetched PRs #74, #75, #76, #80, #82, #111, #117–#121 and Issues #78/#79. PRs remain open/Draft/unmerged. #74 exact HEAD `9c0133e8` Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) and Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS. #75 baseline Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS (historical baseline). #76 exact HEAD `eb28e883` Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS.
- #80 exact HEAD before this documentation append was `ea3bdfc1596c650d8579507e7cc6e346830490ed`; Validate [42573533195](https://github.com/Reekyi/UpStatus/actions/runs/42573533195) still fails the inherited `client signed upload helper missing` assertion at `scripts/validate.mjs:55`. #82 exact HEAD `c633d5b3b2f078bacdc87b2ebae95039ae3aa1fe`; Validate [42573817979](https://github.com/Reekyi/UpStatus/actions/runs/42573817979) still fails the inherited `production updateURL mismatch` at `scripts/validate.mjs:26`. Logs were inspected; no validator was weakened.
- QA's 0627 UTC audit found a P2 defect in #118: an implicit first send cached under an identity without an explicit key could not be found when the caller retried using the exposed `error.idempotencyKey`. Added Draft [PR #120](https://github.com/Reekyi/UpStatus/pull/120), branch `fix/normal-signal-explicit-retry-key-lookup-20261109`, HEAD `086bc543e33f4c0a416b0453b5714f60d9e3f894`, stacked on exact #119 HEAD `cf5f2bbc3b06d29d4d465f0cbd9cc440e2656704`. It looks up the implicit pending entry only when its cached key exactly matches the supplied explicit key, replays the original body, and preserves mismatched explicit keys as distinct operations.
- PR #120 exact-head PR Validate [42577115565](https://github.com/Reekyi/UpStatus/actions/runs/42577115565) SUCCESS. Job logs show the six-assertion implicit→explicit retry/mismatched-key regression, existing retry-cache/Retry-After tests, idempotency contract, source parity, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`. No local checkout was available for an independent local run.
- Ported the complete bounded retry cache, Retry-After not-before enforcement, and explicit-key lookup correction into Team Lite's shared adapter and embedded userscript in Draft [PR #121](https://github.com/Reekyi/UpStatus/pull/121), branch `fix/team-lite-signal-retry-cache-20261109`. Current HEAD `59caf9f9c635af87cfde5b0301272d250fb504b4`; exact-head offline Team Lite Authenticated Call Source Guard [42577749069](https://github.com/Reekyi/UpStatus/actions/runs/42577749069) SUCCESS. Job [129029185793](https://github.com/Reekyi/UpStatus/actions/runs/42577749069) confirms shared transport retry tests, six explicit-key assertions, Retry-After/cache tests, authenticated call-source boundary, Team Lite candidate contracts, and existing voice-room recovery/leave/logout offline tests. This is not the fixture-mutating full Candidate Checks and not a live browser/WebRTC test.
- To make the stacked PR's workflow trigger, the parent #111 branch received workflow-filter commit `948d2b70d70fd5cd697b6534e81b2bef2c0b256a`, adding its own branch to the `pull_request.branches` filter. #111 is now 6 commits ahead / 1 behind its base and GitHub reports `mergeable=false`; do not merge. #121 remains Draft, GitHub reports `mergeable=true`, and compare against the current parent branch is 7 ahead / 1 behind because it was created before the parent workflow-filter commit. Its exact-head offline guard passed; branch ancestry still needs a deliberate rebase/reconciliation review before integration.
- Branch governance rechecked: `master`, `develop`, and `team-lite-official` all report `protected=false`; repository rulesets are empty. #78 remains OPEN, 0/8 physical acceptance criteria; #79 remains OPEN, historical checklist 16/35. These counts are not a release percentage.
- Supabase read-only snapshot: production `dlfvkawaiqduhlazsszm` ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions; `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281, beta10 v6; no server-mediated `upstatus-signal`. Lab `bfpjtfqlnypisxljoxkb` ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, `upstatus-signal-test` v32 and E2E v3. The idempotency ledger, candidate capacity/readiness RPCs, and `database-v2` marker remain absent; no HTTP harness was run.
- Production SELECT-only catalog: 50/50 `realtime.messages` rows public in one topic; 10 RLS-enabled public tables without policies; 9 tables with effective anon TRUNCATE and 9 with authenticated TRUNCATE; two public Storage buckets with zero `storage.objects` policies; 24 default ACL entries. Security Advisor 6 WARN / 10 INFO; Performance and Health no findings. Lab: 0 Realtime rows, 17 public RLS/no-policy tables, no Storage buckets; Security 0 WARN / 17 INFO, Performance 4 unused-index INFO, Health none. Managed Supabase branch `main` remains `MIGRATIONS_FAILED` with preview `ACTIVE_HEALTHY`; root cause unproven.
- No migration, SQL write, fixture mutation, deployment, workflow dispatch, secret/role/grant/ACL/policy/flag change, merge, release, or userscript publication occurred. All Supabase SQL was SELECT/catalog-only. No QA branch or QA document was edited.
- Next: QA review #120/#121; validate Team Lite/Normal parity and decide whether stable call-site operation IDs are needed; keep fresh-key SDP/ICE anti-replay as a separate server protocol gate; obtain an explicit QA-authorized lab window before applying candidate migrations or creating fixtures; continue RT-01, AUTH-03/AUTH-02, Storage/ACL, Team Lite deploy workflow, branch protection, and physical #78 gates. Do not release.

## 2026-11-09 07:16 UTC — read-only signaling operation-identity review

- Compared Normal template `src/userscript/upstatus.user.template.js` at `8bbfa13336d9bfe02e492361e62aabf31ba13b8b` with Team Lite bundle `team-lite/upstatus-team-lite.user.js` at `175a4e5cd1c9528cb2dedd395683b44d5b753d40`. Both have matching high-level `voiceRoomSend`, `screenShareSend`, `callSendTo`, and `callSendAll` paths; no call site currently passes `operationId`.
- The voice-room presence heartbeat is sent every 4 seconds. Its payload has a stable room/session/state identity and changing `at`; call-presence also changes `updatedAt`. The adapter intentionally excludes only nested `payload.at` and `payload.updatedAt` from its local retry identity while preserving the original request body for replay.
- Reviewed server `enqueue_upstatus_signal_events` in `20261109030000_signal_event_idempotency.sql`: the ledger uses `ON CONFLICT (room_id, sender, idempotency_key) DO NOTHING`; a matching request hash returns `duplicate=true` without inserting another event. This is the expected lost-response behavior. If the original event committed, the duplicate confirms it and the adapter clears the pending cache; the next 4-second heartbeat gets a fresh key. If the original never committed, the retry inserts the original heartbeat and the next interval refreshes it.
- Do not blanket-add a unique operation ID to every heartbeat. With the 2h5m / 256-entry fail-closed cache, a new unique ID every 4 seconds during a sustained outage could accumulate up to 256 pending heartbeat entries in about 17 minutes and block later implicit sends, including terminal leave signals. This needs an explicit supersession/priority policy before call-site IDs are introduced.
- SDP/answer/ICE call sites already carry call/session/peer/connection identifiers and unique SDP/candidate payloads; the current payload fallback distinguishes most of these. A stable `negotiationId`/candidate operation ID may still be useful for repeated identical negotiation messages, but no collision was reproduced in this read-only inspection. Define per-event semantics and retry ownership before changing the call sites.
- No code or QA source was changed for this review. This is a design/risk note, not proof of live WebRTC behavior. Browser/network tests and server-verifiable fresh-key anti-replay remain separate gates.

## 2026-11-09 07:20 UTC — consolidated Team Lite retry-cache candidate

- Re-read `docs/PROJECT_GUIDE.md`, `UPSTATUS_HANDOFF.md`, `docs/RELEASE_READINESS.md` from the QA branch, latest QA audit `2026-11-09-upstatus-qa-audit-0627-utc.md`, and current continuity history before this update.
- Normal explicit-key retry fix remains Draft [PR #120](https://github.com/Reekyi/UpStatus/pull/120), exact HEAD `086bc543e33f4c0a416b0453b5714f60d9e3f894`, 5 ahead / 0 behind, mergeable. Exact-head PR Validate [42577115565](https://github.com/Reekyi/UpStatus/actions/runs/42577115565) SUCCESS; six assertions cover implicit→explicit retry via `error.idempotencyKey`, exact original-body replay despite refreshed timestamps, and mismatched-key isolation.
- Initial Team Lite stack: #111 parent HEAD `948d2b70d70fd5cd697b6534e81b2bef2c0b256a` became 6 ahead / 1 behind and `mergeable_state=dirty` because the base branch independently changed the same workflow-filter file. Child #121 HEAD `59caf9f9c635af87cfde5b0301272d250fb504b4` passed offline guard [42577749069](https://github.com/Reekyi/UpStatus/actions/runs/42577749069) but was 7 ahead / 1 behind its moved parent. Both historical PRs remain open/Draft and their descriptions mark them superseded; do not merge either.
- Created clean consolidated Draft [PR #122](https://github.com/Reekyi/UpStatus/pull/122), branch `fix/team-lite-signal-retry-cache-20261109-consolidated`, directly from base `fix/team-lite-authenticated-call-source-guard-20261108` HEAD `de2c6a92154ece2f8a313d2bafedf02170bb5f5a`. Exact HEAD `ad9638eb8a8e2b89ee7fd5e27ab158cef12f7f6f`; compare 6 ahead / 0 behind; GitHub reports mergeable=true. Six intended files: shared adapter, embedded Team Lite bundle, shared transport tests, Team Lite candidate contract, offline workflow filter, checkpoint.
- PR #122 exact-head offline Team Lite Authenticated Call Source Guard [42578565781](https://github.com/Reekyi/UpStatus/actions/runs/42578565781) SUCCESS. Job [129031707296](https://github.com/Reekyi/UpStatus/actions/runs/42578565781) confirms shared adapter tests, transient retry/key reuse, explicit-key lookup/mismatched-key isolation, operation identity, permanent-error handling, in-flight coalescing, TTL, Retry-After deferral, cache capacity, broadcast retention, authenticated call-source boundary, Team Lite candidate contracts, updater scenarios, and existing offline voice leave/recovery/logout tests. No full fixture-mutating Candidate Checks or live HTTP/browser/WebRTC run.
- Team Lite candidate retains version 3.4.31 and the authenticated-signaling flag default-disabled. It is not published. Cache remains in-memory per transport instance; no durable retry across reload, no stable call-site operation IDs, and no fresh-key server anti-replay.
- Read-only operation-identity review: Normal template SHA `8bbfa13336d9bfe02e492361e62aabf31ba13b8b` and Team Lite bundle SHA `175a4e5cd1c9528cb2dedd395683b44d5b753d40` show the same high-level send paths. Voice-room presence is sent every 4 seconds. Server `enqueue_upstatus_signal_events` uses `ON CONFLICT DO NOTHING` and returns `duplicate=true` for the same key/hash. The adapter's omission of nested `at`/`updatedAt` allows a lost-response retry to reuse the original heartbeat; a later successful duplicate clears the cache and the next 4-second heartbeat receives a new key. Do not add a unique operation ID to every heartbeat without a supersession/priority policy, because 256 pending entries could accumulate in about 17 minutes during sustained outage and block terminal leave. Stable SDP/ICE negotiation IDs remain a design item; no collision was reproduced.
- Required PR snapshot: #74 Validate/Smoke PASS on its current HEAD; #75 baseline Candidate Checks PASS (historical); #76 Candidate Checks PASS on its current HEAD. #80 remains open/Draft; latest Validate on documentation checkpoint HEAD `eb8196e510172412dc815ef3c1c0df6feff2e652` also fails inherited `client signed upload helper missing` at `scripts/validate.mjs:55` (run [42578756577](https://github.com/Reekyi/UpStatus/actions/runs/42578756577)). The job log confirms the same assertion; this is not a new code regression and no validator was weakened. #82 remains open/Draft; Validate [42573817979](https://github.com/Reekyi/UpStatus/actions/runs/42573817979) fails inherited `production updateURL mismatch` at line 26. No validator was weakened.
- Issues: #78 remains OPEN, 0/8 physical acceptance; #79 remains OPEN, historical 16/35 checklist. These are checklist counts, not a release percentage. QA branch and QA audit document were not edited; coordination was added to #79 and PR #82.
- Supabase read-only snapshot at 07:15 UTC: production `dlfvkawaiqduhlazsszm` ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 ACTIVE Edge Functions (all `verify_jwt=false`; main `upstatus` v480, Team Lite v15, TEST v281, beta10 v6); no `upstatus-signal`, idempotency ledger or candidate signal RPCs. Lab `bfpjtfqlnypisxljoxkb` ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, `upstatus-signal-test` v32 and E2E v3; 0 Realtime rows, 17 public tables with RLS/no policies, 0 Storage buckets, no idempotency ledger or candidate signal RPCs.
- Production SELECT-only catalog: 50/50 Realtime rows public in one topic; 10 public RLS tables without policies; 9 tables with effective anon TRUNCATE and 9 with authenticated TRUNCATE; two public Storage buckets with zero `storage.objects` policies; 24 default ACL entries. Security Advisor 6 WARN / 10 INFO; Performance/Health no findings. Lab Security 0 WARN / 17 INFO; Performance 4 unused-index INFO; Health no findings. Managed production branch `main` remains `MIGRATIONS_FAILED` with preview `ACTIVE_HEALTHY`; cause unproven.
- No Supabase DDL/DML, migration, fixture mutation, function deployment, workflow dispatch, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication or destructive operation occurred. All SQL was SELECT/catalog-only.
- Next: QA review #120/#122; reconcile #111/#121 history without merging; agree per-event operation-ID/retry ownership before call-site changes; obtain an explicit QA-authorized lab window for candidate migrations and real HTTP readiness/capacity/replay tests; continue RT-01, AUTH-03/AUTH-02, Storage/ACL, branch protection, Team Lite deploy workflow and physical #78 gates. Do not release.

## Engineering checkpoint — 2026-11-09 09:39 UTC

### Signed Storage upload candidate on develop

- Draft [PR #124](https://github.com/Reekyi/UpStatus/pull/124), branch `fix/develop-signed-upload-client-20261109`, targets `develop` at base SHA `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- Current HEAD: `77c9d4c3b525325996db973cbec609ae2ddb0d83`; six commits ahead, zero behind; GitHub reports mergeable.
- Exact-head Validate [42594697302](https://github.com/Reekyi/UpStatus/actions/runs/42594697302) SUCCESS. The new offline client and server suites both pass.
- The candidate ports direct signed uploads for the existing chat image/video and profile-avatar flows, hardens server-side upload URL/path/token checks, and preserves the legacy avatar data-URL fallback for installed clients.
- The previous develop validator incorrectly expected the signed-upload token as `Authorization: Bearer`. Supabase's signed upload token is carried in the URL query; the Storage SDK uses PUT. The validator now checks the query-token contract, omitted browser credentials, and redirect rejection. This corrects the contract rather than removing a security assertion.
- Initial run [42594529303](https://github.com/Reekyi/UpStatus/actions/runs/42594529303) failed at a stale static assertion expecting the old `if(p.dataUrl)` code shape. The fallback remained in the hardened route; the assertion was changed to verify the actual fallback call, and the server harness exercises it. Final exact-head run passes.
- Scope limitation: the client UI remains image/video only; document-message rendering is not introduced. Signed upload does not make the existing public-read Storage buckets private. No live Storage upload was performed.

### Required PR and release-gate snapshot

- #74 Normal HEAD `9c0133e8cf6bd85ac8993888718a408db2f24a3e`: Validate and signaling smoke runs 42451736696 / 42451736729 SUCCESS.
- #75 Team Lite baseline HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`: candidate run 41674353127 SUCCESS.
- #76 Team Lite HEAD `eb28e88325d7e8a6236d9050bebabf794d64a8c4`: candidate run 42450476433 SUCCESS.
- #80 continuity remains Draft and its current head `80f8f0522ff8371023c4293c231fd9abf16a22ea` still fails run 42578857554 at `client signed upload helper missing`. PR #124 fixes that source/contract on a separate candidate branch but is not merged; #80's old-head failure is not yet cleared.
- #82 QA remains Draft and its current head `40809927be9eeda798e55d618a904752e351d7f6` still fails run 42582875001 at `production updateURL mismatch`. The root mismatch is the master build's hard-coded beta10 update URL versus the production release manifest. Draft PR #85, head `b75707b6eaf678d87863144748b9aed8e2866455`, changes the build to use the release manifest URL and has Validate run 42475230911 SUCCESS; it remains unmerged.
- Draft [PR #123](https://github.com/Reekyi/UpStatus/pull/123), Team Lite production deploy guard, head `b8cd8e15a983b00fd5b1eaca0ffecfd18b9b0d99`, has guard run 42589119358 SUCCESS. It targets only `upstatus-team-lite`, is manual-only, and checks exact branch/ref, project/organization, release version and applied migration history. This is an offline guard test, not a deployment.
- PR #123's required Team Lite migrations are absent from production. The production migration history remains seven entries through `20261027155438`; the guard must refuse deployment. No workflow_dispatch or deployment was performed.

### Fresh Supabase read-only snapshot

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations; 38/38 Edge Functions ACTIVE and platform `verify_jwt=false`. Primary versions: Normal v480 SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, Team Lite v15 SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, TEST v281 SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`. No production `upstatus-signal`.
- Laboratory `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations; `upstatus-signal-test` v32 SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`, E2E v3 SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`. The candidate idempotency ledger and readiness-v2 RPC are still absent.
- Production read-only catalog/Advisor snapshot: 50 Realtime rows, all `private=false`; ten public tables with RLS and no policies; nine tables with effective TRUNCATE for anon and nine for authenticated; 24 default ACL entries; two public Storage buckets and zero `storage.objects` policies; Security Advisor 6 WARN / 10 INFO. Lab Security Advisor 0 WARN / 17 INFO.
- All 38 production functions have `verify_jwt=false`. A sample of the four main handlers shows custom token/session checks, but this is not a route-by-route audit of all 38 functions.
- The deployed Normal v480 and Team Lite v15 sources still expose the legacy first-setup route without the candidate setup-invite token requirement. Current production has five users and zero missing password hashes, but future unconfigured accounts remain a P1 risk until AUTH-03 migrations and both backend cutovers are authorized and verified.
- Production managed branch `main` remains `MIGRATIONS_FAILED`; preview remains ACTIVE_HEALTHY and the failure cause is unproven.

### Limitations and next gates

- `docs/RELEASE_READINESS.md` still returns an empty content payload through the GitHub file connector, so the latest QA audit and Issue #79 release checklist were used as the readable release-readiness evidence. Do not claim the full file was read.
- Branch-protection/ruleset settings could not be revalidated through the available GitHub connector actions in this run; treat them as unverified rather than assuming the historical zero-ruleset snapshot is current.
- Next: QA review #124 and #123; authorize a separate lab window before any migration/runtime mutation; prove real signed Storage upload in the isolated lab; prove readiness HTTP 200/503, capacity and replay; resolve AUTH-03/P1 first-setup, RT-01 broadcasts/ACL/Storage, and the physical #78 gates.
- No Supabase DDL/DML, migration, fixture mutation, Edge Function deploy, workflow dispatch, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication or destructive operation occurred. Supabase calls in this run were project/function/migration/Advisor reads and SELECT/catalog queries only. All PRs remain Draft and unmerged.


## 2026-11-09 10:02 UTC — Team Lite default-branch production dispatcher

- Opened Draft [PR #125](https://github.com/Reekyi/UpStatus/pull/125), branch `fix/team-lite-production-dispatcher-master-20261109`, based on master `9d40461babcec8eb8686c2a04be9c675df7da381`. Final branch HEAD `3ce29ccee0473cd5e36ca754d5190a4505f733d1`; code HEAD `6c67bfe2ba6751b81fe160189f3683e8091a54b6` is followed only by a documentation commit.
- Finding: PR #123's manual Team Lite workflow is on a non-default candidate branch. Master is the default branch and currently has only the Normal `deploy-production.yml`; the Team Lite workflow path is absent from master. GitHub's default-branch workflow_dispatch requirement means #123's file cannot yet be the usable dispatch entry point.
- #125 adds a separate `deploy-team-lite-production.yml` on master without modifying the Normal workflow. Deployment is manual-only from master, requires the exact current `team-lite-official` SHA, a merged PR whose merge commit equals that SHA, a latest non-dismissed human APPROVED review from a non-author, complete successful/skipped PR-head check runs, exact release version, and explicit confirmation defaulting false. Incomplete review/check pagination fails closed.
- It checks out the exact SHA, validates/builds the Team Lite candidate, performs read-only project/migration preflights, pins Supabase CLI 2.122.1, and contains exactly one deploy target: `upstatus-team-lite`. It never applies migrations.
- Exact code-head offline guard [42597677555](https://github.com/Reekyi/UpStatus/actions/runs/42597677555) succeeded; deploy job was skipped. An intermediate test-only assertion failure [42597592272](https://github.com/Reekyi/UpStatus/actions/runs/42597592272) was fixed; do not use it as final evidence.
- Fresh GitHub API reads confirm `master`, `develop`, and `team-lite-official` are all `protected=false`; repository rulesets count is zero. #125's provenance checks are a compensating gate, not a replacement for owner-approved branch protection.
- Fresh production SQL SELECT: seven migrations through `20261027155438`; no `setup_token_hash` column, no `consume_upstatus_setup_invite` RPC, and no `merge_chat_read_receipts` RPC. Aggregate check found zero current accounts without password hashes or roles. Lab has the setup-token column and both RPCs. No writes were performed.
- Production deploy preflight remains blocked because the four Team Lite migrations required by #123 are absent. Current `team-lite-official` HEAD `9065bc1536fde64f437f6f12b7abb9b072cb8281` does not yet contain the helper scripts from #123; the dispatcher fails closed until the reviewed candidate stack is integrated.
- #80 latest HEAD `247b7a31a70e8f07ed2bb149bd650d54654c32e8`, Validate [42595116112](https://github.com/Reekyi/UpStatus/actions/runs/42595116112) still fails inherited `client signed upload helper missing` at `scripts/validate.mjs:55`. #82 latest QA HEAD `44d842043dcbb05f83335837aec80e2ed9c4682e`, Validate [42596403077](https://github.com/Reekyi/UpStatus/actions/runs/42596403077) still fails inherited `production updateURL mismatch` at line 26. QA branch and audit files were not modified.
- Issue #78 remains 0/8 physical checks; Issue #79 remains 16/35 historical checklist items, not a release percentage. `docs/RELEASE_READINESS.md` still returned an empty connector payload; the latest readable QA audit and Issue #79 were used instead.
- No production or lab mutation, migration, fixture, deploy, workflow_dispatch, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication, or destructive operation occurred.


## 2026-11-09 10:09 UTC — Team Lite deploy preflight completeness (QA P2)

- Read the latest independent audit `docs/audits/2026-11-09-upstatus-qa-audit-0943-utc.md` on the dedicated QA branch. It identifies that #123's deploy guard did not check managed Supabase `main` status or reconcile every remotely applied migration with a local source file.
- Fresh Supabase `list_branches` for production shows default managed branch `main`, Git branch `master`, status `MIGRATIONS_FAILED`, preview status `ACTIVE_HEALTHY`. The project itself is ACTIVE_HEALTHY, so project health alone is insufficient.
- Fresh production migration history remains seven versions through `20261027155438`. Four already-applied files are absent from the #123 candidate branch (confirmed by 404 for each): `20261023154754_create_upstatus_visual_config.sql`, `20261026195855_add_chat_message_file_name.sql`, `20261027154329_allow_chat_document_mime_types.sql`, `20261027155438_set_upstatus_upload_limits_20mb.sql`. Do not reconstruct their SQL from schema state.
- Draft child [PR #126](https://github.com/Reekyi/UpStatus/pull/126), based on #123, adds a read-only managed-main branch health check and complete remote/local migration filename reconciliation. It allows candidate-only unapplied local migrations but fails on missing/mismatched applied remote files. It adds mocked tests for healthy/MIGRATIONS_FAILED branch states, wrong/missing/duplicate main, complete/missing/mismatched/duplicate migration files.
- Exact code-head focused offline workflow [42598515834](https://github.com/Reekyi/UpStatus/actions/runs/42598515834) SUCCESS on `68c48bfe22cbbf434f214367b4b1ade48e3bb29c`; job `129096956203` passed syntax, mocked project/migration tests and migration-layout checks. The later branch commit `048f74c7987c02225260605480a535c3808ebcfa` adds only the checkpoint document.
- Draft [PR #125](https://github.com/Reekyi/UpStatus/pull/125) was updated to require both new preflight helper markers after checking out the Team Lite release SHA. Exact code-head offline guard [42598649482](https://github.com/Reekyi/UpStatus/actions/runs/42598649482) SUCCESS on `35c9122d5a07a0890c1fafda86cadd3a842f96b1`; deploy job SKIPPED. #125 now fails closed if #123 is integrated without #126.
- The full `UpStatus Validate` on intermediate #126 code HEAD `872729459192c312956f94664c34a2583f7c6167` failed at `scripts/validate.mjs:26` with the inherited `production updateURL mismatch`; the focused preflight workflow on final code HEAD passed. This remains the separate #82/master build-manifest blocker.
- PR #126 is 6 commits ahead / 0 behind #123 and mergeable; #123 remains 13 commits ahead / 0 behind #76 and Draft. Neither was merged. PR #125 is Draft and mergeable.
- Latest #80 documentation update HEAD `b4fc9f2ddb23525db9a764f2c7a404dc6b4f4767` triggered Validate [42597941043](https://github.com/Reekyi/UpStatus/actions/runs/42597941043), which again failed at `scripts/validate.mjs:55` with inherited `client signed upload helper missing`. #82 branch HEAD `fc3cb65ee639d6246537c4fa945338a6869e4c87` is a documentation-only child of `44d842043dcbb05f83335837aec80e2ed9c4682e`; the latest Validate [42596403077](https://github.com/Reekyi/UpStatus/actions/runs/42596403077) on that parent failed at line 26 with `production updateURL mismatch`. QA branch and audit files were not edited.
- Branch protection was rechecked via GitHub API: master, develop and team-lite-official are `protected=false`; repository rulesets endpoint returned zero rulesets. #125's explicit merged-PR approval/check-run gate is compensating validation, not a replacement for owner-approved branch protection.
- No production or lab writes, migrations, fixtures, deployments, workflow dispatches, secret/role/grant/ACL/policy/flag changes, merges, releases, userscript publication or destructive operations occurred.


## 2026-11-09 12:13 UTC — migration-content and release-review provenance follow-up

- Read the latest independent QA audit on `qa/release-readiness-2026-11-04-master`, including its 11:34 UTC findings and 11:40 UTC exact-head CI revalidation. QA branch and audit files were not modified.
- QA identified two P2 gaps: #125 accepted review state without proving a human allowlisted reviewer approved the exact current PR head; #126 reconciled remote migration names to local filenames but did not detect SQL content changes retaining the same filename.
- Draft child [PR #128](https://github.com/Reekyi/UpStatus/pull/128), based on #125, adds `verify-team-lite-release-review.mjs`. It requires GitHub `user.type=User`, an explicit `UPSTATUS_RELEASE_REVIEWERS` repository-variable allowlist, reviewer != PR author, review `commit_id` equal to the exact current PR head, and latest relevant current-head review state APPROVED. Bot, unauthorized, author, stale-head, later CHANGES_REQUESTED/DISMISSED, malformed timestamps, and empty allowlist are rejected. Focused offline PR workflow [42614800302](https://github.com/Reekyi/UpStatus/actions/runs/42614800302) SUCCESS on HEAD `cb38853c4ac79932159715c8eafa8287fc884cb1`. The owner must configure the repository variable; no variable or environment reviewer was changed. Environment protection remains unverified.
- Draft child [PR #127](https://github.com/Reekyi/UpStatus/pull/127), based on #126, adds `supabase/migrations/provenance.json` and computes canonical Git blob SHA-1 from local UTF-8 migration contents. Every remotely applied migration must match manifest version/name/filename/blob ID and have source ref/commit metadata. The three original migration files present in the reviewed master tree were verified against GitHub blob IDs `636b255c6ba10fdade072183ce24dc5fdb8f4fac`, `4ce397d8679fbd0e3549a3ceeb0fe9a5f0f26e55`, and `b29dac0c083d1054b08684cb4e22279d30fe44bd`, anchored to master commit `9d40461babcec8eb8686c2a04be9c675df7da381`.
- The four remote production migrations still absent locally are intentionally absent from the manifest: `20261023154754_create_upstatus_visual_config.sql`, `20261026195855_add_chat_message_file_name.sql`, `20261027154329_allow_chat_document_mime_types.sql`, and `20261027155438_set_upstatus_upload_limits_20mb.sql`. Do not reconstruct them from current schema. #127 must remain blocked for production until original reviewed SQL sources and provenance are recovered.
- Final #127 focused offline workflows [42615124790 push](https://github.com/Reekyi/UpStatus/actions/runs/42615124790) and [42615130073 PR](https://github.com/Reekyi/UpStatus/actions/runs/42615130073) SUCCESS on exact HEAD `4ddd703287d8b17f29e3b28880cf0b1ef533f5fb`. Intermediate test failures were fixed; do not use those intermediate runs as final evidence. #127 remains Draft, 6 commits ahead / 0 behind #126, mergeable.
- #128 remains Draft, 5 commits ahead / 0 behind #125, mergeable. Its focused workflow passed; this is not a full repository Validate or a production deployment approval.
- Fresh Supabase read-only inventory: production `dlfvkawaiqduhlazsszm` ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 ACTIVE functions; managed default `main` tracks master but remains MIGRATIONS_FAILED, preview ACTIVE_HEALTHY. Normal v480 SHA `bb2713ce...`, Team Lite v15 SHA `2c13414a...`, TEST v281, beta10 v6; no `upstatus-signal`. Lab `bfpjtfqlnypisxljoxkb` ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, Signal Test v32 and E2E v3.
- Security Advisor observed 2026-11-09 12:05 UTC: production 3 WARN anon + 3 WARN authenticated + 10 INFO RLS/no-policy; lab 0 WARN + 17 INFO. Public Realtime broadcasts, broad client grants/default ACLs and public Storage remain unresolved.
- Branch refs: master `9d40461babcec8eb8686c2a04be9c675df7da381`, develop `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`, team-lite-official `9065bc1536fde64f437f6f12b7abb9b072cb8281`. GitHub branch listing reports all three `protected=false`; repository rulesets count remains zero.
- Current QA refs: #80 HEAD `546b69d961c13ef1ad15bed960affddd4f45a844`, Validate [42598840642](https://github.com/Reekyi/UpStatus/actions/runs/42598840642) FAIL at inherited signed-upload assertion line 55. #82 HEAD `145d6f2ef5a71b245bee29bf27139250ee0df141`, Validate [42610953055](https://github.com/Reekyi/UpStatus/actions/runs/42610953055) FAIL at inherited production updateURL assertion line 26. #74/#76 exact candidate CI remain PASS per latest QA audit; #75 is historical baseline only.
- Issues remain #78 OPEN 0/8 physical criteria and #79 OPEN 16/35 historical checklist items. No physical browser/WebRTC test was run.
- No production/lab write, migration, fixture, deploy, workflow_dispatch, secret/variable/role/grant/ACL/policy/flag change, merge, release, userscript publication, or destructive action occurred.


## 2026-11-09 12:14 UTC — exact-head continuity revalidation

- The preceding checkpoint commit changed only `docs/CURRENT_STATE.md`, producing #80 HEAD `07ccc6f875f79721673fd96baee14dd153a20e3f`. Its exact-head Validate [42615265222](https://github.com/Reekyi/UpStatus/actions/runs/42615265222) failed after building PROD 3.0.40 / TEST 3.0.40-beta.22 at `scripts/validate.mjs:55`: `client signed upload helper missing`. This is the inherited signed-upload contract failure; no validator or runtime code was changed.
- QA #82 remains HEAD `145d6f2ef5a71b245bee29bf27139250ee0df141`; exact-head Validate [42610953055](https://github.com/Reekyi/UpStatus/actions/runs/42610953055) failed after building PROD/TEST 3.4.7 at `scripts/validate.mjs:26`: `production updateURL mismatch`. The candidate fix remains Draft #85 and is not integrated.
- Final provenance candidates remain Draft and mergeable: #127 HEAD `4ddd703287d8b17f29e3b28880cf0b1ef533f5fb` with focused push/PR workflows [42615124790](https://github.com/Reekyi/UpStatus/actions/runs/42615124790) and [42615130073](https://github.com/Reekyi/UpStatus/actions/runs/42615130073) SUCCESS; #128 HEAD `cb38853c4ac79932159715c8eafa8287fc884cb1` with focused PR workflow [42614800302](https://github.com/Reekyi/UpStatus/actions/runs/42614800302) SUCCESS. Neither result is a full release Validate or deployment.


## 2026-11-09 12:15 UTC — production security count recheck (SELECT-only)

Fresh read-only SQL on production returned:
- `realtime.messages`: 52 rows, all `private=false`; 44 `user_status` and 8 `db_change`, all on the legacy `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` topic.
- Two public Storage buckets; zero policies on `storage.objects`.
- Ten public RLS-enabled tables without policies.
- TRUNCATE grants on nine public tables for `anon` and nine for `authenticated`.
- 24 default ACL entries.

This count is now 52, up from the prior audit's 50. It is a row-count/catalog observation, not proof of external exploitation or trigger-to-client delivery. Security Advisor at 12:05 UTC remains 6 WARN (3 anon + 3 authenticated) and 10 INFO. RT-01, grants/default ACLs and Storage remain open. SELECT-only; no database or Storage mutation.


## Engineering checkpoint — 2026-11-10 05:12 UTC

This checkpoint supersedes older PR/runtime snapshots above where they conflict. Live GitHub and Supabase state was rechecked before this append.

### Exact candidate heads and CI

| PR | Current head | Current evidence |
|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) and Signaling Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS on exact head |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS; not a substitute for #76 |
| #76 Team Lite candidate | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | Candidate Checks [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) SUCCESS on exact head |
| #80 continuity | `00c2b38417b58c16b4797b82807008aed242e39e` | Validate [42631279108](https://github.com/Reekyi/UpStatus/actions/runs/42631279108) FAIL: inherited `client signed upload helper missing` at `scripts/validate.mjs:55` |
| #82 independent QA | `aece4a9385c99e13dcef318d8c4f119f122ebb50` | Validate [42756511530](https://github.com/Reekyi/UpStatus/actions/runs/42756511530) FAIL: inherited `production updateURL mismatch` at `scripts/validate.mjs:26` |
| #130 Normal AUTH-03 | `a6c32324e6fe17a0783bad09637131d7893285fd` | Smoke [42741601731](https://github.com/Reekyi/UpStatus/actions/runs/42741601731) SUCCESS, but branch is 12 ahead / 4 behind current #74 and must not be treated as integrated |
| #131 reconciled Normal AUTH-03 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | New Draft child of #74; PR Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) is in progress, not yet approved |

PRs remain open/Draft. No human reviews were found for #74, #75, #76, #80, #82, #130 or #131. PR #131 was created from the current #74 head to avoid force-pushing or rewriting #130. It ports only six AUTH-03 files; the current base already contains the matching Smoke workflow file.

### Current Supabase snapshot — SELECT-only

- Production project `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven remote migrations through `20261027155438`, 38 ACTIVE Edge Functions.
- Production managed default branch `main`: `MIGRATIONS_FAILED`; preview remains ACTIVE_HEALTHY.
- Laboratory `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, two isolated test functions. There is no separate full-product TEST project.
- Production Realtime query: 48 rows, 48 with `private=false`, one topic. Three broadcast trigger functions remain SECURITY DEFINER with effective EXECUTE for anon/authenticated.
- Production catalog: 10 public RLS-enabled tables without policies; nine backend-owned tables retain broad client grants; 24 default ACL entries; two public Storage buckets (`chat-images`, `profile-images`) at 20 MiB; zero policies on `storage.objects`.
- Production functions remain Normal `upstatus` v480, Team Lite `upstatus-team-lite` v15, TEST `upstatus-test` v281 and legacy Screen Share beta10 v6. The deployed Normal and Team Lite source still routes first setup through the legacy `login(req,true)`; the new invite rate-limit RPC is absent from production.
- The four original SQL sources for migrations `20261023154754`, `20261026195855`, `20261027154329` and `20261027155438` remain unavailable in `master`; do not reconstruct them from live schema.

### Release gates

- RT-01 remains blocked: candidate topic parity is fixed, but production broadcasts remain public and deployed clients are still on legacy bundles/topics.
- TEST-ISOLATION remains in progress: the lab is isolated and the current PR #131 suite is using it; it is not a full-product TEST.
- MIGRATION-PROVENANCE remains blocked by four missing original SQL files and the managed `main` migration failure.
- AUTH-03 remains in progress: invite issuance rate limiting is being revalidated on clean PR #131; login-attempt throttling and deployed runtime protection are not proven.
- ACL-STORAGE remains blocked by broad grants/default ACLs and public buckets without object policies.
- RECONNECT remains pending: issue #78 is still 0/8 and requires Ricardo's physical no-F5 confirmation.
- HUMAN-REVIEW remains pending: no human review or explicit release authorization exists.

### Safety and next step

No production SQL write, migration, deployment, merge, release, userscript publication, secret/role/flag/grant/ACL/policy change or destructive action occurred. Production queries were SELECT/catalog-only. The only lab mutation in the wider test history is the previously recorded isolated contract fixture; this checkpoint itself made no database mutation.

Next: allow PR #131's isolated Smoke run to finish; inspect the exact job logs and cleanup; send the result to independent QA. Keep #130 open and untouched. Continue RT-01/ACL/Storage and migration provenance only with reviewed candidate plans. Do not deploy or merge.


## 2026-11-13 10:13 UTC — engineering continuation checkpoint

### Verified refs
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA branch `qa/release-readiness-2026-11-04-master`: `2c52ddd85f514567563a64a5550e5e1e2bb91b1d`.

### Candidate state
- Normal #74: `dcaf6a072546eda0089e0cee4018c3047011f600`; Validate and Signaling Smoke runs 43376770142 / 43376770200 passed. Smoke includes 136/136 authenticated checks; setup-invite issuance rate-limit step was skipped on that earlier run.
- Team Lite #76: `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94`; Candidate Checks 43363871881 passed (110/110 authenticated, 16/16 unauthenticated).
- Baseline #75: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical PASS only.
- Continuity #80: `be72d40fa26b70f6beab8cabbede92b08e2eb194`; latest recorded Validate fails with `client signed upload helper missing`.
- QA #82: `2c52ddd85f514567563a64a5550e5e1e2bb91b1d`; Validate 43403571410 fails with `production updateURL mismatch`.
- #159: `0bf5a9b76156dea69380468197f19d6ee4bcffc3`; independent QA found P1: first setup no longer requires/consumes setupToken. Do not integrate #159 independently.
- #160: `d36eae7c78de74bd9938fd38d558752f0bf214cb`; distributed setup-invite rate limit candidate, isolated Smoke 43399500463 passed.
- #161: `a1d8dc8409ae894a5fb02acd2014749b7281868f`; Draft consolidated candidate, 10 commits ahead/0 behind #74. It preserves #160 and aligns Normal CLOUD_SERVER with PROD_FUNCTION. Smoke 43407101808 is in progress: complete build/Validate, harness syntax and unauthenticated isolated checks passed; authenticated browser/integration step is still running. No review has been received.

### Supabase read-only snapshot
- Only two projects are listed: production `dlfvkawaiqduhlazsszm` and isolated signaling/auth lab `bfpjtfqlnypisxljoxkb`. No full-product TEST project exists.
- Production branch `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`. Production has 38 ACTIVE Edge Functions, including 12 slugs with `upstatus-test` prefix.
- Production Realtime snapshot: 125 messages in 14 days, all `private=false` (67 user_status, 46 db_change, 6 remote_command, 6 remote_result).
- Production catalog: nine public tables with direct anon/authenticated grants (including TRUNCATE), ten RLS tables without policies, 120 client Default ACL entries, three SECURITY DEFINER broadcast functions with client EXECUTE, two public Storage buckets and 188 objects, zero Storage object policies.
- Lab: 39 migrations, two Edge Functions, zero direct client grants in public, 18 RLS tables without policies, zero buckets/objects. This lab is not a full-product TEST environment.
- Production session identity remains name-based: `upstatus_sessions.user_name`, `upstatus_profiles` primary key `user_name`, and `users.name` is not UNIQUE.
- The production migration ledger contains statements for versions `20261023154754`, `20261026195855`, `20261027154329`, and `20261027155438`. Their statement lengths/MD5s were recorded in the engineering checkpoint. This recovers executed statements, not the original files byte-for-byte; provenance is still in progress. No SQL writes or migrations were applied.

### Release gates and safety
- RT-01, TEST-ISOLATION, ACL-STORAGE remain blocked.
- AUTH-03 is in progress in candidate/lab only; production remains unchanged.
- MIGRATION-PROVENANCE is in progress; the four ledger statements are recoverable but original source-file provenance is not fully restored.
- RECONNECT remains pending: issue #78 is 0/8 physical acceptance criteria; no F5-free browser test was performed in this checkpoint.
- HUMAN-REVIEW remains pending; no human approval or release authorization was received.
- Official Team Lite deploy workflow still uses CLI `latest` and deploys `upstatus` instead of `upstatus-team-lite`. Develop TEST workflow uses the shared `SUPABASE_PROJECT_ID` secret and CLI `latest`. Neither workflow was dispatched.
- No merge, deploy, release, userscript publication, production migration/write, feature-flag change, secret change, or destructive operation occurred. Production SQL was SELECT-only.

### Next concrete action
Inspect the final result and complete logs of Smoke 43407101808 on #161, then obtain independent QA review. Keep all candidates Draft. Do not cut over the Normal API to `upstatus` until the release version, coordinated runtime/API/auth/signaling plan, rollback, human review and Ricardo's explicit authorization are in place.


## Engineering checkpoint — 2026-11-13 14:05:32 UTC

### Exact repository state rechecked
- Repository: `Reekyi/UpStatus`; default branch `master`.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`; `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`; `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`. All three report `protected=false`.
- QA PR #82 head: `ffe306256c867e6fc73916e6cbf596f4db97edb5`. The latest QA report stored on that branch was generated at 13:46:44 UTC; the report body records the pre-report QA head, while the final report commit is the current PR head.
- PR #74: `dcaf6a072546eda0089e0cee4018c3047011f600`, base master at `a9288ccfcb0f308d3a587bfca624418a395be07b`, 887 commits / 90 files. Validate #43376770142 and Smoke #43376770200 succeeded; Smoke reported 19/19 unauthenticated and 136/136 authenticated checks, but the setup-invite issuance rate-limit contract was skipped on that run.
- PR #75: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 commits / 10 files. Candidate Checks #41674353127 is historical baseline evidence only.
- PR #76: `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94`, 386 commits / 57 files. Candidate Checks #43363871881 succeeded with 16/16 unauthenticated and 110/110 authenticated checks.
- PR #80: `0df2e24f2907007ed53d11f8c286feba0d00ef28`, 307 commits ahead / 0 behind develop; its 21 changed files are documentation. Validate #43407662416 failed with the inherited assertion `client signed upload helper missing` at `scripts/validate.mjs`.
- PR #82: `ffe306256c867e6fc73916e6cbf596f4db97edb5`, 281 commits ahead / 1 behind master; its 138 changed files are documentation. Validate #43436792837 failed with `production updateURL mismatch`. Do not weaken the validator or edit QA's report history to make the docs PR green.
- PR #161: `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e`, 11 commits / 10 files, based on #74 head `dcaf6a0). Smoke #43430030814 succeeded with 19/19 unauthenticated and 136/136 authenticated checks, including the distributed setup-invite rate-limit harness.
- PR #162: `8dc23905180494feded76f10e9fbdd59ac85feb5`, 6 commits / 7 files, based on the Normal candidate branch. Validate #43430131864 and contract run #43422554676 succeeded. The contract maps `VOICE_ATTEMPT_ALREADY_ACTIVE` to HTTP 409, but the test is offline/locally constructed; it is not an HTTP request to the deployed Edge Function. PR #162's recorded base SHA `a1d8dc8` is one commit behind current #161 head `ae6a5f3`; the PR Validate merge ref included the updated base according to the QA run log, but refresh the merge ref before relying on future checks.
- PR #159 remains unsuitable for independent integration: QA identified a first-setup regression that removes the required one-time setup-token contract. PR #160 remains an earlier rate-limit candidate superseded by the consolidated #161 line.

### Current independent-QA findings
- QA report: [2026-11-13 audit, 13:46:44 UTC](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/audits/2026-11-13-upstatus-qa-audit-134644-utc.md). Recommendation remains NOT READY.
- The production Realtime SELECT over the last 14 days returned 128 broadcast rows, all `private=false`, on topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`: 70 `user_status`, 46 `db_change`, 6 `remote_command`, and 6 `remote_result`. QA source inspection reports installed Normal/Team Lite clients subscribe to a different beta10 topic and do not set `private:true` or `realtime.setAuth()`. Server-side broadcast payloads can contain full row data. RT-01 remains BLOCKED.
- Installed runtimes remain Normal `upstatus` v480, Team Lite `upstatus-team-lite` v15, TEST `upstatus-test` v281 and legacy Normal API `upstatus-screen-share-3-1-1-beta10` v6. Production has 38 active functions, including 12 `upstatus-test*` slugs; the TEST bundle still shares Normal's namespace/GM prefix and points at the production beta10 API. Do not infer unauthenticated access solely from `verify_jwt=false`; application-level session validation must be reviewed per route.
- Only two Supabase projects exist: production `dlfvkawaiqduhlazsszm` (ACTIVE_HEALTHY, us-west-2) and signaling/auth lab `bfpjtfqlnypisxljoxkb` (ACTIVE_HEALTHY, sa-east-1). The lab is not full-product TEST. Production's managed `main` branch remains `MIGRATIONS_FAILED` while its preview reports `ACTIVE_HEALTHY`; the lab has no development branches.
- Production has 7 migrations and no setup-token columns, setup-invite rate-limit table/RPC, or `upstatus_sessions.user_id`; `users.name` is not unique. The lab has 38 migrations, setup-invite and signaling rate-limit tables, and service-role-only SECURITY INVOKER RPCs, but still uses name-based sessions. The current lab schema query found 0 Realtime rows.
- Production has 10 RLS-enabled public tables without policies; 9 backend-owned public tables grant 7 privilege types (including TRUNCATE) to each of anon and authenticated. Three SECURITY DEFINER broadcast functions remain executable by both client roles. Security Advisor: 6 WARN and 10 INFO.
- Production Storage has two public buckets (`chat-images` and `profile-images`), each limited to 20 MiB, 188 objects and zero `storage.objects` policies. The backend/config candidates contain a 20 MiB versus 25 MiB validation mismatch that must be reconciled before release.
- Lab Security Advisor has 18 INFO and no WARN; 18 public tables have RLS without policies, but the lab has no direct anon/authenticated public-table grants, no buckets and no objects. The lab's three relevant RPCs (`consume_upstatus_setup_invite`, `consume_upstatus_setup_invite_rate_limit`, `consume_upstatus_signal_rate_limit`) are SECURITY INVOKER with empty search_path and EXECUTE limited to service_role.
- The deployed `upstatus-signal-test` v32 does not map `VOICE_ATTEMPT_ALREADY_ACTIVE` to 409. PR #162 contains the offline candidate correction only; no lab deploy or live HTTP test was performed.
- The four historical migration statements remain present in the production ledger, but original SQL files are absent from the canonical Git migration directory. Ledger recovery is not byte-for-byte source provenance. No migration was applied.
- Issue #78 remains 0/8 physical acceptance criteria. CI/Playwright/WebRTC does not replace Tampermonkey network-loss recovery without F5, real microphone/display permissions or installed Normal ↔ Team Lite interoperability.
- Issue #79 body remains at 16/35 historical checklist items; use the live gate JSON, not this body count, as the release-state source. QA's dedicated comment was preserved.

### Gate status and safety
- RT-01: BLOCKED — public Realtime broadcasts, topic mismatch and no private/authenticated transport.
- TEST-ISOLATION: BLOCKED — only signaling/auth lab exists; no independent full-product TEST project.
- MIGRATION-PROVENANCE: IN PROGRESS — statements are recoverable from ledger, original files/source provenance not restored.
- AUTH-03: BLOCKED — production has no setup-token/rate-limit schema or RPC; installed setup/admin paths remain legacy.
- ACL-STORAGE: BLOCKED — broad grants, SECURITY DEFINER execution, public buckets and missing Storage policies.
- RECONNECT: PENDING — no physical no-F5 acceptance from Ricardo; issue #78 remains 0/8.
- HUMAN-REVIEW: PENDING — PRs remain Draft without human approvals or release authorization.

No merge, deploy, release, migration, userscript publication, production write, secret/feature-flag/grant/policy/ACL change or destructive action occurred. All production SQL was SELECT/catalog-only. This checkpoint is documentation-only.



## Engineering checkpoint — 2026-11-13 17:02:30 UTC

### Scope, exact refs, and safety

Re-fetched live GitHub branch refs, PR metadata/diffs, commit workflow runs, job logs, review submissions, Issues #78/#79, the complete Release Readiness blob, the continuity handoff, the release checklist, Supabase project inventory, migrations, Edge Functions, Security Advisors, table/catalog metadata, Storage buckets/policies, and read-only SQL snapshots. The only repository edit in this checkpoint is this append to `docs/CURRENT_STATE.md` on the documentation branch for PR #80. The existing Engineering comments on Issue #79 and PR #162 were updated in place; the QA comment/report were not edited.

No manual/local application tests were run. A documentation-only commit later triggered the existing Validate workflow; its result is recorded in the follow-up below. All SQL executed against production and the lab was SELECT/catalog-only. No merge, deploy, release, userscript publication, migration, production write, secret/feature-flag/grant/policy/ACL change, or destructive operation occurred.

### GitHub refs and PRs

Live branch refs:
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381` (API reports protected=false).
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` (protected=false).
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281` (protected=false).
- Documentation branch `docs/continuity-handoff-2026-11-04`: `8ba76f81121fd8bec2c799c2d2a78db1368363be` (protected=false).
- QA branch endpoint returned `7a4730cff0e0fd18c03adea175e7bdcbf0f1de4b`; see the PR #82 ref discrepancy below.

| PR | Head reported by PR API | Base | Commits / files | Existing CI evidence |
|---|---|---|---:|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | master at `a9288ccfcb0f308d3a587bfca624418a395be07b` | 887 / 90 | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) and Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official at `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 59 / 10 | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS |
| #76 Team Lite candidate | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | team-lite-official at `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 386 / 57 | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) SUCCESS |
| #80 continuity | `8ba76f81121fd8bec2c799c2d2a78db1368363be` | develop at `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | 309 / 22 | Validate [43448744132](https://github.com/Reekyi/UpStatus/actions/runs/43448744132) FAILURE |
| #82 independent QA | PR API: `c8e3c6f144969d0371845eb1acb51c4e49652716` | master at `a9288ccfcb0f308d3a587bfca624418a395be07b` | 284 / 141 | Validate [43463260387](https://github.com/Reekyi/UpStatus/actions/runs/43463260387) FAILURE |
| #161 Normal consolidated | `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e` | chore/continuity-foundation at #74 HEAD `dcaf6a0` | 11 / 10 | Smoke [43430030814](https://github.com/Reekyi/UpStatus/actions/runs/43430030814) SUCCESS |
| #162 voice HTTP contract | `fa8c9fa1fc91a238fca65fb46f31d078288e7f36` | normal candidate; PR metadata records base `a1d8dc8409ae894a5fb02acd2014749b7281868f` | 8 / 7 | Contract [43459218841](https://github.com/Reekyi/UpStatus/actions/runs/43459218841), Validate [43459219365](https://github.com/Reekyi/UpStatus/actions/runs/43459219365), and push contract [43459208349](https://github.com/Reekyi/UpStatus/actions/runs/43459208349) SUCCESS |

All seven PRs remain open, Draft, unmerged and mergeable according to the PR metadata. Submitted review lists returned zero reviews for #74, #75, #76, #80, #82, #161 and #162.

The #80 diff against develop is documentation-only: 309 commits ahead, zero behind, 22 files. Its exact-head Validate log fails at `scripts/validate.mjs:55` with `client signed upload helper missing`; no validator was weakened.

The #82 PR API reports head `c8e3c6f`, and run 43463260387 is a pull_request event on that SHA. Its job log fails at `scripts/validate.mjs:26` with `production updateURL mismatch`. However, the repository branch endpoint for `qa/release-readiness-2026-11-04-master` returns `7a4730c`, while the latest QA report at 16:28 UTC records `386d22d` as the pre-report QA HEAD. The PR metadata, branch endpoint, and report therefore expose three different refs. Do not assume they are equivalent; QA/Engineering must reconcile the PR head and branch ref before attaching new CI evidence to the latest report. The QA branch and its report history were not modified.

#161's Smoke log reports 19/19 unauthenticated and 136/136 authenticated checks, including the distributed setup-invite rate-limit harness. The PR-triggered workflow-run query returns only the Smoke for #161; the dedicated `validate.yml` filter includes master/develop/the candidate branch but the actual base is `chore/continuity-foundation`. The Smoke ran the full offline Validate successfully, but the separate required Validate check is not currently demonstrated on the exact #161 PR event.

#162's checks passed on HEAD `fa8c9fa`, but the base branch has moved. Compare of current base branch `fix/normal-api-target-aligned-rate-limit-20261113` to #162 returns 8 commits ahead, 1 behind, with merge-base `a1d8dc8`; the one base-only commit changes `.github/workflows/validate.yml` (one insertion and one deletion). The PR remains mergeable by GitHub metadata, but it is not reconciled with the current base. No rebase or history rewrite was performed. The HTTP 409 test constructs local `Response` objects; it is not a live request to the deployed Edge Function.

### Supabase project inventory and current runtime

Exactly two projects are listed; both are ACTIVE_HEALTHY:
- Production `dlfvkawaiqduhlazsszm`, UpStatus, `us-west-2`, PostgreSQL 17.11.0.002.
- Signaling/auth lab `bfpjtfqlnypisxljoxkb`, `sa-east-1`, PostgreSQL 17.11.0.003.

There is no full-product TEST project. Production's managed `main` branch reports `MIGRATIONS_FAILED` while its preview reports `ACTIVE_HEALTHY`; the lab has no Supabase development branches.

- Production: 7 applied migrations and 38 active Edge Functions; 12 slugs begin with `upstatus-test`.
- Lab: 39 migrations and 2 active functions (`upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3).
- Production runtime versions remain Normal `upstatus` v480, Team Lite `upstatus-team-lite` v15, TEST `upstatus-test` v281, and legacy beta10 v6.
- Lab `upstatus-signal-test` v32 has SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`. Its deployed source maps `VOICE_ATTEMPT_CONFLICT` and `ROOM_FULL` to 409, but does not contain `VOICE_ATTEMPT_ALREADY_ACTIVE` or the candidate `voiceOpenErrorStatus` helper. That error still falls through to 500. No lab deploy or live HTTP request occurred.

### Realtime, grants, Default ACL, RLS and Storage

A fresh production SELECT over the last 14 days returned **97** rows in `realtime.messages`, all `private=false`, on topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` (first observed 2026-11-10 12:23:15; last 2026-11-13 16:00:26). The lab has zero Realtime rows. Installed Normal/Team Lite clients still use the legacy beta10 topic and do not establish private authenticated delivery. RT-01 remains blocked.

Production Security Advisor at 16:57 UTC returned 6 WARN and 10 INFO:
- Three broadcast SECURITY DEFINER functions are executable by anon and authenticated (six WARN findings total).
- Ten public RLS-enabled tables have no policies.
- Nine backend-owned public tables grant seven privilege types to each of anon and authenticated, including TRUNCATE (126 privilege rows total; 18 TRUNCATE grants).
- The read-only Default ACL expansion shows broad defaults across public, storage, graphql and graphql_public for roles including anon/authenticated; no ACL was changed.
- Storage has two public buckets, each live-limited to 20 MiB: `chat-images` and `profile-images`. There are 188 objects and zero policies on `storage.objects`.
- The current master `supabase/config.toml` (blob `eb121d75ebd86adeeae88edcf364db87c80902fb`) still declares chat-images 25 MB and profile-images 2 MB, both public. This disagrees with the live 20 MiB limit on both buckets. No bucket or policy change was made.

Lab Security Advisor returned 18 INFO and no WARN. Lab public schema has no direct anon/authenticated table grants; it has 18 RLS-enabled tables without policies, no Storage buckets/objects, and 39 migrations. The lab has four setup-token columns and the invite-rate-limit table, but `upstatus_sessions` still stores `user_name` and has no `user_id`. Production has no setup-token columns or invite-rate-limit table/RPC, and its sessions are also name-based. No user/session values were inspected.

### Migration provenance

The production ledger lists 7 migrations; the lab lists 39. The current `master` tree contains only three canonical SQL files under `supabase/migrations`:
- `20261005160000_upstatus_cloud.sql`
- `20261005173000_remote_realtime.sql`
- `20261005180000_client_presence.sql`

Four later historical SQL source files remain absent from the canonical directory, although their executed statements are present in the production ledger. Ledger recovery is not byte-for-byte original-file provenance. The original files were not reconstructed and no migration was applied.

### Documentation, issues and acceptance

- `docs/RELEASE_READINESS.md` blob `7cfbd70886df42ce790c078c224b19284a632595`: 8,410 lines / 1,045,105 bytes. Its latest technical checkpoint remains 2026-11-08 18:30 UTC; the file is QA-owned and was not changed.
- `RELEASE_CHECKLIST.md` was read in full. It requires TEST isolation, functional/browser acceptance, and explicit approval before production.
- `UPSTATUS_HANDOFF.md` and the tail of `docs/CURRENT_STATE.md` were read on the continuity branch. This append supersedes the previous engineering snapshot dated 2026-11-13 14:05:32 UTC.
- Latest independent QA report consulted: [2026-11-13 16:28 UTC](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/audits/2026-11-13-upstatus-qa-audit-1628-utc.md). Its recommendation is NOT READY.
- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open, 0/8 physical acceptance criteria. No F5-free physical browser test was performed.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) remains open; its body checklist is historical (16/35). The dedicated Engineering comment is updated in place; the QA comment is preserved.

### Release gates

- RT-01: BLOCKED — 97 production broadcasts are public; installed client topic/auth does not match a private server-mediated path.
- TEST-ISOLATION: BLOCKED — only production and signaling/auth lab exist; no full-product TEST.
- MIGRATION-PROVENANCE: IN PROGRESS — ledger statements are present, but four original canonical SQL files are missing.
- AUTH-03: BLOCKED — production lacks setup-token/rate-limit schema and sessions still use name identity; lab candidate schema is not deployed.
- ACL-STORAGE: BLOCKED — broad grants/Default ACL, SECURITY DEFINER warnings, public buckets and zero Storage object policies; live/config size mismatch remains.
- RECONNECT: PENDING — #78 remains 0/8 and requires Ricardo's physical no-F5 acceptance.
- HUMAN-REVIEW: PENDING — all seven PRs remain Draft with zero submitted reviews; no explicit release authorization exists.

### Next actions

1. Reconcile #162 onto the current #161 base and rerun the dedicated PR Validate and voice contract on the final stacked SHA.
2. Ask QA to reconcile the #82 PR head, branch endpoint and report HEAD before treating a new QA CI run as exact-head evidence.
3. Obtain explicit authorization and confirm project cost/organization before provisioning Full-Product TEST.
4. Design a private server-mediated Realtime cutover with rollback; do not flip channels or revoke grants before client/server trust-boundary validation.
5. Complete AUTH-03 with immutable `users.id` session identity, then validate login/setup and role behavior in isolated TEST.
6. Align Storage live/config limits and decide public/private access with object policies; review Default ACL changes with the owning admin role.
7. Recover the four original migration sources or document a formal provenance exception; diagnose the managed `main` migration failure.
8. Obtain the physical no-F5 Normal and Team Lite acceptance for all eight criteria in Issue #78 and human reviews.

No merge, deploy, release, userscript publication, migration, production SQL write, secret/feature-flag/grant/policy/ACL change, or destructive operation occurred. Production received SELECT/catalog queries only.


### Follow-up — Validate disparado pelo checkpoint documental (2026-11-13T17:03:23.204Z)

- The documentation-only commit `bdcea1503a73de77a0ab8dfbb993139c907a3163` advanced PR #80 to 310 commits ahead / 0 behind develop; the PR remains Draft and mergeable.
- Despite the documentation-only diff, the existing `UpStatus Validate` workflow was triggered by a `pull_request` event: [run 43468788226](https://github.com/Reekyi/UpStatus/actions/runs/43468788226), exact HEAD `bdcea1503a73de77a0ab8dfbb993139c907a3163`.
- The job built `PROD 3.0.40 / TEST 3.0.40-beta.22` and failed at `scripts/validate.mjs:55` with `client signed upload helper missing`. This is the same inherited develop-side assertion observed on prior #80 heads; no application code or validator was changed in this checkpoint.
- Inspection of `.github/workflows/validate.yml` at both `develop` and the #80 branch (blob `a4a47db5d45fb99e60115ab6617af69f1215ff2f`) confirms that the workflow has no `paths-ignore` for either `push` or `pull_request`; therefore documentation-only PR updates still execute the full Validate. No workflow change was made because #80 is intentionally documentation-only.
- No local/manual test was run. The only execution was the existing GitHub Actions Validate workflow above.
