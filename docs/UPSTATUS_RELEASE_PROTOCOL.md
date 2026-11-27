# UpStatus — Release Protocol & Continuity

Last reviewed: 2026-11-27

## Current release state

- Official production version: **3.5.0**; the approved 3.5.2 release is in the promotion PR and awaits the production workflow.
- GitHub default branch: `master`; official release merge commit: `a9019ada2ab4dae05540520eda04211b38a301c7` (PR #184).
- `release.json`: `version=3.5.0`, empty `preRelease`, stable installer `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus/upstatus.user.js`.
- Official Supabase function: `upstatus`, project `mvjqunhjxkbfcrxkjtgf`, deployment version **6**, status **ACTIVE**, `verify_jwt=false`, source hash `d4127ecf63de3e26901d4d4b306f03da38114605dfac1ef4ca2505b6e39240b9`.
- Official `/health` returned `ok:true`, version `3.5.0`; `/api/update-info` returned the matching stable update route. Served userscript reports `@version 3.5.0`, namespace `upseller`.
- Active candidate: **3.5.1-beta.2**, branch `beta/3.5.1-beta.2-agenda-status-mirror`, separate from master.
- Existing production live-integration function `upstatus-test` remains ACTIVE at deployment version **4**, `3.5.0-beta.5`, hash `71c0446cfb0608b831088f8782f883198758561f809c496e82f0ed7c77f798b7`; it is not used or overwritten.
- Beta 2 uses a new dedicated production-project function `upstatus-351-test` in project `mvjqunhjxkbfcrxkjtgf`. It shares production DB, Storage, profiles, chat and established Realtime/ringtone coordination to expose the live team data, while keeping a separate Edge Function route, userscript namespace `upseller-test`, updater manifest and local storage prefix `upstatus_351_beta2_`.
- The beta installer URL is `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-351-test/upstatus.user.js`.
- Official function `upstatus` v6 and Beta 5 function `upstatus-test` v4 must not be modified. The Staging Beta 1 function `upstatus-test` v8 is also left intact.
- Last user-provided quota screenshot before official deploy (2026-11-27): Egress 0.56/5 GB (11.2%); DB 38/500 MB (7.6%); MAU 0/50,000; Storage 0/1 GB; Log Ingestion 0.53/1 GB (53%); Log Query 1.37/100 GB (1.37%). This is a pre-deploy snapshot, not live post-deploy telemetry.
- Recheck current quota usage before any future usage-intensive changes. Log Ingestion was above the 50% alert threshold but below the 60% investigation threshold in the last supplied screenshot.
- Never infer runtime state from GitHub alone. Recheck the function metadata and public health/update endpoints before future release claims.

## Mandatory new-chat onboarding

At the beginning of every new UpStatus conversation:

1. Read `AGENTS.md` at the repository root. It is the agent entry point and links to this protocol and the reusable new-chat prompt.
2. Read this file on GitHub first.
3. Inspect repository metadata, default branch, recent commits, branches, tags/releases and working-tree-relevant files.
4. Read `README.md`, `release.json`, `CHANGELOG.md`, `package.json`, build/validation scripts and deployment workflows. Inspect the actual feature source relevant to the requested change.
5. Inspect both Supabase projects in organization `UpStatus Revived`:
   - Production: `upstatus-normal`, ref `mvjqunhjxkbfcrxkjtgf`.
   - Staging: `UpStatus Staging`, ref `akbgmmpnnpwcwgcfrltw`.
   - Check project health, Edge Functions, migrations, tables, and relevant logs/advisors as appropriate.
6. At every new chat, re-read the live `release.json` and changelog and inspect current beta branches/tags and both live Supabase environments. Derive the next beta from the latest official version and the highest beta number already used for that release target. Never rely solely on this document's snapshot.
7. Reconcile observed facts with this protocol. If live GitHub/Supabase state disagrees with this file, report the discrepancy and treat live deployed state as authoritative for what's actually running. Update this file when release state changes.
8. Do not begin implementation until you understand the existing architecture and last changes. Reuse the existing project; do not rebuild or reorganize unrelated pieces.

**Important ChatGPT limitation:** repository files cannot force every brand-new ChatGPT conversation to read them automatically. Ricardo must start a new chat by pasting the prompt in `docs/UPSTATUS_NEW_CHAT_PROMPT.md` (or the equivalent text in the root `AGENTS.md`). That first prompt explicitly instructs the assistant to inspect GitHub and Supabase before doing work. If the prompt is not supplied, the assistant must not claim it has automatically loaded this repository context.

## Versioning rules

- Stable versions use SemVer: `MAJOR.MINOR.PATCH`.
- Beta versions for a new stable target use `MAJOR.MINOR.PATCH-beta.N` (for example, after 3.4.9, first beta is `3.5.0-beta.1`, then `3.5.0-beta.2`).
- Keep official and beta versions explicitly tracked in this file, `release.json`, and `CHANGELOG.md`.
- Do not mark a beta as stable or advance the official version until Ricardo explicitly tests and approves it.
- When an approved beta is promoted, publish the matching stable version (e.g. beta.1 -> 3.5.0), record it in the changelog, and update this file.
- A new independent feature/fix after a stable release starts the next beta sequence at beta.1 unless continuing the same active beta cycle.
- Do not silently reset or reuse beta numbers. If a beta is rejected, record it as rejected and move to the next beta number for further attempts.

## Supabase Free-plan quota protection (mandatory)

The user has explicitly required that the project must not exceed Supabase Free-plan limits. Treat quota headroom as a release-blocking safety requirement, not an afterthought.

### Latest user-provided dashboard snapshot

Latest user-provided billing-cycle screenshot on 2026-11-27 before the Beta 5 deployment (snapshot only, not live API telemetry; an earlier same-day screenshot showed 0.45 GB log ingestion):

| Metric | Usage | Free-plan limit | Used |
|---|---:|---:|---:|
| Egress | 0.56 GB | 5 GB | 11.2% |
| Database size | 38 MB | 500 MB | 7.6% |
| Monthly active users | 0 | 50,000 | 0% |
| File storage | 0 GB | 1 GB | 0% |
| Log ingestion | 0.53 GB | 1 GB | **53%** |
| Log query | 1.37 GB | 100 GB | 1.37% |

Log ingestion is the current pressure point: nearly half of its monthly allowance has already been consumed. Do not describe these values as current/live unless rechecked in the Supabase dashboard or a verified usage source.

### Mandatory operating thresholds

- **At 50% of any quota:** mention it in the status summary and identify the likely source of growth.
- **At 60%:** warning state. Review usage trend before adding instrumentation, polling, background jobs, realtime fan-out, media transfer, or database writes.
- **At 70%:** freeze nonessential usage growth. No verbose logging, repeated diagnostics, broad log dumps, unnecessary polling, or avoidable data duplication. Any feature likely to increase the metric requires a measured estimate and Ricardo's explicit approval.
- **At 80%:** stop beta deployment and nonessential runtime changes until the cause is identified and a safe mitigation is tested. Do not risk consuming the remaining quota.
- **At 90%:** hard stop for all changes that can increase that quota. Only user-approved mitigation/reduction work may proceed.
- Never knowingly cross a Free-plan limit. If current usage cannot be verified and a change could materially increase usage, do not deploy it. Explain the uncertainty and request a fresh dashboard snapshot.

### Engineering rules to conserve quotas

1. **Logs:** avoid per-request/per-message/per-heartbeat success logs; never log in tight loops; do not log full request bodies, chat content, media, tokens, credentials, or PII. Keep production logs to actionable warnings/errors with concise structured context. Remove temporary debug logs before beta deployment. Sample or rate-limit repeated identical errors. Do not add chatty console logging to the userscript or Edge Functions.
2. **Log queries:** query only a narrow service, time window, and fields. Do not repeatedly poll logs or dump large windows. Use one focused query, inspect its result, then refine only if necessary.
3. **Egress/media:** avoid needless polling, duplicate payloads, unbounded history fetches, repeated downloads, and large media responses. Use pagination, caching, conditional requests, and compression only where compatible with the existing architecture.
4. **Database:** avoid unbounded tables, duplicate records, excessive indexes, unnecessary writes/heartbeats, and full-table scans. Inspect query plans and table sizes before adding high-volume features. Never delete user data just to reduce usage without explicit approval and a backup/retention plan.
5. **Realtime:** avoid broad broadcasts, high-frequency heartbeats, and sending the same payload to irrelevant clients. Preserve isolated TEST topics and avoid multiplying production subscriptions.
6. **Storage:** do not upload test media or duplicate assets to production. Avoid retaining temporary test files; any cleanup must preserve user data and follow explicit retention rules.
7. **Environment:** do not create Supabase projects or database branches for beta testing unless the user explicitly authorizes the quoted cost. Use the already-existing Staging project.
8. Before and after any beta deployment, inspect quota usage if accessible, and record observed values and timestamp. If the Supabase tools cannot read plan usage directly, say so and use the user's current dashboard screenshot. Do not pretend that project health or logs reveal quota totals.
9. For every proposed change, include a short quota-impact assessment: database, egress, storage, log ingestion, and log query. State “no expected material impact” only when supported by the code path and test evidence.

## Mandatory development and release workflow

1. **Understand and plan:** identify requested behavior, affected client/server/database paths, regression risks, test plan, and quota impact. State what will and will not change.
2. **Protect production:** never overwrite the official `upstatus` Edge Function or stable userscript URL with beta code. A separate beta Edge Function may be deployed inside the production project only when live database/Realtime interoperability is explicitly requested and authorized; it must keep a distinct slug, userscript namespace, local storage prefix, and updater channel.
3. **Isolate work:** make a dedicated GitHub branch from the verified stable baseline or current approved integration base. Keep `master` stable. Do not create Supabase database branches without explicit cost approval.
4. **Build beta:** update the single version source `release.json` according to existing build conventions and generate artifacts via repository build scripts. Beta output must be unmistakably labeled `-beta.N`.
5. **Validate before deploying:** run `npm run validate` (or the actual repository validation command if package scripts differ), including build, syntax checks, client/server artifact parity, and regression tests. Add focused regression tests. Inspect generated diffs and ensure no unrelated changes or production identifiers drift.
6. **Deploy beta according to its integration mode:** default to the isolated Staging project `akbgmmpnnpwcwgcfrltw`. When Ricardo explicitly requires interoperability with the live team, deploy a new dedicated function slug in the production project (Beta 2: `upstatus-351-test`). Never overwrite stable `upstatus` or an existing beta function such as Beta 5 `upstatus-test`. In this mode, DB, Storage and Realtime are intentionally shared; function route, userscript namespace, update manifest and local storage prefix remain separate. Confirm runtime target, function slug, live API responses, member allowlist and stable function health before handoff.
7. **Hand over for user testing:** provide exact beta version, installation/update URL, deployment status, changes, test checklist, known risks, quota-impact assessment, and rollback approach. Be explicit when something could not be verified.
8. **Wait for explicit approval:** phrases such as “aprovado” or “pode lançar oficial” are required before stable promotion. “Testei” alone is not approval unless acceptance is clear.
9. **Promote safely:** after explicit approval, review final diff, merge approved changes into `master`, update stable version and changelog, run full validation, deploy production only using the production workflow, verify live production endpoint, then update this protocol with the new official version and no active beta.
10. **Rollback:** if staging testing fails, keep production unchanged, record beta as rejected, fix on a new beta iteration and deploy only to staging. If a production issue occurs after promotion, stop further changes, inspect last known-good release and prepare deliberate rollback; do not force-push or destructively rewrite history.

## Architecture and environment guardrails

- GitHub is the source of truth for code, version manifests and release history.
- Supabase projects are runtime environments. Staging is the default for isolated beta tests; an explicitly approved beta integration function may live inside the production project to share live team data without replacing stable runtime.
- Production Supabase project: `mvjqunhjxkbfcrxkjtgf` (`upstatus-normal`).
- Staging Supabase project: `akbgmmpnnpwcwgcfrltw` (`UpStatus Staging`).
- Both projects were observed as `ACTIVE_HEALTHY` on 2026-11-27 in region `sa-east-1`. Recheck at the start of each new chat.
- Production Edge Function is `upstatus`; staging/test Edge Function naming and deployment must follow actual repository and project state. Do not assume endpoint or source path; inspect it.
- Existing README and workflows may be stale. Verify actual project refs, function names, and release guards before relying on them.
- Existing build logic includes separate production and TEST artifacts. For the live-integration beta, TEST intentionally shares the production database, Storage, Realtime topic, and ringtone coordination channel. Preserve separate local userscript storage prefixes and never alter the stable function or stable userscript URL.
- Never put secrets, tokens, passwords, service-role keys or private user data into GitHub, source files, logs, handoff notes or this document.
- Do not expose Supabase service-role/secret keys in userscripts or browser code.
- For database schema changes, inspect tables, RLS and migrations first. Prefer additive, reversible migrations; avoid destructive changes without explaining consequences and receiving explicit authorization. Verify schema and security after changes.
- Do not deploy an Edge Function simply because it was edited; confirm target project and exact function name first.

## Required communication style for UpStatus work

- Be transparent and factual. Never claim a build, test, deployment, version, rollback or verification succeeded unless tool output or test evidence confirms it.
- Before any production-impacting operation, explain exactly what will change and obtain Ricardo's explicit approval.
- Prefer doing the work and delivering a tested result over giving only instructions, when repository and connector access permit.
- Keep a continuously updated status: official version, beta version/status, working branch, latest commit, staging deployment, production deployment, tests, quota snapshot, pending user tests/approval.
- After each meaningful release-state change, update this document and changelog/version manifest as applicable. Use commit history as audit trail.

## Beta 4 history (superseded)

- The Beta 4 release was the first attempt to remove page reloads after status changes. It used heuristic Vue/Pinia traversal and a stale Realtime host, so it did not fully synchronize the live Sale Smartly UI.
- Beta 4 is no longer active and must not be treated as the current test or production version. The corrected native integration was implemented and manually exercised in Beta 5, then promoted to official 3.5.0.


## Previous integration beta — 3.5.0-beta.5 (tested and superseded by official 3.5.0)

- Branch: `beta/3.5.0-beta.5-realtime-native-status`; PR #184 merged into `master` as commit `a9019ada2ab4dae05540520eda04211b38a301c7`.
- Dedicated beta function: `upstatus-test`, project `mvjqunhjxkbfcrxkjtgf`, deployment version 4, ACTIVE, `verify_jwt=false`, source hash `71c0446cfb0608b831088f8782f883198758561f809c496e82f0ed7c77f798b7`.
- Beta userscript metadata: `@version 3.5.0-beta.5`, namespace `upseller-test`, update URL uses `/functions/v1/upstatus-test/upstatus.user.js`.
- Beta and official runtime intentionally share the live team database, Storage and established Realtime topic. Local userscript namespace/storage prefix and function route remain separate.
- The native Sale Smartly Pinia action `user.switchOnlineStatus({ online_status, event_type: "0" })` validates the active identity via `user.nickname`, changes only `user.onlineStatus`, and respects `canSelectOnlineStatuses`.
- Ricardo confirmed own status changes and a remote status change in Guilherme's Sale Smartly session without F5.
- Official 3.5.0 adds three-second animated dismissal for transient UpStatus messages and chat error notices. The persistent connection-state indicator intentionally remains visible.
- GitHub Actions validation for the final stable candidate passed in run #2362; master post-merge validation passed in run #2363.
- Official Supabase function `upstatus` is now deployment version 6, ACTIVE, hash `d4127ecf63de3e26901d4d4b306f03da38114605dfac1ef4ca2505b6e39240b9`. Official health returned `3.5.0`; the served userscript header is `@version 3.5.0`, namespace `upseller`.
- Pre-deploy quota snapshot supplied by Ricardo on 2026-11-27: Egress 0.56/5 GB (11.2%); DB 38/500 MB (7.6%); MAU 0/50,000; Storage 0/1 GB; Log Ingestion 0.53/1 GB (53%); Log Query 1.37/100 GB (1.37%). This snapshot preceded the official deploy and is not post-deploy live telemetry.
- No database migration/cleanup, new Realtime topic/subscription, extra polling, or success logging was introduced.

## Current continuity checkpoint (2026-11-27)

- `master` and `release.json` are on official stable **3.5.0**.
- Official merge commit: `a9019ada2ab4dae05540520eda04211b38a301c7`.
- Official Supabase runtime: `upstatus` v6 ACTIVE, stable health 3.5.0, source hash `d4127ecf63de3e26901d4d4b306f03da38114605dfac1ef4ca2505b6e39240b9`.
- Separate regression runtime: `upstatus-test` v4 ACTIVE at 3.5.0-beta.5, unchanged hash `71c0446cfb0608b831088f8782f883198758561f809c496e82f0ed7c77f798b7`.
- GitHub Actions UpStatus Validate: PR run #2362 passed; master post-merge run #2363 passed.
- A separate retired Lucca Portal Pages workflow run failed because GitHub Pages is not enabled/configured for this repository. Its upload/deploy steps were skipped; it did not affect UpStatus validation or Supabase deployment.
- Quota baseline remains the pre-deploy user-provided screenshot shown above. No live post-deploy quota total was available in the connector.


## 3.5.1-beta.1 candidate isolation (2026-11-27)

- Candidate branch: beta/3.5.1-beta.1-ui-fixes.
- Beta manifest on this branch: 3.5.1-beta.1, pointing to the Staging upstatus-test installer.
- Staging project: akbgmmpnnpwcwgcfrltw; candidate runtime function: upstatus-test.
- Production project mvjqunhjxkbfcrxkjtgf is read-only for this cycle. Do not deploy or overwrite production upstatus or production upstatus-test.
- The beta uses its own Staging Realtime topic, ringtone coordination channel, publishable key, storage prefix and updater manifest. Never reuse the production team topic for this isolated beta.
- No SQL migration, user-row deletion, history deletion, or Supabase project/branch creation is authorized or required for these UI and identity-filter corrections.
- Before handoff, validate the branch through GitHub Actions, deploy only Staging upstatus-test, and verify deployment metadata and served version. Manual tests by Ricardo remain required; do not promote to stable until his explicit approval.

- Deployment result: Staging `upstatus-test` version **8**, ACTIVE, `verify_jwt=false`, source hash `66451104ef80f36919d19bc34e9628eb52d3b23446a354fa83a7a74924afc130`.
- GitHub Actions validation run **#2367** passed. Runtime `/health` returned `ok:true` and `3.5.1-beta.1`; `/api/update-info` returned version `3.5.1-beta.1`; served userscript reports `@version 3.5.1-beta.1`, namespace `upseller-test`, and the Staging installer URL. `/api/members` returned only Guilherme, Lohan and Ricardo.
- Production functions remain unchanged: official `upstatus` v6 and production `upstatus-test` v4. Staging distributor `upstatus` v1 was not changed.


## 3.5.1-beta.2 design and isolation (2026-11-27)

- Candidate branch: `beta/3.5.1-beta.2-agenda-status-mirror`.
- Runtime target: new dedicated function `upstatus-351-test` in the existing production project `mvjqunhjxkbfcrxkjtgf`, only because Ricardo explicitly requested the Beta 2 to use the live team's data. Do not reuse/overwrite production `upstatus-test` Beta 5.
- Beta install URL: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-351-test/upstatus.user.js`.
- The Beta 2 shares database, Storage, profiles, chat, live Realtime topic and ringtone coordination. Its namespace is `upseller-test`, local storage prefix is `upstatus_351_beta2_`, and updater points to the Beta 2 branch manifest.
- Production stable function `upstatus` v6, production Beta 5 function `upstatus-test` v4, Staging `upstatus` v1, and Staging Beta 1 `upstatus-test` v8 must remain unchanged.
- No database migrations, user/account deletions, history deletion, storage copy, or data cleanup are part of this beta.
- Status source-of-truth rule: Sale Smartly Pinia `user.onlineStatus` is authoritative. An UpStatus status POST is accepted only with an explicit confirmation flag after the native Sale Smartly action has succeeded. Direct Sale Smartly state changes are observed and mirrored into UpStatus. Programmatic updates are marked to prevent observer feedback loops.
- Agenda authorization: Ricardo, Guilherme and Lohan can view the full agenda. Each member may edit only their own lunch choice (12h–13h or 13h–14h) for the current day. Only Ricardo may assign or clear the four daily training slots and the weekly Aulão owner. Empty slots are intentionally no-ops.
- Aulão persists Monday–Friday for the selected week and pauses the owner 15h–17h. Daily training slots are 10h, 11h, 15h and 16h. Lunch is individual. No automatic morning activation is added. Weekday end-of-day status is Away at 18h.
- Scheduler reconciles the current desired state at local schedule boundaries and when the page resumes; it must not replay missed transitions in sequence. Status changes still require the employee's Sale Smartly browser session to be open.
- Avoid schedule polling loops: one-shot local timers are aligned to relevant boundaries; state writes should occur only on actual runtime changes. Agenda configuration prunes old daily/week records.
- This beta shares live data and therefore can update real team statuses and append status history during testing. No destructive operations are permitted.
- GitHub Actions validation run **#2372** passed, including schedule regression tests. New production-project `upstatus-351-test` function is deployment version **1**, ACTIVE, `verify_jwt=false`, source hash `65f799972b086081304e1e0895b41f2ce385c61b46545bb43f231d42ff8ae2af`.
- Runtime verification: `/health` returned `ok:true`, version `3.5.1-beta.2`; `/api/update-info` returned the matching version and route; served userscript reports `@version 3.5.1-beta.2`, namespace `upseller-test`, and the dedicated installer URL. `/api/members` returned only Guilherme, Lohan and Ricardo.
- Production official `upstatus` v6 and existing production Beta 5 `upstatus-test` v4 remain unchanged. Ricardo's visual/functional acceptance is pending.


## Approved stable release 3.5.2 (2026-11-27; production workflow pending)
- Release branch: `release/3.5.2-agenda-status-mirror`, based on the user-accepted Beta 2 implementation.
- Requested stable version: `3.5.2`, with an empty `preRelease` field.
- Official installer: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus/upstatus.user.js`.
- The official production workflow guard is updated to accept only stable `3.5.2`; it refuses beta versions and other stable versions.
- Beta regression artifact remains pinned to `3.5.1-beta.2` and the separate `upstatus-351-test` function; the stable build must not overwrite that function.
- The weekly Aulão owner is keyed by the Monday date. The same selection is used through Friday, Saturday and Sunday; a new week begins on Monday. Empty daily training slots remain no-ops.
- Agenda UI polish adds the week range, daily/weekly badges, clearer sections, a distinct Aulão card, and explanatory persistence text. This does not modify the broader Sale Smartly light-theme call-control work.
- The user explicitly approved the stable 3.5.2 promotion after testing the Beta 2 functionality. Remaining light-mode call-control visual work is deferred and must not be falsely recorded as fixed.
- Stable validation includes regression checks that 3.5.2 is newer than the 3.4.7, 3.4.8 and 3.5.0 updater baselines.
- No schema migration, account deletion, historical-data cleanup, or Storage migration is part of this release.
- The previous quota snapshot remains historical only: Log Ingestion 0.53/1 GB (53%). No live quota telemetry is exposed by the connected Supabase project tools in this session.
