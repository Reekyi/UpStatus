# Normal AUTH-03 isolated integration checkpoint — 2026-11-08

## Exact candidate and CI

- PR [#89](https://github.com/Reekyi/UpStatus/pull/89) remains Draft/open/unmerged.
- Branch: `fix/normal-auth03-build-safe-20261108`.
- Exact HEAD: `cd0c7e41bb32f7ab85efd4982ad24b9206c27953`.
- Base: PR #88 branch at `f04d18d780ffc355b6bad457b8a12ef9fe07f82b`.
- Comparison: 25 commits ahead, 0 behind; 21 changed files.
- Candidate workflow: [run 42485686643](https://github.com/Reekyi/UpStatus/actions/runs/42485686643) **SUCCESS** on the exact HEAD. The workflow now runs full offline Validate, the allowlisted AUTH-03 integration test, syntax checks, and cutover-guard regressions. It shares the `upstatus-signaling-isolated-tests` concurrency group with Normal/Team Lite fixture suites (`queue: max`, no cancellation).

### Earlier failure and correction

- Initial candidate run [42484629347](https://github.com/Reekyi/UpStatus/actions/runs/42484629347) failed at `scripts/chat-regression.test.mjs:106`. The assertion expected the pre-invite `existingRole/role` expression, while AUTH-03 now consumes the RPC result through `enrolledRole/sessionRole`.
- Updated only that stale assertion to require the actual invite-consumption role-preservation path and session creation.
- Exact follow-up run [42485555356](https://github.com/Reekyi/UpStatus/actions/runs/42485555356) passed full offline Validate and cutover-guard regressions on `a740361935b66fe21fbfbc863b3a3513075ee430`.
- The workflow was then extended to run the isolated integration suite on the latest exact HEAD `cd0c7e4`; no product runtime was deployed.

### AUTH-03 integration evidence

The integration step used:
- Exact allowlisted origin: `https://bfpjtfqlnypisxljoxkb.supabase.co`.
- Existing Actions secret `UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY` (value never logged).
- Explicit `UPSTATUS_AUTH_ALLOW_MUTATION=1`.
- A read-only REST preflight before any fixture writes.

[Run 42485686643](https://github.com/Reekyi/UpStatus/actions/runs/42485686643) passed:
- NULL/empty password eligibility and configured-account denial.
- Malformed, wrong, expired, and replayed token rejection.
- Exactly one winner under concurrent invite consumption.
- Blank/whitespace role fallback to `implementation_user`.
- Explicit role preservation and padded-admin non-escalation.
- Cleanup of every generated fixture.

The same run's full Validate passed static enrollment, build, sidecar preservation, production workflow/cutover guards, signed-upload client/server regressions, and chat regressions. The cutover diagnostic intentionally remains blocked because `release.json` still declares deployed version `3.4.7`; a new stable version greater than 3.4.7 has not been selected.

### Lab post-run verification — SELECT only

After the workflow completed:
- `public.users`: 0 rows.
- `__auth_test_*` fixtures: 0 rows.
- `public.messages`: 0 rows.
- Lab migration inventory: 38 records.
- `consume_upstatus_setup_invite(text,text,text)`: SECURITY INVOKER, empty `search_path`, EXECUTE for service_role only, no EXECUTE for anon/authenticated, unique token-hash index present.

The runner touched only its uniquely named allowlisted lab users and confirmed cleanup. No manual cleanup was needed.

### Production remains blocked and unchanged

- Production project `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven applied migrations.
- Production still has no setup-invite columns or `consume_upstatus_setup_invite` RPC.
- Production migration inventory remains the same seven versions through `20261027155438`.
- Supabase managed branch `main` reports `MIGRATIONS_FAILED` while the project and preview project report `ACTIVE_HEALTHY`. The failure cause is not exposed by the connected read-only tools; Supabase's branching troubleshooting guidance says to inspect Dashboard > Manage Branches > main > View logs. Do not infer that the production database itself is unhealthy from this branch status alone.
- The production cutover guard rejects reuse of 3.4.7. No version was selected and no production migration/deploy was run.

### Current related gates

- #74 Normal HEAD `9c0133e`: Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) and Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS.
- #76 Team Lite HEAD `eb28e88`: Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS.
- #85 HEAD `b75707b`: Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) SUCCESS; cutover remains blocked by AUTH-03/version gates.
- #88 HEAD `f04d18d`: guard [42478899179](https://github.com/Reekyi/UpStatus/actions/runs/42478899179) SUCCESS.
- #80 current HEAD `05d3336`: Validate [42485006825](https://github.com/Reekyi/UpStatus/actions/runs/42485006825) fails inherited `client signed upload helper missing` at `scripts/validate.mjs:55`.
- #82 current HEAD `c84b4a5`: Validate [42481111127](https://github.com/Reekyi/UpStatus/actions/runs/42481111127) fails inherited `production updateURL mismatch` at `scripts/validate.mjs:26`.
- Issue #78 remains 0/8 physical acceptance criteria.

No QA-owned branch or `docs/RELEASE_READINESS.md` was changed. No production SQL write, migration, deploy, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation occurred.
