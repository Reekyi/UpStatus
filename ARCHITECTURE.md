# UpStatus Architecture and Current Baseline

Last verified: 2026-10-29. This document records observed repository state, not a claim that production and repository artifacts have been independently compared at runtime.

## Products and release lines

- **UpStatus normal (production):** branch `master`; `release.json` reports version `3.4.7`; production Edge Function is `upstatus`.
- **UpStatus TEST:** the README describes `develop` as the integration line and `upstatus-test` as the TEST Edge Function. At the time of this inventory, `develop` reports `3.0.40-beta.22`, so it is substantially behind the production version and must not be assumed to contain the latest production fixes.
- **UpStatus Team Lite:** branch `team-lite-official`; `team-lite/release.json` reports core version `3.4.7` and Team Lite build version `3.4.30`. It is a separate script/release line and must be validated independently.

## Observed branch heads

These SHAs were read from GitHub during the initial inventory. Re-check branch heads before any write or release because they may have moved.

- `master`: `a9288ccfcb0f308d3a587bfca624418a395be07b`
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`

## Normal script build chain

- Release metadata: `release.json`
- Userscript template: `src/userscript/upstatus.user.template.js`
- Server template: `src/server/index.template.ts`
- Build script: `scripts/build.mjs`
- Validator: `scripts/validate.mjs`
- Generated userscripts: `dist/upstatus.user.js`, `dist/upstatus-test.user.js`
- Generated Edge Function files: `supabase/functions/upstatus/index.ts`, `supabase/functions/upstatus-test/index.ts`

The build embeds the generated userscript as hex inside the Edge Function. The validator checks versions, update URLs, namespaces, storage prefixes, realtime identifiers, embedded artifact equality, syntax, and selected regression conditions.

**Important safety warning:** `scripts/validate.mjs` invokes `scripts/build.mjs` before running its checks. The build script deletes and recreates the generated `supabase/functions/upstatus`, `supabase/functions/upstatus-test`, and `dist` directories. Do not treat validation as read-only: it rebuilds and deletes/recreates generated output directories. The `master` branch currently has the updater URL mismatch described above. The proposed fix branch corrects the URL source and adds exact assertions; do not treat it as released until the PR checks pass and the change is merged.

The current `src/userscript/upstatus.user.template.js` is approximately 544 KB. **A source/build mismatch was confirmed on the `master` baseline.** The tracked `UpStatus.user.js` is 544,057 characters and declares update/download URLs under `/functions/v1/upstatus/upstatus.user.js`. The `upstatus` Edge Function deployed in Supabase is active at version `3.4.7` and its embedded userscript header uses that same stable URL. The legacy `upstatus-screen-share-3-1-1-beta10` function currently reports script version `3.1.1-beta8`. Rendering the template with the old `master` build substitutions produced 544,109 characters and incorrectly pointed updates to that legacy route. The proposed fix on `chore/continuity-foundation` now uses `release.json.scriptUrl` when configured (with a stable-endpoint fallback for older manifests) for production update/download URLs and exact validation assertions; a deterministic render using the corrected mapping exactly matches the tracked artifact. This is not in `master` until the PR is merged. A normalized comparison of the live production backend and the rendered server template showed additional known differences: the live backend has the signed-upload handler/routes and the official-team filter; the template has server-authoritative guest-session chat filtering and document filename persistence. The patch preserves the signed-upload and official-team behavior while retaining guest-session and document filename handling. The patch removes name-only privilege grants from account setup and message deletion. Health diagnostics now require the stored `implementation_admin` role in both server and UI. Clearing the shared chat remains owner-only, but now also requires the stored admin role on both server and UI. The current database was checked read-only and Ricardo, Guilherme, and Lohan each have a configured password and explicit `implementation_admin` role. The validator asserts these authorization invariants. Remaining backend differences must still be reviewed and the generated function must compile and pass tests before deployment. Generated `supabase/functions/*/index.ts` files are not tracked at those paths, so full deployed runtime parity remains unverified.

## Team Lite

- Release manifest: `team-lite/release.json`
- Main userscript: `team-lite/upstatus-team-lite.user.js`
- Official update/download URL currently points to the raw file on the `team-lite-official` branch.
- The Team Lite manifest and userscript must be checked together. Its versioning and update behavior must not be coupled accidentally to the normal product's `release.json` or updater.

A focused Team Lite updater regression suite now runs from `scripts/validate.mjs` in CI. The workflow fetches all Git branches so the test can inspect `team-lite-official` without copying its large userscript into the normal release branch. It checks manifest/script/internal version consistency, stable update/download URLs, the newer-version prompt, equal versions, mismatch/downgrade protection, manual update action, invalid manifests, and network failures. This is not a full Team Lite build or browser-level verification; the affected installation still needs runtime diagnosis.

## Supabase runtime

The normal product uses the Supabase project `dlfvkawaiqduhlazsszm`. Repository documentation identifies `upstatus` as production and `upstatus-test` as TEST. Do not infer that a GitHub file change has reached Supabase; deployment status must be checked separately.

The repository also has an `upstatus-team-lite` function in the current project context. Its current deployed content/version must be verified independently before any Team Lite backend release.

## Release safety invariants

1. Never publish to production as a side effect of an ordinary code correction.
2. Never assume generated artifacts can safely be rebuilt until template-to-artifact parity has been checked.
3. Keep normal, TEST, and Team Lite versions, URLs, namespaces, storage prefixes, realtime topics, and server functions isolated where intended.
4. A code change is not complete until its targeted tests and artifact checks have run; clearly label checks that could not be performed.
5. Do not report a deployment as complete without checking the deployment result and the served artifact.
6. Prefer small changes on a dedicated branch and reviewable diff over replacing an entire large userscript.
