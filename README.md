# UpStatus

## AI agent / new-chat onboarding

For every new AI-assisted task, first read [`AGENTS.md`](AGENTS.md), then [`docs/UPSTATUS_RELEASE_PROTOCOL.md`](docs/UPSTATUS_RELEASE_PROTOCOL.md). When starting a fresh ChatGPT conversation, paste [`docs/UPSTATUS_NEW_CHAT_PROMPT.md`](docs/UPSTATUS_NEW_CHAT_PROMPT.md) as the first message. The prompt requires live GitHub and Supabase inspection before work begins. Repository files cannot automatically force a blank ChatGPT conversation to load them.

## Current release checkpoint

- Official: **3.5.0** (master and production; unchanged).
- Active candidate: **3.5.1-beta.1**, branch `beta/3.5.1-beta.1-ui-fixes`, isolated in the existing Staging project.
- Production `upstatus-test` remains on **3.5.0-beta.5** for live-team regression/reference testing and is not used by this candidate.
- Beta TEST URL: `https://akbgmmpnnpwcwgcfrltw.supabase.co/functions/v1/upstatus-test/upstatus.user.js`
- The candidate has its own Edge Function, namespace, storage prefix, Realtime topic and ringtone coordination; stable production functions and URLs are unchanged.
- Verify live `release.json`, Git refs, and Supabase deployments before relying on this snapshot.

## Supabase environments

- Production: `upstatus-normal`, project ref `mvjqunhjxkbfcrxkjtgf`.
- Staging: `UpStatus Staging`, project ref `akbgmmpnnpwcwgcfrltw`.
- Do not create projects or database branches without explicit cost review and user authorization.

## Free-plan quota guardrails

The latest user-provided 2026-11-27 pre-deploy screenshot showed Log Ingestion at **0.53/1 GB (53%)** (previous same-day screenshot: 0.45/1 GB, 45%). This is a snapshot, not live telemetry. Read the quota-protection section in the release protocol before changes. No verbose per-request logs, unnecessary polling, broad log dumps, or unbounded queries. At 70% freeze nonessential growth; at 80% stop beta deploys until mitigated; at 90% hard stop changes that can increase usage. Never knowingly exceed a Free-plan limit.

## Release model

GitHub is the source of truth for code and release history. Supabase is the runtime. Tampermonkey consumes the generated userscript.

- `master`: stable/production line.
- Confirm the current integration and TEST branch/workflow configuration before use; do not assume stale documentation is correct.
- Production deployment is manual and requires explicit user approval.
- New work normally starts as a beta in the existing Staging Supabase project. When Ricardo explicitly requests live-team interoperability, a separate `upstatus-test` function may run inside the production project while the official `upstatus` function remains untouched.

## Versioning

Edit only `release.json` as the version source, following the build scripts' conventions. Stable versions use `MAJOR.MINOR.PATCH`; beta versions use `MAJOR.MINOR.PATCH-beta.N`. For the next release target, derive the next beta number from the current stable version and live GitHub branches/tags/manifests. Never reuse a rejected beta number.

## Local verification

Inspect `package.json` for actual scripts. The repository validation script is `node scripts/validate.mjs`; it builds artifacts and runs syntax and regression checks.

## Release flow

Plan → isolated beta branch → build → validation/regression tests → quota review → beta deployment in the approved integration mode → Ricardo's manual test → explicit approval → stable promotion → production validation.

Never deploy beta code to the official `upstatus` function or stable userscript URL. A separate `upstatus-test` function in the production project is allowed only with Ricardo's explicit live-integration authorization.

## 3.5.0 release record (2026-11-27)

- Official GitHub merge commit: `a9019ada2ab4dae05540520eda04211b38a301c7` (PR #184).
- Official Supabase function: `upstatus`, deployment version 6, ACTIVE, source hash `d4127ecf63de3e26901d4d4b306f03da38114605dfac1ef4ca2505b6e39240b9`.
- Official health endpoint returned `3.5.0`; served userscript header reports `@version 3.5.0`, namespace `upseller`.
- Separate test function `upstatus-test` remains ACTIVE at deployment version 4 / `3.5.0-beta.5`, source hash `71c0446cfb0608b831088f8782f883198758561f809c496e82f0ed7c77f798b7`.
- Ricardo confirmed own status change and remote status change in Guilherme's Sale Smartly session without F5. Transient UpStatus and chat error notices now fade/slide away after 3 seconds. The persistent connection-state indicator intentionally remains visible.
- The 2026-11-27 pre-deploy quota screenshot showed Log Ingestion at 0.53/1 GB (53%). This is historical snapshot data, not a post-deploy live reading.
