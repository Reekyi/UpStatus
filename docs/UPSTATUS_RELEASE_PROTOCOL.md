# UpStatus — Release Protocol & Continuity

Last reviewed: 2026-11-27

## Current release state

- Official production version: **3.4.9**
- Current beta: **none**
- Next planned beta, when new work is requested: **3.5.0-beta.1**
- Stable baseline: GitHub `master` at release commit `fb3c6e0bbce9652a48f6f36e8437154c45ec1aac` (release 3.4.9).
- Never infer that a version is deployed merely because a commit or manifest exists. Verify the GitHub release ref/manifest and the live Supabase deployment before claiming deployment state.

## Mandatory new-chat onboarding

At the beginning of every new UpStatus conversation:

1. Read this file on GitHub first.
2. Inspect repository metadata, default branch, recent commits, branches, tags/releases and working tree-relevant files.
3. Read `README.md`, `release.json`, `CHANGELOG.md`, `package.json`, build/validation scripts and deployment workflows. Inspect the actual feature source relevant to the requested change.
4. Inspect both Supabase projects in organization **UpStatus Revived**:
   - Production: `upstatus-normal`, ref `mvjqunhjxkbfcrxkjtgf`.
   - Staging: `UpStatus Staging`, ref `akbgmmpnnpwcwgcfrltw`.
   - Check project health, Edge Functions, migrations, tables, and relevant logs/advisors as appropriate.
5. Reconcile observed facts with this protocol. If live GitHub/Supabase state disagrees with this file, report the discrepancy and treat live deployed state as authoritative for what's actually running. Update this file when release state changes.
6. Do not begin implementation until you understand the existing architecture and the last changes. Reuse the existing project; do not rebuild or reorganize unrelated pieces.

## Versioning rules

- Stable versions use SemVer: `MAJOR.MINOR.PATCH`.
- Beta versions for a new stable target use `MAJOR.MINOR.PATCH-beta.N` (for example, after 3.4.9, first beta is `3.5.0-beta.1`, then `3.5.0-beta.2`).
- Keep official and beta versions explicitly tracked in this file, `release.json`, and `CHANGELOG.md`.
- Do not mark a beta as stable or advance the official version until Ricardo explicitly tests and approves it.
- When an approved beta is promoted, publish the matching stable version (e.g. beta.1 -> 3.5.0), record it in the changelog, and update this file.
- A new independent feature/fix after a stable release starts the next beta sequence at beta.1 unless continuing the same active beta cycle.
- Do not silently reset or reuse beta numbers. If a beta is rejected, record it as rejected and move to the next beta number for further attempts.

## Mandatory development and release workflow

1. **Understand and plan:** identify requested behavior, affected client/server/database paths, regression risks, and test plan. State what will and will not change.
2. **Protect production:** never use production as the experimental environment. Never deploy beta code to the production Supabase project or stable userscript URL.
3. **Isolate work:** make a dedicated branch from the verified stable baseline or current approved integration base. Keep `master` stable. Use `develop` only for integration when appropriate; use focused feature/beta branches for implementation.
4. **Build beta:** update the single version source `release.json` according to existing build conventions and generate artifacts via the repository build scripts. Beta output must be unmistakably labeled `-beta.N`.
5. **Validate before deploying:** run `npm run validate` (which includes build, syntax checks, client/server artifact parity, and regression tests). Add focused regression tests for the requested change. Inspect the generated diff and ensure no unrelated changes or production identifiers drift.
6. **Deploy to staging only:** deploy the beta to Supabase project `akbgmmpnnpwcwgcfrltw` and the isolated TEST function/artifacts using the repository's validated test deployment mechanism. Confirm the deployed function version/status and test URL. Verify that storage prefixes, Realtime topics, ringtone channels, userscript namespace, updater URL, and all other TEST identifiers are isolated from production.
7. **Hand over for user testing:** provide the exact beta version, installation/update URL, deployment status, changes, test checklist, known risks and rollback approach. Be explicit when something could not be verified.
8. **Wait for explicit approval:** user phrases such as “aprovado”, “pode lançar oficial”, or equivalent are required before stable promotion. A general “testei” is not approval unless it clearly says the beta is accepted.
9. **Promote safely:** after explicit approval, review the final diff, merge the approved changes into `master`, update stable version and changelog, run full validation again, deploy production only using the production workflow, verify the live production endpoint, then update this protocol with the new official version and no active beta.
10. **Rollback:** if staging testing fails, keep production unchanged, record the beta as rejected, fix on a new beta iteration and deploy only to staging. If a production issue occurs after promotion, stop further changes, inspect the last known-good release and prepare a deliberate rollback; do not force-push or destructively rewrite history.

## Architecture and environment guardrails

- GitHub is the source of truth for code, version manifests and release history.
- Supabase projects are runtime environments; staging is for beta testing, production serves stable users.
- Production Supabase project: `mvjqunhjxkbfcrxkjtgf` (`upstatus-normal`).
- Staging Supabase project: `akbgmmpnnpwcwgcfrltw` (`UpStatus Staging`).
- Production Edge Function is `upstatus`; staging/test Edge Function naming and deployment must follow the existing repository build/test architecture. Do not assume a staging function's endpoint or source path; inspect it.
- Existing README describes `master` as stable and `develop` as integration/TEST. Confirm current workflow behavior before relying on this, because workflow files and release guards can lag behind the current version.
- Existing generated build logic includes separate production and TEST artifacts and isolation identifiers. Preserve backward compatibility with production storage, Realtime and ringtone identifiers unless a specific migration is designed and tested.
- Never put secrets, tokens, passwords, service-role keys or private user data into GitHub, source files, logs, handoff notes or this document.
- Do not expose Supabase service-role/secret keys in userscripts or browser code.
- For database schema changes, inspect tables, RLS and migrations first. Prefer additive, reversible migrations; avoid destructive changes without explaining consequences and receiving explicit user authorization. Verify schema and security after changes.
- Do not create new Supabase projects or branches that could incur cost without checking the actual cost and receiving explicit user consent.
- Do not deploy an Edge Function simply because it was edited; confirm target project and exact function name first.

## Required communication style for UpStatus work

- Be transparent and factual. Never claim a build, test, deployment, version, rollback or verification succeeded unless tool output or test evidence confirms it.
- Before any production-impacting operation, explain exactly what will change and obtain Ricardo's explicit approval.
- Prefer doing the work and delivering a tested result over giving only instructions, when repository and connector access permit.
- Keep a continuously updated status:
  - official version;
  - beta version/status;
  - working branch;
  - latest commit;
  - staging deployment status;
  - production deployment status;
  - tests run and results;
  - pending user tests/approval.
- After each meaningful release-state change, update this document and the changelog/version manifest as applicable. Use commit history as the audit trail.

## State at this checkpoint

- 2026-11-27: GitHub default branch `master`; latest inspected commit is `fb3c6e0bbce9652a48f6f36e8437154c45ec1aac`, message “Fix UpStatus updater network failures”, which records release 3.4.9.
- `release.json` on `master`: `version=3.4.9`, empty `preRelease`.
- Production project `upstatus-normal` is healthy; its `upstatus` Edge Function is active (deployed function version observed as 5).
- Staging project `UpStatus Staging` is healthy; its own `upstatus` and validation functions are active. Staging tables currently show empty application history/message datasets, as expected for a separate test environment.
- No active 3.5.0 beta has been created or deployed at this checkpoint.
- The repository's current production workflow still contains a hard-coded stable version guard for 3.4.7, while `release.json` is 3.4.9. This is a stale configuration that must be corrected and validated as part of release-pipeline hardening before a later official promotion. Do not bypass the guard or deploy production until it is resolved and verified.
- The README workflow description and checked-in deployment workflow need reconciliation with actual Supabase project refs and TEST function naming before relying on automated deployment. Inspect exact files and workflow configuration during the first release-pipeline update.
