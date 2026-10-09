# UpStatus Project Guide

## Purpose

This document is the durable operating manual for continuing UpStatus work across ChatGPT conversations. The repository is the source of truth for code and release history; Supabase is runtime infrastructure; Vercel serves the Lucca portal; userscripts run in Tampermonkey.

## Current project layout

- `lucca-site/index.html`: Lucca guest chat and call portal.
- `src/userscript/upstatus.user.template.js`: source template for the main UpStatus userscript, including chat and WebRTC call behavior.
- `src/server/index.template.ts`: Supabase Edge Function template that serves the generated userscript and API.
- `scripts/build.mjs`: generates userscripts and deployable Supabase function source from templates and `release.json`.
- `scripts/validate.mjs`: builds artifacts and runs source/version/syntax consistency checks.
- `release.json`: authoritative userscript version and prerelease label. Change this rather than hardcoding versions in generated artifacts.
- `supabase/functions/upstatus` and `supabase/functions/upstatus-test`: generated deployment outputs, not the preferred source of edits.

## Branch and release model

- `master` is the production/stable line.
- `develop` is the integration and TEST line.
- Feature and documentation branches should normally start from `develop`, and PRs should target `develop`.
- Production deployment is manual and must never be triggered without explicit user approval.
- TEST deployment is separate and must use the TEST function and identifiers.
- Never deploy TEST changes to the production function, or production identifiers to TEST.

## Required workflow for every change

1. **Inspect first.** Read these documents, inspect the current branch/commit, related source, recent PRs, deployment state, and relevant logs/checks before editing. Do not assume a prior conversation's state is still current.
2. **Scope narrowly.** Identify the actual cause and the smallest safe change. Preserve unrelated behavior and shared history/data.
3. **Isolate.** Create a descriptive branch from `develop` unless the user explicitly requests another release path.
4. **Implement source-first.** Edit source templates and intended source files, not generated artifacts, unless the task specifically concerns generated output.
5. **Validate.** Run `node scripts/validate.mjs` and `node scripts/build.mjs` where a working checkout is available. Check syntax, version consistency, source diffs, and CI status. If tools cannot run a test, state that limitation clearly and never claim it passed.
6. **Review.** Inspect the final diff for accidental edits, secrets, destructive data operations, wrong environments, and scope creep.
7. **PR before integration.** Open a PR with a useful summary and validation evidence. Do not merge, deploy, or modify production resources without explicit user approval, except where the user has explicitly authorized that specific action in the current task.
8. **Verify actual state.** After an authorized merge/deploy, check the resulting commit, CI/deployment status, active Supabase function version, Vercel deployment, and relevant served content when possible. Distinguish code checks from real-world functional testing.
9. **Update continuity records.** Update `docs/CURRENT_STATE.md` as part of every meaningful completed task and include any newly discovered constraints in this guide only when they are durable.

## Quality and safety rules

- Never promise a bug is fixed solely because code was changed. Separate source validation, CI validation, deployed state, and real user/browser testing.
- For WebRTC/call changes, inspect signaling subscription/readiness, offer/answer handling, ICE candidate queuing, peer lifecycle, audio permission/autoplay, and failure/retry behavior. STUN does not guarantee connectivity on every network; TURN may be needed.
- Avoid destructive database or chat-history operations. Preserve shared history and user data unless the user explicitly asks otherwise.
- Never expose secrets, tokens, passwords, or service-role keys in code, logs, PRs, or docs.
- Prefer idempotent recovery and clear error messages over silent failure or instructions to refresh the page.
- Keep UI changes scoped to the requested surface.
- If production changes are necessary, state exactly what will change and request approval before publishing.
- Do not use Supabase as the only source of project documentation. Keep source, rationale, and history in GitHub.
- Be candid about limitations and any tests that were not run.

## End-of-task / end-of-chat handoff protocol

Before a conversation ends, before switching to another chat, or after a significant implementation:
1. Update `docs/CURRENT_STATE.md` with the verified commit/branch, task result, PR status, deployments, test evidence, open risks, and next concrete action.
2. Keep the permanent prompt stable. The prompt should direct the next chat to read this guide and the current-state file, then verify live repository/runtime state before acting.
3. Leave a concise "bonfire note" in the current-state file: what was done, what is safe to assume, what must be rechecked, and the next step.
4. Never write unverified claims as facts. If deployment or tests are pending, label them pending.
5. If the conversation is running low on context, prioritize updating the handoff record over a long recap in chat.

## Permanent new-chat prompt

Copy/paste the following into a new ChatGPT conversation, with GitHub and Supabase connectors enabled:

> Continue work on UpStatus. Repository: https://github.com/Reekyi/UpStatus. First read `docs/PROJECT_GUIDE.md` and `docs/CURRENT_STATE.md` from the `develop` branch using @GitHub (these continuity docs may not yet exist on `master`). Then verify the actual current branch/commit, relevant PRs/checks, and any relevant Supabase/Vercel runtime state using the connected tools. Treat GitHub as the source of truth for code and release history, and runtime tools as the source of truth for deployment state. Do not assume prior chat memory is current. Follow the documented workflow exactly: investigate first, make narrow source-first changes on an isolated branch, validate and review the diff, open a PR, and do not merge or deploy to production without my explicit approval. Never claim a test or deployment succeeded unless verified. Preserve existing features and user data. At the end of each meaningful task, update `docs/CURRENT_STATE.md` with verified results, tests, PR/deployment status, risks, and the next step. If something is unclear, inspect first and ask one focused question rather than guessing.
