# UpStatus Architecture and Current Baseline

Last verified: 2026-10-29. This document records observed repository state, not a claim that production and repository artifacts have been independently compared at runtime.

## Products and release lines

- **UpStatus normal (production):** branch `master`; `release.json` reports version `3.4.7`; production Edge Function is `upstatus`.
- **UpStatus TEST:** the README describes `develop` as the integration line and `upstatus-test` as the TEST Edge Function. The GitHub `develop` branch manifest was observed at `3.0.40-beta.22`, but a read-only inspection of the live Supabase Edge Function on 2026-10-29 found its embedded userscript at `3.3.28` (deployment revision 281). This is a material branch/runtime mismatch. Do not assume the `develop` branch reflects the live TEST deployment or deploy a new build until the intended TEST source/version is reconciled.
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

**Build safety note:** `scripts/validate.mjs` invokes `scripts/build.mjs` before running checks, so validation does rebuild generated output. The candidate branch now overwrites only the generated function `index.ts` files and known `dist` artifacts; it does not recursively delete the function directories or tracked sidecar files. Regression assertions passed in GitHub Actions run [40939791684](https://github.com/Reekyi/UpStatus/actions/runs/40939791684). This fix remains in the draft PR and is not released. The `master` branch still has the updater URL mismatch described above.

The userscript source template on the `master` baseline was 543,874 characters. Rendering that baseline with the stable production update URL produced 544,057 characters and exactly matched the tracked `UpStatus.user.js` artifact. The previous build substitutions instead produced 544,109 characters and pointed updates to the legacy `upstatus-screen-share-3-1-1-beta10` route; the branch corrects the URL source to `release.json.scriptUrl` (with a stable endpoint fallback) and validates both update/download URLs.

The working branch now contains additional chat and authorization changes, so its rendered userscript intentionally differs from the tracked root `UpStatus.user.js`. That root artifact has not been regenerated because this workstream has not been versioned or approved as a release. Do not distribute the working-branch code under the unchanged `3.4.7` version. When a release is authorized, increment `release.json.version`, run `node scripts/build.mjs --sync-root-artifact` (the guard refuses to sync changed code under the same version), compare the generated artifact with the source and deployed runtime, and then publish through the approved release process.

A read-only normalization of the live production Edge Function source (revision 480, version 3.4.7) against the candidate server template found 27 differing line groups after normalizing embedded payloads and release-specific constants. Confirmed differences include: production still has a name-based admin fallback during account setup; the health endpoint checks an allowlist of names rather than the account role; the live chat route does not persist/return document filenames; and the live backend lacks the candidate's guest-session start-time filters for message history, unread counts, and read receipts. The candidate also tightens the chat-clear path with an admin-role check. Some other differences are guest join/leave message wording and payload-decoding format. This is a source/runtime divergence, not proof that every difference is a defect; each must be classified and tested before release. Current database roles for Ricardo, Guilherme and Lohan are all `implementation_admin`, but the live name-based fallback remains an unsafe future privilege boundary if roles are reset or accounts are recreated. Do not deploy the candidate at the existing version. The generated `supabase/functions/*/index.ts` paths are not tracked in this branch; the live source was inspected read-only through Supabase, and full functional parity still requires compile/runtime and browser tests.

## Team Lite

- Release manifest: `team-lite/release.json`
- Main userscript: `team-lite/upstatus-team-lite.user.js`
- Official update/download URL currently points to the raw file on the `team-lite-official` branch.
- The Team Lite manifest and userscript must be checked together. Its versioning and update behavior must not be coupled accidentally to the normal product's `release.json` or updater.

A focused Team Lite updater regression suite now runs from `scripts/validate.mjs` in CI. The workflow fetches all Git branches so the test can inspect `team-lite-official` without copying its large userscript into the normal release branch. It checks manifest/script/internal version consistency, stable update/download URLs, the newer-version prompt, equal versions, mismatch/downgrade protection, manual update action, invalid manifests, and network failures. This is not a full Team Lite build or browser-level verification; the affected installation still needs runtime diagnosis.

## Supabase runtime

The normal product uses the Supabase project `dlfvkawaiqduhlazsszm`. Repository documentation identifies `upstatus` as production and `upstatus-test` as TEST. Do not infer that a GitHub file change has reached Supabase; deployment status must be checked separately.

The repository also has an `upstatus-team-lite` function in the current project context. Its current deployed content/version must be verified independently before any Team Lite backend release.

## Security risk register

### High priority: public Supabase Realtime topic

- The normal userscript currently joins a shared Realtime topic without private-channel authorization. The topic identifier and public client key are present in the userscript, so topic naming is not an access-control boundary.
- The topic carries more than harmless refresh signals: chat/read/presence events, call and voice-room signaling, screen-share signaling, health diagnostics, and remote-status command notifications have used this channel. Treat broadcast payload confidentiality and sender authenticity as untrusted until proven otherwise.
- The current branch changes the remote-status path so a `remote_command` broadcast only triggers a throttled poll of the authenticated backend; it no longer executes the broadcast's command payload directly. This narrows one injection path, but does **not** make the channel private or protect other broadcast events.
- Do not claim this exposure is fixed by the current PR. A complete remediation needs a coordinated design: private channel authorization, authenticated sender identity and authorization for each event, validation of call/screen-share signaling targets and payloads, and a migration plan that does not strand existing users. Since the current userscript uses the application's own login rather than Supabase Auth, private-channel auth may require a short-lived server-issued Realtime credential or a server-mediated signaling path.
- Before implementing the full change, document event-by-event data requirements and test cross-user subscription/publishing with unauthorized clients. Do not simply toggle `private: true` without compatible Realtime authorization policies and a staged rollout.

### Defense in depth: trigger-only SECURITY DEFINER functions

- The live Security Advisor reported broad EXECUTE grants on `public.upstatus_broadcast_messages()`, `public.upstatus_broadcast_remote_state()`, and `public.upstatus_broadcast_users()`. The PR includes a conditional migration revoking direct execution from `PUBLIC`, `anon`, and `authenticated`.
- This migration is a proposed database change only. It has not been applied to production. Review trigger behavior and deployment rollback before applying it; do not treat a migration file in GitHub as a live database change.

## Release safety invariants

1. Never publish to production as a side effect of an ordinary code correction.
2. Never assume generated artifacts can safely be rebuilt until template-to-artifact parity has been checked.
3. Keep normal, TEST, and Team Lite versions, URLs, namespaces, storage prefixes, realtime topics, and server functions isolated where intended.
4. A code change is not complete until its targeted tests and artifact checks have run; clearly label checks that could not be performed.
5. Do not report a deployment as complete without checking the deployment result and the served artifact.
6. Prefer small changes on a dedicated branch and reviewable diff over replacing an entire large userscript.


### Realtime audit checkpoint: 2026-10-29

A read-only catalog query against the connected Supabase project confirmed that all three broadcast functions are `SECURITY DEFINER`, each is attached to an existing trigger, and both `anon` and `authenticated` currently have `EXECUTE`. The candidate migration `20261029170500_restrict_trigger_function_execute.sql` revokes those direct grants while preserving trigger execution. It remains unapplied. This is a narrow defense-in-depth change; it does not mitigate the public broadcast topic.

Before changing the channel, preserve the following event families and explicitly assign authorization rules:

| Event family | Data / capability | Required authorization before release |
| --- | --- | --- |
| Chat messages, read receipts, reactions, typing, presence | User activity and message metadata | Only active, authorized UpStatus sessions; validate sender identity server-side |
| Voice/group-call signaling and presence | Call membership, SDP/ICE or session negotiation | Authenticated participants in the same active call; reject forged sender/target IDs |
| Screen-share signaling | Session control and screen-share negotiation | Same call-membership check plus explicit share permissions |
| Health/diagnostic events | Runtime health and potentially internal state | Implementation administrators only; do not broadcast details to every client |
| Remote status commands/results | Remote action requests and outcomes | Never trust broadcast payload as a command; fetch authoritative command state from the authenticated backend |
| Generic refresh/status hints | Presence or cache invalidation | Minimize payload to non-sensitive identifiers; treat events as hints, not authority |

#### Safe migration sequence for Realtime authorization

1. **Inventory and tests:** enumerate every `.on('broadcast', ...)`, `.send(...)`, `realtime.send(...)`, and Presence handler in both normal and Team Lite clients. Add tests for forged sender, wrong target, non-member, expired session, and cross-call signaling.
2. **Server identity:** issue a short-lived Realtime-compatible JWT only after validating the existing UpStatus session. Do not reuse the public `anon` key as user identity. Keep signing secrets server-side and never put them in a userscript.
3. **Policy design:** add narrowly scoped `realtime.messages` SELECT/INSERT policies that verify the signed subject and topic/event permissions. A blanket `USING (true)` / `WITH CHECK (true)` policy is not an acceptable final policy for private channels.
4. **Dual-compatible rollout:** add backend credential issuance and authorization policies first, then ship a candidate client that sets `config: { private: true }` and supplies the token to Realtime. Test unauthorized subscribe and publish attempts before migrating server-side `realtime.send` calls to private broadcasts.
5. **Data minimization and cutover:** remove sensitive fields from broadcasts where clients can fetch the canonical data through authenticated endpoints. Migrate all active clients, then disable public-channel compatibility only after measured adoption and a rollback plan.
6. **Verification:** use two valid accounts plus an unauthenticated client to prove allowed same-team events work, and cross-team, wrong-target, expired-token, anonymous subscribe, and anonymous publish attempts fail. Re-run the Security Advisor and inspect actual deployed function/source versions after any approved migration.

**Do not apply the channel cutover as a one-line `false` to `true` edit.** The current application uses its own session system rather than Supabase Auth, so private-channel policies cannot safely assume the standard `authenticated` role represents a valid UpStatus user. Until the credential and policy work is implemented and tested, the public channel remains an acknowledged high-priority exposure.
