# Engineering checkpoint — 2026-11-08 (refreshed after 04:30 UTC)

This checkpoint supersedes older snapshots below where exact refs differ. It is documentation-only and does not authorize integration or deployment.

## Exact GitHub state

| PR | Current HEAD | Base | State | Latest exact-head CI |
|---|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `d8914dd8e5867e87107fe3886b2346826122a6d4` | `master` | Open, Draft | Validate [42437136152](https://github.com/Reekyi/UpStatus/actions/runs/42437136152) PASS; Smoke [42437136129](https://github.com/Reekyi/UpStatus/actions/runs/42437136129) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | Open, Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `c4da3574a5cb0df425b32d0947256171b0ad0a7b` | `team-lite-official` | Open, Draft | Candidate Checks [42447060164](https://github.com/Reekyi/UpStatus/actions/runs/42447060164) PENDING |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `b725ca6f67c4961099821627fa454e3f2de81333` | `develop` | Open, Draft | Validate [42446511759](https://github.com/Reekyi/UpStatus/actions/runs/42446511759) FAIL, inherited develop assertion `client signed upload helper missing` |
| [#82 independent QA](https://github.com/Reekyi/UpStatus/pull/82) | `19f3d98ff8817bc70e71176f1e9d844fd093077b` | `master` | Open, Draft | Validate [42443861956](https://github.com/Reekyi/UpStatus/actions/runs/42443861956) FAIL, inherited master assertion `production updateURL mismatch` |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | `develop` | Open, Draft | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| [#85 master stabilization](https://github.com/Reekyi/UpStatus/pull/85) | `36c19ab87d883fe5252715fcbbc0fbef2e35ec9f` | `master` | Open, Draft | Validate [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) PASS |

All seven PRs remain open/Draft and unmerged. The review API has returned no human review submissions. The #80 row records the parent ref before this checkpoint was first added; the initial checkpoint commit advanced #80 to `931cd84964fc19897be2b68d1666d538ad84c6f2`, whose Validate [42447123047](https://github.com/Reekyi/UpStatus/actions/runs/42447123047) failed at the inherited develop assertion `client signed upload helper missing`. The current issue #79 engineering comment records the latest #80 head after this refresh. Ancestry comparisons remain large: #74 is 870 ahead/0 behind master; #76 is 362 ahead/0 behind team-lite-official and 303 ahead/0 behind #75; #80 was 219 ahead/0 behind develop before this documentation refresh; #82 is 117 ahead/0 behind master; #84 is 30 ahead/0 behind develop; #85 is 25 ahead/0 behind master. #76 is a continuation of the #75 baseline, not an independent payload.

## Team Lite full-IIFE QA finding reconciled

The QA audit on #82 identified a P0 runtime-boot gap in the then-current Team Lite candidate: configuration/runtime globals were referenced but not declared, and the previous checker did not execute the full userscript IIFE.

The candidate subsequently restored the configuration and voice-room state, kept dependent UI patches inside the runtime closure, and added a Playwright full-IIFE smoke with inert `.invalid` endpoints, Tampermonkey/GM stubs, and blocked page-world network. Exact prior head `153d72dbb457225d9bdbe98aa05dc4c4916d3407` passed Candidate Checks [42445825265](https://github.com/Reekyi/UpStatus/actions/runs/42445825265): 16/16 unauthenticated, 108/108 authenticated, full-IIFE smoke, browser WebRTC call/voice/screen and three-member mesh, rate limit, atomic receipts, setup invite and cleanup. This is automated offline/browser evidence, not physical Tampermonkey acceptance.

## Isolated helper HTTP contract — candidate-only change

The isolated project function `upstatus-signal-test` is still deployed at v32, source SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`. Its `/room/open` mapper handles `VOICE_ATTEMPT_CONFLICT` and `ROOM_FULL` as HTTP 409 but does not recognize the singleton RPC's `VOICE_ATTEMPT_ALREADY_ACTIVE`; that result falls through to HTTP 500.

The current #76 candidate now versions the isolated helper under `supabase/test-functions/upstatus-signal-test/`, outside the normal `supabase/functions/` source tree. A shared `http-contract.mjs` maps `VOICE_ATTEMPT_ALREADY_ACTIVE` to HTTP 409 while preserving existing 400/404/410/409/500 and 201/200 contracts. The Edge Function route now delegates both error and success results to this mapper. The README records provenance and states that no deployment workflow references this test-only source.

- Source/test commits: `8e79be0`, `b3433be`, `f5ed059`, `54ce637`, `bb67a0f`, `b79f095`, followed by route correction `c4da357`.
- Local offline mapper contract exercise: 11/11 checks passed on Node 22.16.0. This was a mocked response-mapper test, not an HTTP request to Supabase.
- Exact corrected #76 HEAD `c4da357` Candidate Checks run [42447060164](https://github.com/Reekyi/UpStatus/actions/runs/42447060164) is pending. The earlier intermediate HEAD `f8903a7` is not final evidence.
- The deployed lab helper remains v32 and still has the old HTTP mapping until a separately authorized isolated deployment. No deploy was performed.

## Supabase read-only snapshot

Only two projects exist in the organization:

- Production `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active Edge Functions. Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy screen-share beta10 v6.
- Isolated lab `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 36 migrations through `20261108011524`; `upstatus-signal-test` v32 and E2E helper v3. No full-product TEST project exists.

Production read-only catalog/source checks:
- Five official users; zero NULL/empty password hashes; zero blank roles; three explicit `implementation_admin` roles.
- No setup-invite RPC, signaling rate-limit RPC/table, atomic chat-read merge RPC, or auth-specific rate-limit table/RPC in production.
- Three public SECURITY DEFINER broadcast functions retain `search_path=public` and EXECUTE for anon/authenticated/service_role. The message broadcast serializes the full row with `to_jsonb`; production Realtime has 7 partitions and 50 rows.
- Nine backend-owned public tables retain broad anon/authenticated grants, including DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE. Default ACLs remain broad for postgres and supabase_admin. `realtime.messages` remains a separate grant/cutover exception.
- Security Advisor observed 2026-11-08 04:29 UTC: 3 anon SECURITY DEFINER WARN, 3 authenticated SECURITY DEFINER WARN, 10 RLS-enabled/no-policy INFO. Performance and Health returned no findings.
- All four deployed core runtimes still have the legacy name-only `/api/chat/clear` authorization. Candidate #74/#76 require a fresh stored-role admin check; nothing was deployed.

Lab read-only checks after the completed full-IIFE run returned zero for users, messages, chat reads, sessions, rooms, room members, events, bindings, signaling rate-limit buckets, call attempts, voice attempts and Realtime rows; `realtime.messages` has zero child partitions. Lab has setup-invite, signaling rate-limit and atomic chat-read RPCs, but no auth-specific rate limiter. Voice attempt open/cancel RPCs are SECURITY INVOKER with empty search_path and EXECUTE restricted to service_role.

## Remaining release gates

1. RT-01: minimize public broadcasts and complete authenticated/private Realtime or server-mediated cutover with rollback.
2. AUTH-02: trusted ingress identity and distributed login/setup throttling; do not trust undocumented client-supplied forwarding headers.
3. AUTH-03: complete real Deno HTTP route tests and operational private delivery for setup invites.
4. Voice HTTP: run authenticated endpoint contract against a separately authorized isolated helper deployment; current candidate only proves the response mapper offline.
5. Voice concurrency: review the outer logical-room advisory lock, which serializes unrelated accounts before the per-account attempt scan; preserve the inner shared-room lock and prove lock ordering before changing it.
6. ACL/default ACL remediation, including the separately authorized supabase_admin-owned defaults path.
7. Resolve Normal cutover: candidate userscript API base still targets `upstatus-screen-share-3-1-1-beta10` while update URL targets `upstatus`; PR #85 deploys only `upstatus`. Decide canonical endpoint and rollback before any deployment.
8. Bump Normal release version deliberately; candidate remains 3.4.7, matching current stable metadata.
9. Provision a full-product TEST project and validate Storage, migrations, rollback and browser integration there.
10. Complete Issue #78 physical acceptance (still 0/8): installed Tampermonkey network loss/recovery without F5, real microphone/display capture, and installed Normal ↔ Team Lite interoperability.
11. Fix inherited #80/#82 base-validator mismatches without weakening assertions; obtain human reviews and verify branch protection.

## Safety

Production was SELECT/catalog-only. No production or lab SQL writes, migrations, Edge Function deployment, workflow dispatch, secret/role/grant/ACL/policy/feature-flag changes, PR merge, release, userscript publication or destructive action occurred. The QA branch and `docs/RELEASE_READINESS.md` were not modified.
