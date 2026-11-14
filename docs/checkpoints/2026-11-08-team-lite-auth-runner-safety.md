# Team Lite AUTH-03 fixture-runner hardening — 2026-11-08

## Scope and exact candidate

A small safety-only candidate was created from the exact Team Lite #76 HEAD:

- Base #76 HEAD: `eb28e88325d7e8a6236d9050bebabf794d64a8c4`.
- PR [#90](https://github.com/Reekyi/UpStatus/pull/90), stacked on #76, remains OPEN/Draft/unmerged.
- Branch: `fix/team-lite-auth-runner-redirect-guard-20261108`.
- Exact HEAD: `47e0b8760587e52448cf5954d823b00131b941fa`.
- Comparison: 4 commits ahead / 0 behind the #76 head; four files changed.

## Finding

The Team Lite AUTH-03 fixture runner uses the exact allowlisted lab origin and explicit `UPSTATUS_AUTH_ALLOW_MUTATION=1`, but its PostgREST `fetch` did not set `redirect: "error"`. The shared project preflight already rejected redirects. The fixture requests carry service-role `apikey` and `Authorization` headers, so the runner should also fail closed rather than follow an unexpected redirect.

The shared mutation guard's denial text named only `UPSTATUS_SIGNAL_ALLOW_MUTATION`, although the Team Lite AUTH-03 runner passes `UPSTATUS_AUTH_ALLOW_MUTATION`. This was a diagnostic mismatch, not a bypass: the helper receives the opt-in value explicitly and still rejects anything other than `"1"`.

## Candidate changes

- Added `redirect: "error"` to every PostgREST request in `scripts/test-auth-enrollment.mjs`.
- Changed the shared helper diagnostic to refer to the runner-specific `UPSTATUS_*_ALLOW_MUTATION=1` opt-in.
- Extended `scripts/isolation-guard.test.mjs` to verify AUTH opt-in wiring and redirect rejection in both the read-only preflight and fixture runner.
- Added a push-only offline workflow `.github/workflows/team-lite-auth-runner-safety.yml`. It uses no Supabase secret and makes no network/fixture calls.

## Exact-head validation

[Workflow 42487717033](https://github.com/Reekyi/UpStatus/actions/runs/42487717033) **SUCCESS** on exact HEAD `47e0b8760587e52448cf5954d823b00131b941fa`, Node v24.22.2:

- `node --check` passed for the helper, fixture runner and isolation test.
- `isolation-guard.test.mjs` passed the exact-origin, explicit opt-in and redirect assertions.
- `auth-enrollment.test.mjs team-lite` passed route, token-handling, role-preservation and offline VM checks.

This run was offline-only. It did not contact Supabase, create fixtures, or repeat the live integration suite. The earlier Team Lite Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) remains the evidence for the live AUTH-03 integration on base #76; the #90 change only hardens the test runner's redirect behavior and diagnostic.

## Current product and environment gates

Fresh read-only checks at 2026-11-08 14:01 UTC:

- Organization still contains only production `dlfvkawaiqduhlazsszm` and isolated lab `bfpjtfqlnypisxljoxkb`; no TEST full-product project.
- Production: ACTIVE_HEALTHY, 7 applied migrations through `20261027155438`, 38 ACTIVE functions, 5 users (3 admins), zero uninitialized passwords/blank roles, zero AUTH-03 columns and no `consume_upstatus_setup_invite` RPC.
- Four operational production runtimes remain upstatus v480, beta10 v6, Team Lite v15 and TEST v281. Their deployed sources still contain first-caller setup and name-based authorization fallbacks.
- Production managed branch `main` reports `MIGRATIONS_FAILED` while the project and preview status are ACTIVE_HEALTHY; the root cause still requires Dashboard > Manage Branches > main > View logs.
- Lab: ACTIVE_HEALTHY, 38 migrations, zero users/messages, four setup-invite columns and the RPC present. `upstatus-signal-test` remains v32 and does not recognize `VOICE_ATTEMPT_ALREADY_ACTIVE` for HTTP 409.
- Production security gates remain open: three public SECURITY DEFINER broadcasts, excessive client grants on nine of ten audited backend tables, broad default ACLs, public Storage buckets without object policies.
- `release.json` remains 3.4.7; the #89 production migration-history gate correctly blocks because production has only seven migrations and lacks all three AUTH-03 migrations. No stable version above 3.4.7 has been selected.

## Coordination and safety

The current QA release-readiness document already records #89 at exact HEAD `4224dc31683d4b235e52d2ddcece1570294763f0` and exact-head workflow [42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) SUCCESS. This checkpoint adds the #90 Team Lite test-harness finding without modifying the QA-owned branch or `docs/RELEASE_READINESS.md`.

Issue #78 remains 0/8 physical acceptance criteria. Issue #79 remains open; its body checklist is not reconciled with the newer comments.

No production SQL write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation occurred. Production and lab database checks were SELECT/catalog-only; the new #90 workflow was offline-only.
