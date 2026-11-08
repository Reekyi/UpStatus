# Normal API runtime generation and API-first production cutover guard

**Checkpoint:** 2026-11-08 08:01 BRT / 11:01 UTC  
**Repository:** `Reekyi/UpStatus`  
**Scope:** candidate-only build/workflow changes in PR #85. This checkpoint is not authorization to dispatch the workflow, deploy, merge, publish, or change production.

## Why this changed

The previous PR #85 cutover guard correctly blocked the current manifest: the Normal userscript distribution function is `upstatus`, while its API target is `upstatus-screen-share-3-1-1-beta10`. The workflow deployed only `upstatus`, and the beta10 source was not generated in the candidate build.

Beta10 remains operational and must not be retired by assumption. A read-only 24-hour query returned 468 available function log events, but all were concentrated between 2026-11-07 17:06:12 UTC and 18:31:42 UTC (about 1h25m): 467 requests to beta10 (157 status, 156 chat, 154 remote-status, all HTTP 200) and one `upstatus.user.js` fetch from `upstatus` (HTTP 200). This is not a complete 24-hour traffic sample.

## Candidate implementation

PR #85 now builds the Normal API runtime and distribution runtime from the same reviewed `src/server/index.template.ts` and the same production 3.4.7 userscript artifact:

- `supabase/functions/upstatus/index.ts`: distribution runtime, path marker `/upstatus`.
- `supabase/functions/upstatus-screen-share-3-1-1-beta10/index.ts`: API runtime, path marker `/upstatus-screen-share-3-1-1-beta10`.

The API runtime is generated during build; it is not a separately hand-maintained source file. The reviewed template and build logic are versioned. The build manifest continues to record the distribution function, API function, and exact API base separately.

The Validate contract now checks that both generated runtimes:
- carry the same stable version;
- embed the exact same userscript artifact;
- differ only by their function path marker;
- and that the userscript's `CLOUD_SERVER` targets beta10 while updater URLs continue to target `upstatus`.

The cutover guard now:
- requires both functions to have generated sources and deploy commands;
- requires the API function to deploy before the distribution function;
- rejects unexpected production function deploys (including `upstatus-test`);
- rejects a wrong project host or incomplete manifest.

The candidate production workflow remains `workflow_dispatch` only, requires `master` and the exact dispatch SHA, stable 3.4.7, read-only Management API project/organization/host preflight, pinned Supabase CLI 2.122.1, serialized deployment, and step-scoped credentials. Its deploy step now deploys beta10 first and `upstatus` second.

## Exact CI evidence

- PR #85 branch: `fix/master-release-script-url-20261107`.
- Exact HEAD: `26e234d93532615457f76deb525fef6d0b042672`.
- Validate: [42474461521](https://github.com/Reekyi/UpStatus/actions/runs/42474461521) **SUCCESS**.
- Log: `Built UpStatus 3.4.7 / TEST 3.4.7`; production workflow guard passed; cutover regression passed (aligned API-first accepted; missing API deploy/source, reversed order, unexpected TEST deploy, wrong host, and incomplete manifest blocked); generated distribution and API sources passed; signed-upload client/server and chat regressions passed; `Validation OK: PROD 3.4.7 / TEST 3.4.7`.

The Supabase Preview check was skipped because this GitHub branch is not associated with a Supabase Branch. No Supabase branch, preview database, or workflow deployment was created.

## Compatibility boundary

This is the PR #85 stable 3.4.7 maintenance/cutover candidate. It is not a merge or cherry-pick of the much larger Normal signaling candidate #74. The #85 server template retains its current 30-second warm-instance session-cache behavior and does not introduce a production authenticated-signaling endpoint. The userscripts' authenticated signaling transport remains opt-in/default-off; the legacy Realtime dependency is not removed by this change.

Team Lite remains a separate release line: candidate userscript 3.4.31 versus deployed runtime v15 / 3.4.30. No Team Lite artifact or runtime was changed.

## Live production read-only snapshot

- Production project `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 ACTIVE Edge Functions.
- Operational function versions: `upstatus` v480, beta10 v6, `upstatus-team-lite` v15, `upstatus-test` v281.
- The four operational runtimes still use name-only authorization for `/api/chat/clear`; candidate templates contain the stored-role guard, but no runtime was updated.
- SQL SELECT-only snapshot: five users; three SECURITY DEFINER broadcast functions still executable by anon/authenticated; seven Realtime partitions / 50 rows; SQL role `postgres`, not superuser and not a member of `supabase_admin`.
- Security Advisor: three anon SECURITY DEFINER WARN, three authenticated SECURITY DEFINER WARN, and ten RLS-enabled/no-policy INFO findings.
- No third full-product TEST project exists. The isolated project remains a signaling/auth lab, not a full product environment.

## Current unrelated gates

- Normal #74 exact HEAD `9c0133e`: Validate and Signaling Smoke PASS.
- Team Lite #76 exact HEAD `eb28e88`: Candidate Checks PASS (16/16 unauthenticated, 110/110 authenticated).
- #75 remains historical baseline PASS.
- #80 latest Validate [42470360811](https://github.com/Reekyi/UpStatus/actions/runs/42470360811) fails at inherited develop assertion `client signed upload helper missing` (line 55).
- #82 latest Validate [42471757403](https://github.com/Reekyi/UpStatus/actions/runs/42471757403) fails at inherited master assertion `production updateURL mismatch` (line 26). QA branch and `docs/RELEASE_READINESS.md` were not modified.
- #78 remains OPEN with 0/8 physical acceptance criteria.
- All PRs remain Draft/open/unmerged and have no human review submissions.

## Safety record

No production SQL write, migration, Edge Function deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change, function deactivation, fixture mutation, or destructive operation was performed. The production project was read-only. The PR #85 workflow was edited but not dispatched.


## 2026-11-08 08:18 BRT — AUTH-03 is now an explicit production cutover gate

A read-only comparison of live beta10 v6 with the PR #85 server template found the same extracted route paths, path prefixes, table identifiers and RPC identifiers. That does not prove semantic parity: the live beta10 setup handler still permits first-caller setup for an account with an empty password and assigns admin by a hard-coded name list. The #85 template removes that name-based role assignment, but still has no one-time setup token, no admin-issued invite route, and no atomic invite-consumption RPC. This remains an onboarding takeover risk for future uninitialized accounts.

Production SELECT confirms five users, zero uninitialized passwords, zero blank roles, three explicit admins and two implementation users. The setup-invite table and RPC are absent; production has only seven migrations (through `20261027155438`). The current accounts are initialized, but this does not make the first-caller setup design safe for future enrollment.

PR #85 was hardened so `verify-production-cutover.mjs --enforce` now requires the AUTH-03 invite flow, stored-role chat-clear authorization, and the three versioned migration sources (`20261107010000`, `20261107060000`, `20261107062000`). It also rejects name-based admin assignment and any automatic `supabase db push` / migration-up command in the production workflow. The workflow remains API-first and manual-only.

Exact PR #85 HEAD: `7e84c31772b82437529addd96bf11490e1286e31`. Validate [42475050634](https://github.com/Reekyi/UpStatus/actions/runs/42475050634) **SUCCESS**. The log intentionally reports `PRODUCTION CUTOVER BLOCKED` because the #85 template lacks AUTH-03 and the three migration sources. This is an expected release gate, not a CI failure. The synthetic regression verifies the aligned secure case and all negative cases.

The full AUTH-03 implementation and `auth-enrollment.test.mjs` exist on the larger Normal candidate #74, but have not been ported into the stable 3.4.7 #85 line. Do not merge the two lines casually. Porting AUTH-03 requires a reviewed client/server change and separately authorized production migrations; the deploy workflow must not apply migrations itself.

No production write, migration, deploy, workflow dispatch, merge, release, publication, secret/role/grant/ACL/policy/feature-flag change or destructive operation occurred. QA-owned files and `docs/RELEASE_READINESS.md` remain untouched.


## Follow-up — AUTH-03 test wiring is also required (2026-11-08 08:20 BRT)

The cutover gate now also requires `scripts/auth-enrollment.test.mjs` to exist and be invoked by `scripts/validate.mjs`, in addition to the admin-issued 256-bit invite, atomic RPC consumption, stored-role preservation, no first-caller claim, stored-role chat-clear, and all three migration source files. It rejects a production workflow that tries to apply migrations automatically.

PR #85 exact HEAD: `b75707b6eaf678d87863144748b9aed8e2866455`. Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) **SUCCESS**. The guard intentionally blocks the current #85 candidate on five missing AUTH-03 items: setup flow, wired regression test, and the three migration sources. This is an expected release gate, not a CI failure. The #74 branch contains the complete auth-enrollment test and migration sources, but they have not been ported to #85.

No production migration/deploy/dispatch occurred; production remains at seven applied migrations with no setup-invite table or RPC. The workflow does not and must not run `db push`.
