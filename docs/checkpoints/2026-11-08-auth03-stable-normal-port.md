# Normal AUTH-03 port and release cutover checkpoint — 2026-11-08

## Candidate work

A new stacked Draft PR was opened: [#89 — Port Normal AUTH-03 enrollment and harden release cutover](https://github.com/Reekyi/UpStatus/pull/89).

- Branch: `fix/normal-auth03-build-safe-20261108`
- HEAD: `d5a4d445571507e433d9f86a6f120054f6cf2736`
- Base: PR #88 branch `fix/production-cutover-guard-auth-delete-wiring-20261108`, HEAD `f04d18d780ffc355b6bad457b8a12ef9fe07f82b`
- Ahead/behind: 23 / 0
- Changed files: 20
- Draft; no merge, no review approval.

### Changes in #89

1. Ported the Normal admin-issued setup-invite flow from #74 into the stable production template:
   - 256-bit random one-time token.
   - Only the token hash is stored.
   - 15-minute expiry.
   - Atomic consumption through `consume_upstatus_setup_invite`.
   - Persisted roles are preserved; blank roles normalize to `implementation_user`.
   - No first-caller account claim.
   - Public `/api/account?name=...` setup enumeration is replaced with a non-enumerating response.
   - Invite issuance is behind authenticated context and the persisted `implementation_admin` role.
2. Ported the Normal login UI token field and removed plaintext password persistence. A startup cleanup deletes legacy namespaced password keys using `GM_listValues` / `GM_deleteValue`.
3. Added three production migration sources and three matching isolated test-migration files. They are source-only in this PR and were not applied to any project.
4. Added `scripts/auth-enrollment.test.mjs normal` as a standalone Validate invocation.
5. Added an integration runner guarded by an exact allowlist for `https://bfpjtfqlnypisxljoxkb.supabase.co` and explicit `UPSTATUS_AUTH_ALLOW_MUTATION=1`. It was not run in this checkpoint.
6. Changed the build writer to preserve tracked files in the Supabase function directory rather than recursively deleting the directory. Added a sidecar-preservation regression for `index_v25_loader.ts` and `backend_v25_bundle.ts`.
7. Extended the cutover guard to reject reuse of the currently deployed userscript version 3.4.7 and any prerelease. `release.json` intentionally remains 3.4.7; no new version was selected. The cutover must remain blocked until an explicitly approved stable version greater than 3.4.7 is chosen.

### CI status and limitation

No workflow run is visible for #89 at this HEAD. The repository's general Validate workflow only triggers for PRs targeting `master` or `develop`; #89 targets the #88 candidate branch. The candidate guard workflow is push-only, and no run is currently visible on its Actions page for this branch. Therefore **no CI PASS is claimed for #89**. The offline AUTH-03 and build-sidecar regressions are wired, but their execution remains unverified until a workflow is triggered on this exact HEAD.

## Current PR / CI snapshot

| PR | Current HEAD | Exact-head evidence |
|---|---|---|
| #74 Normal | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Validate 42451736696 PASS; Signaling Smoke 42451736729 PASS (136/136 authenticated) |
| #75 Baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks 41674353127 PASS (historical baseline) |
| #76 Team Lite | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Candidate Checks 42450476433 PASS (110/110 authenticated) |
| #80 Continuity | `552c8e638ef0b5a0f8ba02c94eef7742ddf391c9` | Validate 42478945124 FAIL: inherited `client signed upload helper missing`, `scripts/validate.mjs:55` |
| #82 QA | `c84b4a5fb3273bf452af6d78ba337fe05ae4f637` | Validate 42481111127 FAIL: inherited `production updateURL mismatch`, `scripts/validate.mjs:26` |
| #84 TEST isolation | `e214b9579a8fb8c4cd47b05216c7c90875aae803` | Validate 39423691656 PASS |
| #85 Production guard | `b75707b6eaf678d87863144748b9aed8e2866455` | Validate 42475230911 PASS; production cutover remains blocked by missing AUTH-03 |
| #88 Guard hardening | `f04d18d780ffc355b6bad457b8a12ef9fe07f82b` | Guard run 42478899179 SUCCESS |
| #89 AUTH-03 port | `d5a4d445571507e433d9f86a6f120054f6cf2736` | No visible run; pending validation |

All candidate PRs remain open and Draft. The #80/#82 failures are inherited baseline assertions; no validator assertion was weakened.

## Fresh Supabase read-only snapshot

### Production `dlfvkawaiqduhlazsszm`

- Project status: `ACTIVE_HEALTHY`.
- PostgreSQL 17.11.0.002; 7 migrations; 38 ACTIVE Edge Functions.
- Supabase branch `main` reports `MIGRATIONS_FAILED` while the project itself remains `ACTIVE_HEALTHY`. The root cause of the branch status was not investigated in this run.
- Operational runtimes: `upstatus` v480, beta10 v6, `upstatus-team-lite` v15, `upstatus-test` v281.
- Recovered current source for all four operational functions still contains first-caller setup, name-based admin-role fallback, name-only chat clear, and name-based message-delete fallback. None contains the setup-invite RPC.
- Read-only SQL: 5 users, 3 persisted admins, 0 uninitialized passwords, 0 blank roles, 0 setup-invite columns, 0 `consume_upstatus_setup_invite` RPCs.
- Security Advisor: 3 SECURITY DEFINER warnings for anon, 3 for authenticated, and 10 RLS-without-policy informational findings. The three public broadcasts and excess backend-table grants remain release blockers.

### Isolated lab `bfpjtfqlnypisxljoxkb`

- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.11.0.003; 38 migrations; 2 Edge Functions.
- Read-only SQL: 0 users, both setup-invite columns present, and one `consume_upstatus_setup_invite` RPC. Lab migration history uses lab-specific versions including 20261107060755, 20261107060758, 20261107061239, and 20261107061242.
- `upstatus-signal-test` remains v32 and does not recognize `VOICE_ATTEMPT_ALREADY_ACTIVE`; only the older conflict code is mapped.
- No test runner was executed and no fixture writes were performed.

## Remaining gates

1. Trigger and inspect CI for #89 on its exact HEAD; do not infer success from source wiring.
2. Run the isolated AUTH-03 integration runner only after validating the exact lab target and explicit mutation opt-in; verify cleanup.
3. Keep production migrations unapplied until Ricardo authorizes a reviewed rollout plan. Add a read-only production migration preflight before any future deployment.
4. Select a new stable userscript version greater than 3.4.7 before any release candidate can pass the version gate.
5. Resolve RT-01 / ACL-02, AUTH-02, AUTH-03 rollout, TEST full-product, and the Normal/beta10 coordinated cutover.
6. Complete the physical acceptance checklist in issue #78 (still 0/8).
7. Obtain human reviews and reconcile the QA release-readiness references without modifying the independent QA branch.

## Safety

Production was read-only throughout. No SQL write, migration, Edge Function deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation occurred. The lab was also read-only during this checkpoint.
