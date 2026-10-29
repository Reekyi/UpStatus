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

**Important safety warning:** `scripts/validate.mjs` invokes `scripts/build.mjs` before running its checks. The build script deletes and recreates the generated `supabase/functions/upstatus`, `supabase/functions/upstatus-test`, and `dist` directories. Do not treat validation as read-only. Production userscript template/artifact parity has now been confirmed for the recorded `master` snapshot, but the build remains destructive to generated output directories and does not itself verify the currently deployed Supabase runtime.

The current `src/userscript/upstatus.user.template.js` is approximately 544 KB. During the initial inventory, rendering this template with the production substitutions from `scripts/build.mjs` produced an exact byte-for-byte match with `UpStatus.user.js` on `master` (544,057 characters). This confirms parity for the normal production userscript at that snapshot. It does not confirm deployed Supabase runtime parity, because generated `supabase/functions/*/index.ts` files are not tracked at those paths in the repository. Re-run the parity check after changes and before releases.

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
