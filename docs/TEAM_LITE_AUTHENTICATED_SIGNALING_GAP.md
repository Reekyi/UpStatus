# Team Lite authenticated-signaling trust-boundary review

**Verified:** 2026-11-18 (current repository and Supabase inspection)  
**Scope:** static source comparison only. No tests were executed in this review; no production runtime, database, secret, or deployment was changed.

## Executive finding

The Normal authenticated-signaling candidate has a source-provenance correction in PR #102, but the Team Lite candidate in PR #76 still uses a payload-controlled marker to distinguish authenticated polling from public Realtime messages.

This is a **candidate release blocker when the authenticated transport flag is enabled**, not evidence that deployed Team Lite 3.4.30 is currently exposed to this candidate-specific path. The deployed production function remains `upstatus-team-lite` version 15; the reviewed Team Lite candidate is on a separate Git branch and is not deployed.

## Live production state — legacy Realtime call signaling (2026-11-18)

A direct read-only extraction of the deployed userscripts changes the risk framing: the candidate-only marker flaw described below is real, but it is not the only trust-boundary concern.

### Exact deployed artifact provenance

- Production upstatus v480 reports backend VERSION 3.4.7. Its embedded Base64 userscript, decoded as UTF-8, is byte-for-byte identical to master/UpStatus.user.js.
- Production upstatus-team-lite v15 reports VERSION 3.4.30. Its embedded Base64 userscript, decoded as UTF-8, is byte-for-byte identical to team-lite-official/team-lite/upstatus-team-lite.user.js.
- This confirms the currently distributed Normal and Team Lite client artifacts match their respective GitHub source files at the inspected refs. It does not prove every server-side handler or secret matches a branch template.

### Current deployed call-signal path

Both deployed scripts:
- use the shared Realtime topic upstatus-screen-share-live-3-1-1-beta10;
- define receiveCallSignal(p) with no out-of-band transport-provenance argument;
- pass the public Realtime call_signal payload directly into that handler;
- contain neither signaling_transport_enabled nor _authenticatedTransport.

Normal 3.4.7 calls the beta10 Edge Function for its API. Team Lite 3.4.30 calls upstatus-team-lite. Team Lite additionally checks its local authenticated session and generation before handling the callback; that protects local session lifecycle, but does not independently establish who originated an individual broadcast payload.

Therefore the deployed clients still use the legacy shared Realtime broadcast path for call control. This is distinct from the opt-in authenticated-transport candidate path in PR #76. No external publish attempt or exploit reproduction was performed, so this inspection does not prove that an arbitrary Internet client can publish to the topic or trigger a specific action. The channel's effective publish authorization and impact must be tested in an isolated project.

### Candidate-only gap remains separate

PR #76 still uses the payload-controlled _authenticatedTransport marker when its opt-in signaling flag is enabled. The shared guard test expects out-of-band provenance and a strict public discovery allowlist. The Team Lite candidate's current inline exception also includes join_declined when discoveryOnly === true, whereas the shared guard's expected public discovery set is only presence and ended. Resolve this policy mismatch before porting the Normal correction.

## Evidence

### Team Lite candidate PR #76

- PR head: `00a578e9174e08238a1289a35feb02d171625421`
- File: `team-lite/upstatus-team-lite.user.js`
- File blob: `a74ae4aefbc1dc1b2f5821ee4284bc820ddd5eff`
- `receiveCallSignal(p)` accepts authenticated-mode messages when `p._authenticatedTransport` is truthy, except for its limited public discovery exception.
- The authenticated polling callback creates that property on the payload before calling `receiveCallSignal(p)`.
- The public Realtime `call_signal` listener passes `payload.payload` directly to `receiveCallSignal` without independently establishing transport provenance.
- Therefore the marker is forgeable by a publisher able to send to the public Realtime topic. A forged marker can pass the candidate's provenance gate and reach subsequent call-signal handling. This review did not perform an exploit test and does not claim a specific end-to-end impact.

The candidate PR describes authenticated signaling as disabled by default and requiring explicit Tampermonkey configuration. Keep it disabled until the trust boundary is corrected and tested.

### Normal correction PR #102

- PR head: `c4a5cae1271147204ab3b0c79b8916235f0799aa`
- Parent production-signaling candidate PR #101 head: `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7`
- Normal now calls `receiveCallSignal(payload, authenticatedSource)`; only authenticated room/invitation polling passes `true`.
- The public Realtime listener passes `false`.
- The payload marker `_authenticatedTransport` is removed.
- Public discovery is constrained by an own-property allowlist to `presence` and `ended` with `discoveryOnly: true`; the public `ended` path only removes a directory entry.

This is the correct architectural direction to port to Team Lite, while preserving Team Lite-specific call, voice-room, and screen-share behavior.

### Regression-test wiring gap

- PR #102 adds `scripts/public-call-discovery-guard.test.mjs` with both `normal` and `team-lite` targets.
- The Normal `scripts/validate.mjs` invokes only `node scripts/public-call-discovery-guard.test.mjs normal`.
- PR #76's `.github/workflows/team-lite-candidate.yml` does not invoke this guard.
- The Team Lite candidate therefore has no wired regression check for this provenance boundary. The Team Lite branch's current source also does not satisfy the new guard's expected out-of-band provenance shape.

No claim is made that the Team Lite guard was run; this conclusion comes from comparing the checked-in source and workflow definitions.

## Branch relationship and integration caution

- PR #101 is based on `chore/continuity-foundation` at `9c0133e8cf6bd85ac8993888718a408db2f24a3e`.
- Current PR #74 head is `dcaf6a072546eda0089e0cee4018c3047011f600`; compared with #101, the branches are diverged by 10 commits each from that common base.
- PR #102 is 13 commits ahead of #101 and contains the Normal provenance correction.
- PR #161 head `557814dc31bed779b84a2094358dc6b2a7e67689` is based on the current #74 head, and is also diverged from #102 (23 ahead / 22 behind from the common base).
- Do not merge or cherry-pick whole candidate branches blindly. Reconcile the API-target/rate-limit work from #161 with the production signaling source from #101/#102, then port the trust-boundary correction separately into Team Lite.

## Required next work

1. Port the out-of-band `authenticatedSource` parameter and strict public discovery allowlist to `team-lite/upstatus-team-lite.user.js`.
2. Ensure only the authenticated room and invitation pollers pass trusted provenance; public Realtime always passes `false`.
3. Preserve Team Lite voice-room and screen-share handlers, and confirm they remain disabled on public Realtime whenever authenticated transport is enabled.
4. Add Team Lite cases to the guard and invoke `node scripts/public-call-discovery-guard.test.mjs team-lite` in the Team Lite candidate workflow.
5. Add regression cases proving forged `_authenticatedTransport: true`, public `join_declined`, offers, answers, ICE and hangup/control events are rejected in authenticated mode; allow only explicit discovery hints.
6. Run the candidate workflow and isolated browser/integration tests after the Full-Product TEST project is restored and the branch is reconciled.

## Production and validation status

- Production Supabase project is still reported `ACTIVE_HEALTHY`.
- Deployed Team Lite is `upstatus-team-lite` version 15; no production deploy was performed.
- Production has 38 active Edge Functions (2 official, 11 TEST-family, 13 screen-share beta, 12 backups) and seven applied migration-ledger entries in the latest read-only snapshot.
- The isolated `upstatus-security-test` project remains `INACTIVE`; full integration validation is blocked.
- The production Security Advisor still reports ten public tables with RLS but no policies and three publicly executable `SECURITY DEFINER` broadcast functions.
- No tests were run in this review. No SQL, migration, deploy, merge, secret, permission, or data change occurred.


## Handoff clarification

The reconstruction investigation can hand off with the live legacy Realtime path documented as an unresolved security gate. This is not a production remediation or an authorization to change the topic. The next phase must first provision an isolated Full-Product TEST project, then test publish authorization and port the strict provenance guard to both product candidates. Production remains untouched.
