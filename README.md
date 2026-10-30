# UpStatus

## Start here

- [Architecture map](ARCHITECTURE.md): products, release lines, build chain, and source-of-truth boundaries.
- [Development workflow](DEVELOPMENT.md): how to investigate, patch, validate, and release safely.
- [Work log](WORKLOG.md): current workstream, known risks, validation results, and handoff notes.
- [Realtime security plan](REALTIME_SECURITY_PLAN.md): public-channel risk inventory, architecture decision gates, and staged rollout.

## Release model

GitHub is the source of truth for reviewed code. Supabase is the runtime. Tampermonkey consumes the generated userscript.

- `master`: production/stable line.
- `develop`: integration and TEST line. It can lag behind production; verify its current version before testing.
- `team-lite-official`: independent Team Lite release line with its own script and `team-lite/release.json`.
- Feature branches normally start from `develop`; maintenance work may use a different base when the PR explicitly documents why.
- Production deployment is manual only. Never assume a merge or build has deployed an Edge Function.

## Versioning

For the normal UpStatus line, edit the root `release.json`. Its `version` must use `X.Y.Z`; `preRelease` is optional and becomes a suffix on the TEST build.

Example:

```json
{
  "version": "3.4.7",
  "preRelease": "beta.1",
  "scriptUrl": "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js"
}
```

The build would generate a production artifact at `3.4.7` and a TEST artifact at `3.4.7-beta.1`. This is an example only; do not copy a version bump into a release without checking the current manifest and obtaining release approval.

Team Lite uses `team-lite/release.json` and the `team-lite-official` branch. Do not bump the official Team Lite version just to force an update prompt: the updater correctly shows a prompt only when the remote version is newer than the installed version and the manifest matches the served script.

## Local verification

```text
node scripts/build.mjs
node scripts/validate.mjs
```

The build creates the deployable Edge Function directories and userscript artifacts under `supabase/functions/*` and `dist/`. Validation runs the build first, so it is not read-only for generated outputs. The tracked root `UpStatus.user.js` is protected from implicit overwrite; the explicit `--sync-root-artifact` option requires a strictly newer production version.

The current validation includes checks for:
- production and TEST updater URL isolation;
- embedded userscript/build parity and syntax;
- chat, attachment, link-preview, and call regressions;
- Team Lite updater version/manifest behavior;
- admin authorization and backend invariants;
- guarded synchronization of the tracked root artifact.

## Release flow

```text
feature branch
   ↓
PR → develop (or explicitly documented maintenance base)
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

The TEST workflow deploys only `upstatus-test` and is manual until the required Supabase Actions secrets are configured. The production workflow deploys only `upstatus` and targets the `production` GitHub Environment. Configure required reviewers there for an additional approval gate.

## Required GitHub Actions secrets

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID` = `dlfvkawaiqduhlazsszm`

The repository connector cannot create Actions secrets, so `SUPABASE_ACCESS_TOKEN` must be added in GitHub before CI deployment is enabled.

## Guest portal configuration

- Lucca guest access uses `/lucca` and the Supabase Edge Function secret `LUCCA_PASSWORD`.
- Ycaro guest access uses `/ycaro` and the separate Supabase Edge Function secret `YCARO_PASSWORD`.
- Never commit either password to GitHub or source files.

## TEST isolation

TEST uses separate:
- Edge Function: `upstatus-test`
- userscript namespace: `upseller-test`
- storage prefix: `upstatus_test_`
- Realtime topic: `upstatus-test-live-20261007-v1`
- ringtone coordination channel/storage key

This prevents TEST call signaling, client storage, and ringtone-stop coordination from using the production identifiers. Always confirm the active TEST manifest and deployed function version before relying on TEST results.
