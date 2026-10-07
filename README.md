# UpStatus

## Release model

GitHub is the source of truth. Supabase is the runtime. Tampermonkey consumes the generated userscript.

- `master`: production/stable line.
- `develop`: integration and TEST line.
- Feature branches start from `develop`.
- Production deployment is manual only.
- TEST deployment can be automatic from `develop`.

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
TEST deploy
   ↓
manual tests
   ↓
beta / RC
   ↓
explicit approval
   ↓
manual production workflow
```

The TEST workflow deploys only `upstatus-test` and is manual until the required Supabase Actions secrets are configured. After adding the secrets, the push trigger to `develop` can be enabled. The production workflow deploys only `upstatus`.

## Required GitHub Actions secrets

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID` = `dlfvkawaiqduhlazsszm`

The production workflow also targets the `production` GitHub Environment. Configure required reviewers there for an additional approval gate. The repository connector cannot create Actions secrets, so `SUPABASE_ACCESS_TOKEN` must be added in GitHub before CI deployment is enabled.

## TEST isolation

TEST uses separate:
- Edge Function: `upstatus-test`
- userscript namespace: `upseller-test`
- storage prefix: `upstatus_test_`
- Realtime topic: `upstatus-test-live-20261007-v1`
- ringtone coordination channel/storage key

This prevents TEST call signaling, client storage, and ringtone-stop coordination from using the production identifiers.
\n