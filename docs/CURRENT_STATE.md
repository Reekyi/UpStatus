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


## 2026-11-16 19:15 UTC — engineering checkpoint and migration-ledger recovery

### Live GitHub state

- Official refs: `master` `9d40461babcec8eb8686c2a04be9c675df7da381`; `develop` `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`; `team-lite-official` `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- Required PRs, compared against their current base refs:
  - #74 `dcaf6a0`: 887 ahead / 0 behind; Validate and Signaling Smoke runs 43376770142 and 43376770200 succeeded on this exact head.
  - #75 `7bbf9b9`: 59 ahead / 0 behind; Candidate Checks 41674353127 is historical success.
  - #76 `00a578e`: 389 ahead / 0 behind; run 43868863235 failed only after the independent signed-upload contracts passed; 0/16 endpoint checks received HTTP 402 from the isolated lab, so Playwright and authenticated integration were skipped.
  - #80 `46541cad`: 320 ahead / 0 behind; Validate 43651529898 fails at validator line 55: `client signed upload helper missing`.
  - #82 QA `5bd2ab75`: 377 ahead / 0 behind; exact-head Validate 43932318982 fails at validator line 26: `production updateURL mismatch`. The latest QA report available to this run is 18:45 UTC and predates this exact head. No human reviews were submitted on #74/#75/#76/#80/#82.
- New migration-recovery candidate PR #176 is open and Draft, based on exact develop HEAD `6b33e1e`, five commits ahead / zero behind before the Current State update. It contains four ledger-recovered SQL files and a provenance note. Its automatic Validate run 43936318516 built UpStatus 3.0.40 / TEST 3.0.40-beta.22, then failed at the inherited validator line 55 (`client signed upload helper missing`). No validator was weakened.

### Migration provenance recovery

- Read `supabase_migrations.schema_migrations` in production using SELECT only. The four applied rows each retain one statement string and have no rollback entry.
- Restored those statement strings as candidate files:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- Read-only catalog corroboration confirmed the visual-config table/columns, RLS and published row; `messages.file_name`; the chat-images MIME allowlist; and 20 MiB limits on chat-images/profile-images.
- This is exact statement-text recovery from the applied ledger, not proof of byte-identical recovery of the original repository files/comments. The files are staged only in Draft PR #176. Do not replay them against production. Migration provenance remains in progress until independent review and isolated migration-history validation.
- Production managed branch `main` remains `MIGRATIONS_FAILED`; no branch repair or migration was attempted.

### Supabase availability and security

- Organization UpStatus is on the Free plan. Production `dlfvkawaiqduhlazsszm` and isolated lab `bfpjtfqlnypisxljoxkb` both report ACTIVE_HEALTHY at project level. The lab has no Supabase branches and is not Full-Product TEST.
- Production function-edge logs for the requested window `2026-11-15T19:00:51Z`–`2026-11-16T19:00:51Z` returned 58,404 rows, all HTTP 402. Available records start at 11:41:55 UTC and end at 19:00:50 UTC, so coverage is about 7h19m, not a full 24h. Routes: beta10 /api/chat 31,059; /api/status 13,640; /api/remote-status 13,613; /api/account 32; /api/me 27; /api/members 27; userscript distribution 6. The query saw three source IPs and three user agents. Logs do not include response bodies; production 402 cause remains unconfirmed.
- Lab logs show 48 Edge 402 responses from `upstatus-signal-test` between 12:37 and 12:41 UTC. Candidate Checks log explicitly reports `exceed_edge_functions_invocations_quota`; owner-side plan/spend-cap review is required. No billing setting was changed.
- Production runtime versions: Normal `upstatus` v480 / 3.4.7; Team Lite `upstatus-team-lite` v15 / 3.4.30; legacy beta10 API v6 but its source declares `3.1.1-beta8`. QA's source inspection confirms the embedded artifact also reports beta8, despite the beta10 slug. Do not assume this causes the 402s.
- Read-only production catalog: 106/106 Realtime messages public, zero Realtime policies; 10 public RLS tables without policies; 126 client table grants including 18 TRUNCATE; six public default ACL entries; three client-executable SECURITY DEFINER broadcasts; two public Storage buckets, 188 objects, zero Storage object policies.
- AUTH-03 deployed runtimes still require the existing legacy setup/name-based fallback according to source inspection and the latest QA audit; no candidate was deployed.

### Workflows and release

- Master Normal production workflow still uses generic `SUPABASE_PROJECT_ID` and CLI `latest`, deploying only `upstatus`; the installed Normal 3.4.7 client also calls the separate beta10 API endpoint.
- Develop TEST workflow still has a push trigger, generic project secret and CLI `latest`.
- Team Lite production workflow still deploys slug `upstatus` instead of `upstatus-team-lite`, with generic project secret and CLI `latest`.
- Read `docs/PROJECT_GUIDE.md`, `UPSTATUS_HANDOFF.md`, `RELEASE_CHECKLIST.md`, the continuity document and the latest QA report. The 1,046,356-byte `docs/RELEASE_READINESS.md` could not be returned by the file connector (empty content on ranged fetch); the 18:45 UTC QA report says it was read in full and that its last appended section is 2026-11-15 06:30 UTC, so that document is historical rather than a live snapshot.
- Issue #78 remains open with 0/8 physical criteria; no physical no-F5 test is evidenced. Issue #79 retains separate Engineering and QA comments.

### Safety and next steps

- The only product-repository code-like files added in this run are four recovered SQL source files on isolated Draft PR #176. No SQL was executed or replayed.
- No merge, deploy, release, userscript publication, production write, migration, secret/feature-flag/grant/policy/ACL change, billing change, workflow dispatch, fixture mutation or destructive operation occurred.
- No local tests or Supabase integration tests were run. The only new CI was the automatic PR #176 Validate run, which failed at the inherited upload-helper assertion.
- Next: review #176's ledger provenance; resolve the shared validator dependency through review of #174/#167 rather than weakening assertions; restore lab Edge quota and provision Full-Product TEST; investigate production 402 cause separately; then close RT-01/AUTH-03/ACL-Storage and obtain physical #78 and human release approval.

**Release recommendation: NOT READY.**
