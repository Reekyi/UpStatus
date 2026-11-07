# UpStatus

## Release model

GitHub is the source of truth. Supabase is the runtime. Tampermonkey consumes the generated userscript.

- `master`: production/stable line.
- `develop`: integration and TEST line.
- Feature branches start from `develop`.
- Production deployment is manual only.
- TEST deployment is manual-only and restricted to `develop`; it requires a dedicated, verified TEST project.

## Versioning

Edit only `release.json`.

```json
{ "version": "3.0.27", "preRelease": "beta.1" }
```

Build result:
- PROD artifact: `3.0.27`
- TEST artifact: `3.0.27-beta.1`

Current baseline synchronization uses:

```json
{ "version": "3.0.26", "preRelease": "test" }
```

This produces a `3.0.26-test` TEST client while preserving production-compatible code.

## Local verification

```text
node scripts/build.mjs
node scripts/validate.mjs
```

The build creates the deployable Edge Function directories and userscript artifacts.

## Release flow

```text
feature branch
   ↓
PR → develop
   ↓
validate
   ↓
manual TEST deploy
   ↓
manual tests
   ↓
beta / RC
   ↓
explicit approval
   ↓
manual production workflow
```

The TEST workflow is manual-only, restricted to `develop`, checks out the exact dispatch SHA, verifies the dedicated project through the Supabase Management API, and deploys only `upstatus-test`. Do not enable a push trigger. The production workflow remains manual and deploys only `upstatus`.

## Required GitHub Actions secrets

- `SUPABASE_ACCESS_TOKEN` (scoped to required deployment steps)
- `SUPABASE_PROJECT_ID` = `dlfvkawaiqduhlazsszm` (production workflow only)
- `SUPABASE_TEST_PROJECT_ID` repository variable (TEST workflow only; dedicated full-product TEST project in the UpStatus organization)

The production workflow also targets the `production` GitHub Environment. Configure required reviewers there for an additional approval gate. The TEST workflow requires `SUPABASE_TEST_PROJECT_ID`; never point it at production or the signaling/auth fixture project. GitHub secrets and variables must be configured by an authorized maintainer before deployment.

## TEST isolation

TEST uses separate:
- Edge Function: `upstatus-test`
- userscript namespace: `upseller-test`
- storage prefix: `upstatus_test_`
- Realtime topic: `upstatus-test-live-20261007-v1`
- ringtone coordination channel/storage key

This prevents TEST call signaling, client storage, and ringtone-stop coordination from using the production identifiers.
\n