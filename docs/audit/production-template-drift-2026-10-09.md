# Production/template drift audit (2026-10-09)

## Result

The archived repository snapshot is intact under its own file hash, and the backend template matches its backend logic after accounting for generated version, embedded userscript, and route-marker substitutions. The README also records a separate SHA-256 fingerprint reported for the live deployment. Those two hashes are not equal, so they must be treated as distinct fingerprints until the capture/hash method is documented. The unresolved code drift is concentrated in the embedded userscript.

| Item | Archived live production 3.0.29 | Current repository template |
|---|---:|---:|
| Backend source | 609,070 characters including embedded script | 95,545 characters before generated embedding |
| Embedded userscript | 256,798 characters, 2,885 lines | 249,702 characters after rendering current placeholders as 3.0.29, 2,751 lines |
| Userscript equality | Not byte-identical | Not byte-identical |

The server backend comparison normalizes only build-time values (VERSION, USERSCRIPT_HEX, and the /upstatus route marker). The remaining backend source matches. This means the large file-size difference is mainly the hex-encoded userscript, not 500 KB of missing server implementation.

## Concrete userscript divergence

The archived production userscript includes cross-tab coordination behavior that is absent from the current source template:

- GM_addValueChangeListener and GM_removeValueChangeListener grants.
- The upstatus_leader_lock_beta2_v1 leader lock.
- The upstatus_follower_event_beta2_v1 follower event channel.
- Follower-mode handling and the __upHandleFollowerEvent handler.

This behavior appears intended to prevent duplicate UpStatus instances from handling activity independently and to notify a follower tab when activity occurs. It is part of the known live 3.0.29 behavior and must not be dropped accidentally.

The current template also contains code not present in the archived production script, including early capture of the UpStatus chat context menu and a local-speaker detector used by the call UI. Those differences may be legitimate fixes added after the production snapshot, but they require review and regression testing rather than an automatic file replacement.

## Guardrails added

- scripts/audit-production-drift.mjs verifies the archived repository file SHA-256 separately from the live-deployment fingerprint recorded in the manifest, confirms the archive's embedded userscript version, and checks that the backend template still matches the archived backend after build substitutions.
- npm run audit:production-drift reports the current known divergence in CI.
- npm run audit:production-drift:strict fails closed if the current userscript template still lacks the identified production cross-tab coordination markers. The production deployment workflow now runs this strict check before deployment.

The report-only audit is not approval to release. The strict production check is expected to block deployment until the coordination behavior is reconciled.

## Next steps

1. Port or deliberately replace the cross-tab leader/follower behavior in a separate, reviewable change. Preserve the current local-speaker detector and chat context-menu fixes unless tests show they should change.
2. Add focused tests for leader election, duplicate-client exclusion, follower event delivery, and leader failover. Manually test calls and audio in two tabs because WebRTC/audio behavior is browser-dependent.
3. Build from a clean checkout, run all validation and release-safety checks, and inspect the generated userscript diff against the archived baseline.
4. Update release metadata only after source reconciliation. Do not deploy to production without explicit approval.

No production function, database schema, grant, or policy was changed during this audit.
