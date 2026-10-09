# Production recovery and release safety

## Frozen production baseline

Do not deploy production as part of routine development. Production remains frozen at UpStatus 3.0.29 until explicit approval is recorded.

The exact source retrieved from the live Supabase Edge Function has been archived under `archive/production-3.0.29/index.ts`.

- Project: `dlfvkawaiqduhlazsszm`
- Function: `upstatus`
- Supabase function version: `390`
- SHA-256: `ad3ba7f776d1ca49129d8fa1b2a1944710695908ef630ac736ee72ce279dd442`

The archived source is a recovery snapshot and is not a build input. Do not copy it over `src/server/index.template.ts` without reviewing and reconciling it with the userscript template and build system.

## Verified release hazard

At the audit point, the live production function was 3.0.29 while `master/release.json` declared 3.0.27. The production workflow rejected prereleases but did not compare the candidate version with the deployed version. Running it from that source state could downgrade production.

Before the next production workflow run:

1. Synchronize repository release metadata and build artifacts with a deliberately approved release.
2. Add a guard that compares the candidate against the current deployed production version and fails closed if current version cannot be obtained or the candidate is older.
3. Validate all generated artifacts and require human approval in the production environment.
4. Deploy only after explicit user approval.

## Test strategy

The existing validation script verifies generated versions, namespaces, URLs, storage prefixes, Realtime topics, ringtone coordination values, embedded artifact equality, and JavaScript syntax. The release checklist adds manual functional tests for chat, status, notifications, calls, group calls, and browser combinations. There is not yet an automated two-client functional test suite.

A proposed automated layer should cover leader election and failover, duplicate-client exclusion, call signaling, accept/reject/end flows, audio-state transitions, Realtime reconnect, and PROD/TEST isolation. Browser/device-dependent audio and WebRTC checks remain in the manual release gate until browser automation exists and has been proven reliable.

## Environment boundaries

- `upstatus` is production and remains frozen absent explicit approval.
- `upstatus-test` is the integration target for experimental builds.
- Never deploy the archived snapshot directly.
- Never treat `release.json` as proof of what is currently deployed; verify the live function version and source fingerprint.
