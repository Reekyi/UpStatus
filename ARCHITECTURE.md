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

**Important safety warning:** `scripts/validate.mjs` invokes `scripts/build.mjs` before running its checks. The build script deletes and recreates the generated `supabase/functions/upstatus`, `supabase/functions/upstatus-test`, and `dist` directories. Do not treat validation as read-only. The current build/validator is unsafe to run as a routine first step because it would regenerate a production artifact whose update/download URLs differ from the known-good tracked `UpStatus.user.js`. Resolve and test this mismatch before using the current build pipeline for release.

The current `src/userscript/upstatus.user.template.js` is approximately 544 KB. **A source/artifact mismatch was confirmed during the initial inventory.** The tracked `UpStatus.user.js` is 544,057 characters and declares update/download URLs under `/functions/v1/upstatus/upstatus.user.js`. Rendering the template with the substitutions currently coded in `scripts/build.mjs` produces 544,109 characters and instead declares URLs under `/functions/v1/upstatus-screen-share-3-1-1-beta10/upstatus.user.js`; the first mismatch is in the userscript header. Do not run the current build or replace the stable artifact until the intended runtime/update route is verified and this mismatch is resolved deliberately. Generated `supabase/functions/*/index.ts` files are not tracked at those paths, so deployed Supabase runtime parity also remains unverified.

## Team Lite

- Release manifest: `team-lite/release.json`
- Main userscript: `team-lite/upstatus-team-lite.user.js`
- Official update/download URL currently points to the raw file on the `team-lite-official` branch.
- The Team Lite manifest and userscript must be checked together. Its versioning and update behavior must not be coupled accidentally to the normal product's `release.json` or updater.

No Team Lite build/test pipeline was confirmed during this inventory. Inspect the current branch and available scripts before designing one.

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
