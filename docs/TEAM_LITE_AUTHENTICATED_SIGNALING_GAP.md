# Team Lite authenticated-signaling trust-boundary review

**Verified:** 2026-11-17 (current repository and Supabase inspection)  
**Scope:** static source comparison only. No tests were executed in this review; no production runtime, database, secret, or deployment was changed.

## Executive finding

The Normal authenticated-signaling candidate has a source-provenance correction in PR #102, but the Team Lite candidate in PR #76 still uses a payload-controlled marker to distinguish authenticated polling from public Realtime messages.

This is a **candidate release blocker when the authenticated transport flag is enabled**, not evidence that deployed Team Lite 3.4.30 is currently exposed to this candidate-specific path. The deployed production function remains `upstatus-team-lite` version 15; the reviewed Team Lite candidate is on a separate Git branch and is not deployed.

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
- Production has 38 active Edge Functions and seven applied migration-ledger entries in the latest read-only snapshot.
- The isolated `upstatus-security-test` project remains `INACTIVE`; full integration validation is blocked.
- The production Security Advisor still reports ten public tables with RLS but no policies and three publicly executable `SECURITY DEFINER` broadcast functions.
- No tests were run in this review. No SQL, migration, deploy, merge, secret, permission, or data change occurred.
