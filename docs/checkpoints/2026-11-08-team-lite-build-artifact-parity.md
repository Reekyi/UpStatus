# Team Lite generated API artifact parity — 2026-11-08

## Exact candidate

[PR #91](https://github.com/Reekyi/UpStatus/pull/91) is a Draft follow-up stacked on Team Lite #76.

- Base #76 HEAD: `eb28e88325d7e8a6236d9050bebabf794d64a8c4`.
- Branch: `test/team-lite-built-runtime-parity-20261108`.
- Exact HEAD: `cb65cb831910d384715addf98285d01a273e2c6a`.
- Comparison: 4 commits ahead / 0 behind #76; three files changed.

## Gap found

The Team Lite candidate workflow validated the source userscript and server template separately, but did not run `scripts/build.mjs` and verify the generated `supabase/functions/upstatus-team-lite/index.ts` artifact. The build script does generate this API runtime from `src/server/team-lite-index.template.ts` and embeds the exact userscript, so the missing check could allow source metadata and the actual deployable function artifact to drift without the Team Lite Candidate Checks noticing.

## Candidate changes

- Added `scripts/test-team-lite-build-artifact.mjs`.
- Updated `.github/workflows/team-lite-candidate.yml` to build the generated runtimes locally and verify the Team Lite API artifact before the existing candidate checks.
- Added a push-only offline workflow `.github/workflows/team-lite-build-artifact-parity.yml` for this branch. It uses no secrets, network, Supabase calls, or fixture mutations.

The new regression verifies:
- `team-lite/release.json` buildVersion equals the userscript `@version` and internal version.
- `@updateURL`/`@downloadURL` and internal update URL match the release manifest.
- API and Realtime origins point to the expected production project and `upstatus-team-lite` function.
- Generated function `VERSION` equals the manifest buildVersion.
- Base64 embedded userscript decodes byte-for-byte to the reviewed source file.
- Function path marker, userscript decoder and AUTH-03 invite/RPC code are present.
- No unresolved build placeholders remain.

## Exact-head validation

The first attempt [42488077053](https://github.com/Reekyi/UpStatus/actions/runs/42488077053) failed because the new semver assertion regex was over-escaped. This was a test-only defect. It was corrected without changing product code.

Exact-head workflow [42488110607](https://github.com/Reekyi/UpStatus/actions/runs/42488110607) **SUCCESS** on `cb65cb831910d384715addf98285d01a273e2c6a`, Node v24.22.2:

- Build completed and generated Team Lite 3.4.31.
- Generated API/userscript byte-for-byte parity passed.
- `team-lite-candidate-check.mjs` passed updater metadata, script/portal syntax, guest-session isolation and voice/reconnect regression checks.
- The workflow ran in an ephemeral GitHub runner only; it did not contact Supabase or deploy the generated function.

## Remaining Team Lite release gap

The Team Lite branch's inherited `.github/workflows/deploy-production.yml` is still the older workflow: Supabase CLI `latest`, job-level credentials, no exact master/SHA/project/organization preflight, and a deploy command targeting only `upstatus`. It does not deploy `upstatus-team-lite`.

The current production Team Lite runtime remains v15 and embeds userscript 3.4.30; the candidate manifest is 3.4.31. The new build-parity check closes the artifact-verification gap, but it does **not** create a safe Team Lite production deploy/cutover/rollback workflow. That remains a separate release blocker and should be designed before publishing the Team Lite script.

## Related runner hardening

[PR #90](https://github.com/Reekyi/UpStatus/pull/90) separately hardens the Team Lite AUTH-03 fixture runner with `redirect: "error"` and explicit opt-in assertions. Exact-head offline workflow [42487717033](https://github.com/Reekyi/UpStatus/actions/runs/42487717033) SUCCESS. #90 and #91 are independent Draft follow-ups stacked on the same #76 base; neither was merged.

## Current safety state

Production remains ACTIVE_HEALTHY with seven migrations, four operational runtimes unchanged, no AUTH-03 columns/RPC, and no new stable version selected. The lab remains isolated and clean. #78 remains 0/8 physical. The QA-owned branch and `docs/RELEASE_READINESS.md` were not modified.

No production SQL write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation occurred.
