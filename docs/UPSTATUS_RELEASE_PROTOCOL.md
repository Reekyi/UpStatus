# UpStatus — Release Protocol & Continuity

Last reviewed: 2026-11-27

## Current release state

- Official production version: **3.5.0**.
- GitHub default branch: `master`; official release merge commit: `a9019ada2ab4dae05540520eda04211b38a301c7` (PR #184).
- `release.json`: `version=3.5.0`, empty `preRelease`, stable installer `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus/upstatus.user.js`.
- Official Supabase function: `upstatus`, project `mvjqunhjxkbfcrxkjtgf`, deployment version **6**, status **ACTIVE**, `verify_jwt=false`, source hash `d4127ecf63de3e26901d4d4b306f03da38114605dfac1ef4ca2505b6e39240b9`.
- Official `/health` returned `ok:true`, version `3.5.0`; `/api/update-info` returned the matching stable update route. Served userscript reports `@version 3.5.0`, namespace `upseller`.
- No active candidate. Separate live-integration regression function `upstatus-test` remains ACTIVE at deployment version **4**, `3.5.0-beta.5`, hash `71c0446cfb0608b831088f8782f883198758561f809c496e82f0ed7c77f798b7`; it is not the official updater.
- Staging project `akbgmmpnnpwcwgcfrltw` remains available; the live-team beta was intentionally hosted in a distinct function in the production project to share team data/Realtime after Ricardo's explicit authorization.
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
6. **Deploy beta according to its integration mode:** default to the isolated Staging project `akbgmmpnnpwcwgcfrltw`. When the user explicitly requires interoperability with the live team, a dedicated `upstatus-test` Edge Function may be deployed in the production project, but never replace `upstatus`. In this mode, database, Storage, and Realtime are intentionally shared; local userscript namespace/storage prefix and function route remain separate. Confirm the runtime target, function slug, live API responses, member allowlist, and stable function health before handoff.
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
