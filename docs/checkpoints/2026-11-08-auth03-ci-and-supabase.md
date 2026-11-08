# Engineering checkpoint — 2026-11-08 00:02 UTC (2026-11-07 21:02 BRT)

This is a documentation-only checkpoint. It does not change runtime code, database state, deployments, release metadata, secrets, roles, grants, policies, or feature flags.

## Exact candidate refs and CI

| PR | HEAD | Base | Exact-head result |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `acf4d8053ac38618e912b2d7957af11ff3a20476` | `master` | Validate [42424257590](https://github.com/Reekyi/UpStatus/actions/runs/42424257590) PASS; Signaling Smoke [42424257530](https://github.com/Reekyi/UpStatus/actions/runs/42424257530) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `544866b17cc797209269036ffb76e4a7edb25cf9` | `team-lite-official` | Candidate Checks [42424260073](https://github.com/Reekyi/UpStatus/actions/runs/42424260073) PASS |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `312b137e266e8a1169289442bb770d56dfdec3df` | `develop` | Validate [42424304281](https://github.com/Reekyi/UpStatus/actions/runs/42424304281) FAIL at inherited `client signed upload helper missing` (`scripts/validate.mjs:55`) |
| [#82 independent QA](https://github.com/Reekyi/UpStatus/pull/82) | `4446e41c26b2d9401bc3f916e84e8eb1a46e927c` | `master` | Validate [42425967195](https://github.com/Reekyi/UpStatus/actions/runs/42425967195) FAIL at inherited `production updateURL mismatch` (`scripts/validate.mjs:26`) |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | `develop` | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| [#85 master stabilization](https://github.com/Reekyi/UpStatus/pull/85) | `17554523ef51bafd503e74b3f1271d55f43a6eda` | `master` | Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) PASS |

The #74 Smoke job log confirms 19/19 unauthenticated checks, 129/129 authenticated integration checks, setup-invite route-dispatch checks, browser call/voice/screen WebRTC with remote tracks, three-member mesh and teardown, 90 accepted + one HTTP 429 with `Retry-After: 60s`, distributed rate-limit concurrency, atomic chat-read receipts, one-time invite consumption, and fixture cleanup.

The #76 Candidate Checks log confirms 16/16 unauthenticated checks, 103/103 authenticated checks, setup-invite route-dispatch checks, authenticated active voice-room leave/retry, durable pagehide/reload recovery, browser call/voice/screen WebRTC, three-member mesh and teardown, 90 accepted + one HTTP 429 with `Retry-After: 60s`, rate-limit/receipt concurrency, one-time invite consumption, and fixture cleanup.

AUTH-03 route-dispatch tests execute the candidate route block and handlers in Node VM with mocked session/database boundaries. The isolated runtime suite separately exercises invite consumption and concurrency against the lab database. This is not a live Deno HTTP end-to-end test.

All seven PRs remain open and Draft, unmerged, with zero submitted human reviews. Current comparisons: #74 is 860 commits ahead/0 behind master; #75 is 59 ahead/0 behind team-lite-official; #76 is 324 ahead/0 behind team-lite-official and 265 ahead/0 behind #75; #80 is 209 ahead/0 behind develop; #82 is 113 ahead/0 behind master; #84 is 30 ahead/0 behind develop; #85 is 21 ahead/0 behind master. These are large candidates; ancestry/overlap review remains mandatory before integration.

## Supabase read-only snapshot

Only two projects exist:

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions. Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy screen-share `upstatus-screen-share-3-1-1-beta10` v6.
- Isolated lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migrations, two test functions (`upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3).

There is no dedicated full-product TEST project. The lab is a signaling/auth fixture project, not a deploy target for the product.

Post-run SELECT-only lab counts are zero for users, sessions, messages, chat reads, rooms, memberships, events, room bindings, signaling rate-limit buckets, call attempts, voice-room attempts, Realtime rows, and Realtime child partitions. No manual cleanup was performed.

Production SELECT/catalog checks confirm:
- `public.users`: 5 rows, 0 blank password hashes, 0 blank roles, 3 explicit administrators.
- No setup-invite table/RPC, auth-rate-limit table/RPC, or signaling-rate-limit table/RPC is installed.
- The three broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE for anon/authenticated/service_role. Production Realtime has 7 child partitions and 50 rows.
- Nine backend-owned tables grant anon and authenticated all seven table privileges reported by `role_table_grants`: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE.
- Default ACLs remain broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public.
- Security Advisor: 3 SECURITY DEFINER WARN for anon, 3 for authenticated, and 10 RLS/no-policy INFO. Production Performance and Health advisors are empty.

The lab has the candidate setup-invite/signaling/receipt functions with restricted service-role execution and 17 RLS/no-policy INFO, but zero managed Realtime message partitions. It cannot currently prove trigger-to-Realtime delivery.

## AUTH-02 design constraint

The candidate login/setup handlers still have no dedicated distributed authentication throttle. Do not treat the signaling rate limiter as login protection.

The Supabase documentation search available in this pass returned a self-hosted Envoy guide describing its own trusted `X-Forwarded-For` behavior; it did not establish a supported client-IP header contract for hosted Supabase Edge Functions. Therefore do not key a security control from arbitrary caller-supplied `X-Forwarded-For`, `CF-Connecting-IP`, `Origin`, or similar headers until the hosted ingress trust boundary is verified. A safe AUTH-02 implementation must document the trusted identity source, prevent account-enumeration differences, define account-lockout/DoS tradeoffs, use an atomic service-role-only RPC with pinned empty search_path, return 429/`Retry-After`, fail closed on limiter errors, and bound stale-bucket cleanup.

## Release gates

- AUTH-02: distributed login/setup/invite throttling and trusted identity source.
- AUTH-03: candidate route-dispatch and isolated invite consumption passed; live Deno HTTP flow and private token delivery/admin UI remain pending.
- RT-01: public Realtime topics and full-row payloads remain a production blocker; private/server-mediated authorization design is not complete.
- ACL/default ACL remediation and reviewed rollback remain pending.
- Dedicated full-product TEST and real chat/avatar Storage E2E remain pending.
- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN at 0/8 physical criteria. No real installed Tampermonkey network-loss/no-F5, hardware microphone/display-capture, or installed Normal ↔ Team Lite acceptance was performed.
- The live `develop` TEST deploy workflow still has a push trigger and uses shared `SUPABASE_PROJECT_ID` without destination preflight. PR #84's manual-only, TEST-specific, exact-SHA/preflight workflow remains Draft. Neither workflow was dispatched.

No production SQL write, migration, Edge deployment, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication, or destructive action occurred. Production access in this checkpoint was SELECT/catalog/source-only.
