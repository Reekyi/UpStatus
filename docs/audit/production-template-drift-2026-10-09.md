# Production/template drift audit (2026-10-09)

## Result

The archived repository snapshot is intact under its own file hash, and the backend template matches its backend logic after accounting for generated version, embedded userscript, and route-marker substitutions. The README also records a separate SHA-256 fingerprint reported for the live deployment. Those two hashes are not equal, so they must be treated as distinct fingerprints until the capture/hash method is documented. The backend is aligned, but the userscript had a meaningful feature gap. The audit has now restored the production cross-tab coordination behavior in the source template; the template still differs from the archived snapshot because it also contains newer chat-context and call-audio changes.

| Item | Archived live production 3.0.29 | Current repository template |
|---|---:|---:|
| Backend source | 609,070 characters including embedded script | 95,545 characters before generated embedding |
| Embedded userscript | 256,350 characters, 2,885 lines | 255,683 characters, 2,875 lines before build substitutions |
| Userscript equality | Not byte-identical | Not byte-identical |

The server backend comparison normalizes only build-time values (VERSION, USERSCRIPT_HEX, and the /upstatus route marker). The remaining backend source matches. This means the large file-size difference is mainly the hex-encoded userscript, not 500 KB of missing server implementation.

## Concrete userscript divergence

The initial comparison found these production cross-tab coordination elements missing from the template. They have now been ported into the template:

- GM_addValueChangeListener and GM_removeValueChangeListener grants.
- The upstatus_leader_lock_beta2_v1 leader lock.
- The upstatus_follower_event_beta2_v1 follower event channel.
- Follower-mode handling and the __upHandleFollowerEvent handler.

This behavior appears intended to prevent duplicate UpStatus instances from handling activity independently and to notify a follower tab when activity occurs. It is part of the known live 3.0.29 behavior and must not be dropped accidentally.

The current template also contains code not present in the archived production script, including early capture of the UpStatus chat context menu and a local-speaker detector used by the call UI. These have been preserved. The template is still not byte-identical to the archived userscript, so the final generated artifact requires a diff review and two-client regression testing.

## Guardrails added

- scripts/audit-production-drift.mjs verifies the archived repository file SHA-256 separately from the live-deployment fingerprint recorded in the manifest, confirms the archive's embedded userscript version, and checks that the backend template still matches the archived backend after build substitutions.
- npm run audit:production-drift reports the current known divergence in CI.
- npm run audit:production-drift:strict fails closed if required cross-tab coordination markers or event hooks are missing. The production deployment workflow runs this strict check before deployment.

The report-only audit is not approval to release. The strict source check now verifies key integration points, but it does not prove browser-level behavior or replace two-client testing.

## Next steps

1. Manually test leader election, duplicate-client exclusion, follower event delivery, and leader failover in two browser tabs. Test incoming/outgoing calls, audio, chat, and status updates because WebRTC/audio behavior is browser-dependent.
2. Build from a clean checkout, run all validation and release-safety checks, and inspect the generated userscript diff against the archived baseline.
3. Resolve the separate live-deployment versus archived-file fingerprint discrepancy, or clearly document the source of each fingerprint.
4. Update release metadata only after reconciliation and regression testing. Do not deploy to production without explicit approval.

No production function, database schema, grant, or policy was changed during this audit.
