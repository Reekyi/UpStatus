# UpStatus release pipeline

Status: Staging project and Beta candidate are provisioned. The release pipeline is implemented in the feature branch but is not yet available as a default-branch workflow because PR #180 remains Draft and PR #179 is not merged.

## Environments

### Stable / production

- Organization: UpStatus Revived
- Supabase project: `upstatus-normal`
- Project ref: `mvjqunhjxkbfcrxkjtgf`
- Region: `sa-east-1`
- Current Normal baseline: `3.4.7`
- Stable script endpoint: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus/upstatus.user.js`
- Stable manifest: repository `release.json` on the default branch.

The deployed 3.4.7 userscript pins the Revived endpoint. The historical `master/release.json` still needs the Stable manifest correction from PR #180 before the existing userscript can consume it. No production function, database, bucket, key, or secret was modified during this Staging setup.

### Beta / Staging

- Organization: UpStatus Revived
- Project name: `UpStatus Staging`
- Project ref: `akbgmmpnnpwcwgcfrltw`
- Region: `sa-east-1`
- Project URL: `https://akbgmmpnnpwcwgcfrltw.supabase.co`
- Current Normal Beta: `3.4.8-beta.1`
- Current screen-share staging service: `3.1.1-staging.1`

The Staging project has its own database, Storage buckets, Realtime broadcast topics, API endpoint, userscript update URLs, local-storage namespace, and Edge Functions. It contains synthetic test accounts only. No production password hashes, sessions, chat messages, status history, avatars, or Storage files were copied.

Provisioned database objects:
- 10 application tables matching the Normal 3.4.7 data contract.
- RLS enabled on all 10 application tables.
- App tables are not granted to `anon` or `authenticated`; the Edge Functions use the server-side service role.
- Synthetic accounts: Ricardo, Guilherme, Lohan, Lucca and Ycaro. Password hashes are blank and must be configured independently in Staging.
- Buckets: `chat-images` and `profile-images`, both empty and isolated from production.

Realtime is isolated to the Staging topic `upstatus-screen-share-staging-live-v1`; screen-share and ringtone browser namespaces are also separate.

Deployed Staging Edge Functions:
- `upstatus`, version `3.4.8-beta.1`, verify_jwt=false (application-level session token auth).
- `upstatus-screen-share-3-1-1-beta10`, version `3.1.1-staging.1`, verify_jwt=false (application-level session token auth).

Both functions are ACTIVE. Public smoke checks confirmed the userscript endpoints serve the expected version headers, and the unauthenticated `/api/me` endpoint returns the expected unauthenticated state. The first-use account endpoint correctly reports `needsSetup: true`.

The security advisor reports INFO-level `rls_enabled_no_policy` findings because app tables intentionally have no browser-role policies and are accessed by the service-role Edge Functions only. This matches the current Revived access model; it is not a claim that public browser access is enabled.

## Beta test links

- Normal Beta install: `https://akbgmmpnnpwcwgcfrltw.supabase.co/functions/v1/upstatus/upstatus.user.js`
- Beta manifest: `https://raw.githubusercontent.com/Reekyi/UpStatus/feat/release-pipeline-foundation/release-beta.json`
- Screen-share staging userscript (only for testing the separately installed screen-share client): `https://akbgmmpnnpwcwgcfrltw.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10/upstatus.user.js`

The normal Beta userscript uses namespace `upseller-staging`, distinct from Stable. Do not run the Stable and Staging clients together in the same Sale Smartly page: both render the same page-level UI IDs. Use a separate browser profile or disable the Stable script during the Staging test.

Each synthetic normal account must complete first-time password setup in Staging. Choose a test password, not the production password. The guest login flows for Lucca and Ycaro are not ready until `LUCCA_PASSWORD` and `YCARO_PASSWORD` have been configured as Staging Edge Function secrets. Those secrets are not copied from production.

## Release source-of-truth

Immutable recovery files under `recovery/runtime-2026-11-26/` are evidence and must not be edited.

Working Stable userscript source:
`src/userscript/normal-3.4.7.user.template.js`

Working Beta userscript source:
`src/userscript/normal-staging.user.js`

The modular Normal backend builder now accepts:
- `UPSTATUS_USERSCRIPT_PATH` to select the matching userscript source.
- `UPSTATUS_VERSION` to embed its matching version in the backend.

The dedicated screen-share Staging Edge Function source is checked in at:
`src/server/screen-share-staging/index.ts`

It contains the Staging-specific screen client, endpoint, key, Realtime topic and namespace. Never copy this file to Stable. When screen-share logic or its client changes, update this source and the staging runtime tests together.

## Release lanes

### Development

- Feature work happens on isolated Git branches.
- Unit, integration, updater, Staging isolation, syntax and differential tests run before a Beta deployment.
- Ordinary feature development does not write to either Supabase environment.

### Beta / Staging

- Beta and Stable use distinct manifests and endpoints.
- Staging deploy is a manually triggered GitHub Actions workflow: `.github/workflows/deploy-staging.yml`.
- The workflow deploys only to the hard-pinned Staging project ref `akbgmmpnnpwcwgcfrltw`.
- It builds the modular Normal backend using the Beta userscript and version, deploys the Staging-only screen-share backend source, then smoke-tests the served versions and unauthenticated API.
- The job requires confirmation text `DEPLOY-STAGING` and the GitHub `staging` Environment.

Before using this workflow, create the GitHub Environment named `staging`, configure required reviewers as appropriate, and add the environment secret `SUPABASE_ACCESS_TOKEN_STAGING`. The project ref is intentionally hard-coded in the workflow so a Staging run cannot be redirected to Revived production.

The workflow is present in this feature branch. It becomes manually runnable from the repository default branch only after the relevant PR chain is merged. No deployment workflow was executed as part of provisioning the project; the current two Staging functions were deployed directly and verified.

### Stable / production

- Stable uses only the Revived production project.
- Only a release explicitly approved by Ricardo may be promoted.
- The exact tested artifact should be promoted; do not rebuild a different artifact between Beta approval and Stable publication.
- Production deployment remains manual and protected by the GitHub `production` Environment.
- Keep the previous known-good userscript and backend artifact available for rollback.

## Proposed release lifecycle

`feature branch → automated checks → Staging deployment → manual Beta install → acceptance checklist → release candidate → explicit approval → Stable promotion → user updates`

Version examples:
- Stable: `3.4.8`
- Beta: `3.4.8-beta.1`, `3.4.8-beta.2`

## Hard release gates

1. No deploy from an unreviewed feature branch or pull request.
2. Beta and Stable must use distinct manifests, update/download URLs, storage prefixes, and Realtime topics.
3. Staging must use its own Supabase project, not the active Revived database.
4. Automated checks must cover userscript syntax, updater transport, API contracts, auth, chat, media, status, and failure/permission cases.
5. A release is not approved merely because CI passes. Ricardo must perform the manual Sale Smartly acceptance test.
6. Promotion requires an explicit manual action and protected production Environment.
7. Every Stable release must have a documented rollback artifact and release notes.

## Validation completed

- Staging project state: ACTIVE_HEALTHY.
- All 10 application tables present; RLS enabled.
- Two empty, isolated Storage buckets present with expected MIME and size restrictions.
- Both Staging Edge Functions ACTIVE.
- Normal Beta and screen-share Staging userscripts fetched from their live endpoints with matching version headers.
- Staging `/api/me` and `/api/account` smoke checks returned expected unauthenticated/first-setup responses.
- GitHub Actions run #305 passed all 33 steps, including exact runtime recovery, Stable and Beta updater tests, Staging isolation assertions, Beta modular build, screen-share backend parse/bundle, 17 module tests, four domain integration suites, isolated Deno differential HTTP checks, and final modular parse/bundle.

Run #305:
`https://github.com/Reekyi/UpStatus/actions/runs/45890996532`

## Explicit non-actions

- No deployment or write was performed on the active Revived production project.
- No production schema, RLS, Storage, Realtime, Edge Function, key, or secret was changed.
- No PR was merged and no Stable release was published.
- The old `UpStatus` project in the separate historical organization was paused with Ricardo's approval to free the Supabase Free project slot. It is now INACTIVE and can be restored separately if needed; it is not the production project.
