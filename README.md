# UpStatus

## AI agent / new-chat onboarding

For every new AI-assisted task, first read [`AGENTS.md`](AGENTS.md), then [`docs/UPSTATUS_RELEASE_PROTOCOL.md`](docs/UPSTATUS_RELEASE_PROTOCOL.md). When starting a fresh ChatGPT conversation, paste [`docs/UPSTATUS_NEW_CHAT_PROMPT.md`](docs/UPSTATUS_NEW_CHAT_PROMPT.md) as the first message. The prompt requires live GitHub and Supabase inspection before work begins. Repository files cannot automatically force a blank ChatGPT conversation to load them.

## Current release checkpoint

- Official: **3.4.9**
- Deployed beta: **3.5.0-beta.5** (dedicated `upstatus-test` function; manual cross-user visual validation pending)
- Previous beta: **3.5.0-beta.4**
- Next beta if Beta 5 is rejected: **3.5.0-beta.6**
- Beta TEST URL: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-test/upstatus.user.js`
- The beta uses its own Edge Function, namespace and local storage prefix; the stable `upstatus` function and stable userscript URL are unchanged.
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
- All new work must first be released as a beta to the existing Staging Supabase project.

## Versioning

Edit only `release.json` as the version source, following the build scripts' conventions. Stable versions use `MAJOR.MINOR.PATCH`; beta versions use `MAJOR.MINOR.PATCH-beta.N`. After official 3.4.9, the next new beta target is 3.5.0-beta.1 unless live repository history proves a later beta number is already in use. Never reuse a rejected beta number.

## Local verification

Inspect `package.json` for actual scripts. The repository validation script is `node scripts/validate.mjs`; it builds artifacts and runs syntax and regression checks.

## Release flow

Plan → isolated beta branch → build → validation/regression tests → quota review → deploy to Staging only → Ricardo's manual test → explicit approval → stable promotion → production validation.

Never deploy beta code to the production Supabase project or stable userscript URL.