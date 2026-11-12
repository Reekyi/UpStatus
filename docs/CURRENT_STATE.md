# UpStatus Current State

> This is a handoff snapshot, not a substitute for checking live state. Re-verify branches, PRs, checks, and deployments before acting.

## Verified baseline at documentation setup

- Repository: `Reekyi/UpStatus`.
- Release file on `master`: `release.json` reports version `3.0.31`, no prerelease suffix.
- README release policy: `master` is production/stable; `develop` is integration/TEST; normal feature branches and PRs target `develop`; production deployment is manual.
- Latest relevant merged change observed: PR #11, "Fix Lucca call controls and improve call startup reliability", merge commit `c509277911b862d8624310f4d0acff56bea98b8c`.
- Its release version follow-up PR #12 was merged as `1e81a39d436b6e854a3e5172c0247a23e2f20ac5`.
- Vercel status check for commit `c509277911b862d8624310f4d0acff56bea98b8c` reported success and its production deployment metadata showed READY, alias `upstatus-lucca.vercel.app`, production target.
- Supabase production Edge Function `upstatus` was deployed to ACTIVE version 393 with version `3.0.31` and the updated userscript embedded. The active function source was retrieved and checked to contain the userscript update.
- Latest Lucca call fixes: corrected microphone icon state, removed injected call controls from the top header, and waited for Supabase Realtime subscription before outgoing call startup, with a clear timeout message.
- User reported the Lucca calls were working "100%" after the previous fixes. This is user-reported real-world success, not a universal connectivity guarantee.

## Known architectural constraints

- Lucca portal: `lucca-site/index.html`, served by Vercel project `upstatus-lucca`.
- Userscript source: `src/userscript/upstatus.user.template.js`.
- Supabase function source template: `src/server/index.template.ts`.
- Build/version authority: `release.json` and `scripts/build.mjs`; validation: `scripts/validate.mjs`.
- Supabase project ID: `dlfvkawaiqduhlazsszm`.
- Production function slug: `upstatus`; TEST function slug: `upstatus-test`.
- Do not print or store credentials/secrets in this file.
- README specifies feature PRs to `develop`, separate TEST identifiers and manual production deployment. Confirm the current release strategy before making future production changes.

## Stable Ycaro release preparation (2026-10-09)

- Created release branch `release/ycaro-3.0.32` from stable `master` commit `1e81a39d436b6e854a3e5172c0247a23e2f20ac5`, and opened draft PR #18 targeting `master`: https://github.com/Reekyi/UpStatus/pull/18.
- PR #18 bumps the stable version from `3.0.31` to `3.0.32`, adds `ycaro.html`, embeds it through the build script, and ports independent Ycaro login/session routes without replacing the stable Lucca implementation.
- The release branch preserves shared chat history: Ycaro login, logout, and expiry do not delete messages. The frontend sends/persists/clears its separate `upstatus_ycaro_token`.
- GitHub Actions `UpStatus Validate` run #100 passed for PR #18 head `5be9f8f2e5a2825aa1dc6fe3d26092f46bbb4d23`. The source preflight also confirmed the route, secret lookup, separate session, frontend token handling, and absence of Ycaro message deletion. This is not a live browser/login test.
- Vercel preview check `upstatus-ycaro` still fails with the known `STATIC_BUILD_NO_OUT_DIR` / missing `public` output directory configuration. Lucca's Vercel check passes. Do not change Vercel settings as part of this release; the corrected Ycaro HTML should be manually redeployed using the known manual-upload path after backend release approval.
- Production remains unchanged: Supabase Edge Function `upstatus` is ACTIVE version 394 and still serves backend version `3.0.31` without Ycaro routes. The live Ycaro Vercel alias still serves the older frontend and is not yet functional against production.
- The user reports setting `YCARO_PASSWORD` in the Supabase Dashboard, but the connected tools cannot verify secret names. Before deployment, confirm that the secret name exists in the Dashboard; never ask for or expose its value.
- PR #17 remains open against `develop`; its latest head `ec49a99c45068ff930a1ba62057c0fc0df913a1e` has a successful `UpStatus Validate` run, while its Ycaro Vercel preview check fails for the same project output-directory configuration.
- No PR was merged and no production function or frontend deployment was performed after the stable-version mismatch was discovered. Next step: review PR #18, verify the secret name in Dashboard, and only then follow the explicitly approved release sequence.

## Open items

- No known user-reported call bug is currently open; user said calls are working perfectly.
- Continuity documentation PR #13 was merged into `develop` as `b0f4bed3f635d6b6a68c1898286cd519907b632d`.
- Consider adding a link to these documents from README in a later small documentation change; the permanent prompt is already available in `docs/PROJECT_GUIDE.md`.
- Before any future WebRTC change, re-check current browser behavior and consider TURN only if real networks still fail.

## Bonfire note

The current chat is establishing durable continuity docs so a new chat can continue without rebuilding the whole conversation. The permanent prompt is in `docs/PROJECT_GUIDE.md`. The continuity docs are merged into `develop`. No production deployment was performed for this documentation-only change. At the start of the next task, read the guide and this file, then verify live repository and runtime state before implementation.

## Last updated

2026-10-09. Updated with the Ycaro stable-release preparation checkpoint. Re-check live GitHub, Supabase, and Vercel state before any merge or deployment.


## Live engineering handoff — 2026-11-12 07:13 UTC

This checkpoint supersedes the older snapshots above for current engineering status. Re-check live refs and workflows before acting.

### Verified repository refs

- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.

### Priority pull requests

| PR | HEAD | Current evidence |
|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) and Signaling Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) passed |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Candidate Checks [43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) passed: 110/110 authenticated checks |
| #80 Continuity | `be72d40fa26b70f6beab8cabbede92b08e2eb194` | Validate [42760579158](https://github.com/Reekyi/UpStatus/actions/runs/42760579158) fails: `client signed upload helper missing` |
| #82 Independent QA | `7c5691740eacab79d531ac0ecee1ef15c3ae8adf` | Validate [43170039990](https://github.com/Reekyi/UpStatus/actions/runs/43170039990) fails: `production updateURL mismatch` |
| #149 Team Lite call-source provenance | `77352d2e3b93722d6b69a9eec31a92bb63158230` | Offline guard [43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) passed; full Candidate Checks [43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232) is queued |

All listed PRs remain open and Draft. No merge or publication has occurred.

### Latest candidate work

- PR #149 is a child of the current #76 HEAD. It carries the authenticated call-source provenance change and strict public discovery allowlist.
- The parser for `.github/workflows/team-lite-candidate.yml` was corrected in commit `77352d2e3b93722d6b69a9eec31a92bb63158230`. The previous parser used `\\s*` across line breaks and an end-of-line alternative that prematurely ended the trigger section.
- Offline assertions against the actual workflow plus inline/block YAML fixtures passed. The full isolated Candidate Checks for the new SHA remain pending; do not claim complete CI until it finishes and cleanup is verified.
- PR #148 removes the name-based admin-role fallback, but first setup still does not require a one-time invite token. AUTH-03 is not complete.

### Runtime and database safety snapshot

Production project `dlfvkawaiqduhlazsszm`:

- Edge Function `upstatus` is active v480; `upstatus-team-lite` is active v15.
- The deployed userscripts embedded in both functions still execute `remote_command` received from public Realtime broadcasts and process public call signaling. Candidate protections have not reached installed runtimes.
- `realtime.messages`: 109 rows, all `private=false` (57 `user_status`, 40 `db_change`, 6 `remote_command`, 6 `remote_result`).
- 166 direct client table grants across `public`, `realtime`, and `storage`; 120 client default-ACL entries; 10 RLS-enabled public tables without policies.
- Three broadcast SECURITY DEFINER functions remain executable by client roles.
- Two public Storage buckets (`chat-images`, `profile-images`), 188 objects, and zero Storage policies.
- Seven production migrations are recorded. Four historical SQL files are absent from the `master` tree: `20261023154754`, `20261026195855`, `20261027154329`, `20261027155438`.

Isolated project `bfpjtfqlnypisxljoxkb`:

- 39 migrations and two test Edge Functions (`upstatus-signal-test` v32, `upstatus-signal-e2e-once` v3).
- Zero buckets and zero Storage objects.
- A SELECT-only fixture audit after the previous workflow found zero test users, sessions, rooms, memberships, events, bindings, call attempts, voice attempts, rate limits, messages, read receipts, Realtime messages, and Storage objects.
- This project is isolated from production but is not a full-product TEST environment.

### Release gates

- RT-01: blocked; production Realtime remains public and installed clients still consume public command payloads.
- TEST-ISOLATION: in progress; the isolated signaling project is proven, but full-product TEST coverage is not provisioned.
- MIGRATION-PROVENANCE: blocked; four original SQL files are missing and must not be reconstructed from guesses.
- AUTH-03: in progress; candidate invite/rate-limit work exists, but production runtime has no setup-token columns, invite-consumption RPC, or login rate limit.
- ACL-STORAGE: blocked; grants, default ACL, public buckets, and missing Storage policies remain.
- RECONNECT: pending; Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains 0/8 physical acceptance criteria. Automated tests do not replace a real no-F5 network-loss test.
- HUMAN-REVIEW: pending; no human approval or release authorization has been recorded.

### Next actions

1. Wait for PR #149 Candidate Checks on exact SHA `77352d2`, then verify its fixture cleanup and request independent QA review.
2. Reconcile Normal dispatcher/runtime candidates without bypassing the migration-provenance guard.
3. Integrate AUTH-03 consistently into Normal and Team Lite.
4. Recover and validate the four original migration sources.
5. Design private/authorized Realtime and least-privilege ACL/Storage changes for an isolated full-product test environment.
6. Resolve #80 and #82 without weakening their regression checks.
7. Complete the physical no-F5 acceptance in Issue #78.

### Safety boundary

No production SQL writes, migrations, Edge Function deployments, feature-flag changes, secrets changes, userscript publication, merge, or release were performed for this checkpoint. Production SQL inspection was SELECT-only. Keep all candidates Draft until independent review, full CI, physical acceptance, and explicit human release approval.

Last verified: 2026-11-12T07:13:03.016Z.
