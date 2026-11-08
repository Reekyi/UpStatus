# Authenticated call-source provenance hardening

Date: 2026-11-08

## Finding

Both Normal and Team Lite clients previously used the payload-controlled `_authenticatedTransport: true` property as proof that a call signal came from the authenticated server-mediated polling path. A sender on the public Realtime channel could include that same property in JSON, so the marker did not establish transport provenance.

The public-discovery exception also included `join_declined`. The actual public discovery publishers emit `presence` and `ended`; the `ended` handler only removes a call-directory entry and does not terminate an active call.

## Candidate fixes

- [Draft PR #102](https://github.com/Reekyi/UpStatus/pull/102), Normal, HEAD `c4a5cae1271147204ab3b0c79b8916235f0799aa`.
- [Draft PR #103](https://github.com/Reekyi/UpStatus/pull/103), Team Lite, HEAD `5fd4f684f7bb0b61d8a4788eef0dac2fc9d69419`.

Both clients now pass provenance out-of-band:
- Authenticated room polling and invitation polling call `receiveCallSignal(payload, true)`.
- The public Realtime listener always calls `receiveCallSignal(payload, false)`.
- The internal `_authenticatedTransport` payload marker is removed.
- A shared own-property allowlist permits only `presence` and `ended` with `discoveryOnly: true`.
- The public `ended` handler remains directory-only; it cannot close or mutate an active call.
- Public `join_declined`, offer, answer and ICE payloads are not accepted as discovery hints.

## Exact-head validation

- Normal PR #102: [workflow 42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669) SUCCESS. Full offline Normal Validate passed, including chat regression, signaling transport policy and call-source wiring tests.
- Team Lite PR #103: [push 42519344545](https://github.com/Reekyi/UpStatus/actions/runs/42519344545) and [PR 42519349472](https://github.com/Reekyi/UpStatus/actions/runs/42519349472) SUCCESS. The focused workflow ran the signaling adapter policy tests, Team Lite call-source wiring test and full static Team Lite candidate contract check. No Supabase or fixtures were used.

Earlier failed runs were test-contract mismatches during this candidate iteration:
- Normal 42519078049 still expected the removed payload marker; the chat regression assertion was updated and the exact-head rerun passed.
- Team Lite 42519266441 initially failed because the bundled userscript had not yet received the new shared helper; the bundle was synchronized and the exact-head reruns passed.

## Residual risk

Public `presence` and `ended` remain untrusted directory hints. They can create misleading or hide call-directory entries, but they do not grant room membership or authorize call-control events. Removing public discovery entirely requires an authenticated server-side call-directory query as part of the coordinated Realtime cutover.

No Supabase changes, SQL writes, migrations, deploys, merges, releases, secrets, ACLs, policies, feature flags or userscript publications were performed.
