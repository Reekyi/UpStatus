# UpStatus independent QA audit — 2026-11-07

**Observation window:** 2026-11-07 03:32–03:37 UTC  
**Repository:** `Reekyi/UpStatus`  
**Production Supabase:** `dlfvkawaiqduhlazsszm`  
**Isolated Supabase:** `bfpjtfqlnypisxljoxkb`  
**Method:** GitHub PR/ref/workflow inspection, exact-commit source inspection, Supabase read-only catalog/ledger/advisor queries. No tests were launched or rerun by QA.

## Status vocabulary

- **AUTOMATED PASS:** successful workflow on the exact recorded commit.
- **CODE INSPECTION:** static source/catalog inspection only.
- **MANUAL PENDING:** requires a real browser/device/operator.
- **PENDING:** workflow or test has not completed.
- **BLOCKED:** a release gate has a confirmed unresolved dependency or risk.
- **NOT VERIFIED:** no adequate evidence for the claim.

## 1. Exact GitHub refs

All PRs remain open, Draft, and unmerged. Review submissions: zero on #74, #75, #76, and #82.

| PR | Head branch | Exact head | Base | Ahead / behind |
|---|---|---|---|---:|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` | `7a8c407bbbcf4c21624981708576930f284caf2d` | `master` | 791 / 0 |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | 59 / 0 |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` | `c87e4daa9e966980d08a03f3ea5c014ae2f0fca1` | `team-lite-official` | 278 / 0 |
| [#82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` | `4465d5fdba2f29f63fb7f1e452c998e042b0f9b8` | `master` | 79 / 0 |

#75 is the historical Team Lite baseline; #76 is the active continuation and should not be treated as a second independent release candidate.

## 2. Exact-head CI

### Normal #74

- Validate [42332394502](https://github.com/Reekyi/UpStatus/actions/runs/42332394502): **AUTOMATED PASS** on `7a8c407bbbcf4c21624981708576930f284caf2d`.
- Signaling Smoke [42332394510](https://github.com/Reekyi/UpStatus/actions/runs/42332394510): **PENDING**, no jobs created at the last query.
- Validate job [128281622039](https://github.com/Reekyi/UpStatus/actions/runs/42332394502/job/128281622039) logged:
  - test migration layout guard passed;
  - `normal one-time setup enrollment static checks passed`;
  - build `UpStatus 3.4.7 / TEST 3.4.7`;
  - chat regression tests passed;
  - updater checks passed;
  - `Validation OK`.

The Validate result does not include the isolated runtime enrollment, authenticated signaling/browser, rate-limit concurrency, or read-receipt runtime steps. Those belong to Signaling Smoke.

### Team Lite #76

- Candidate Checks [42332429169](https://github.com/Reekyi/UpStatus/actions/runs/42332429169): **PENDING**, no jobs created at the last query.
- Exact head: `c87e4daa9e966980d08a03f3ea5c014ae2f0fca1`.
- Previous green run [42308602405](https://github.com/Reekyi/UpStatus/actions/runs/42308602405) belongs to older head `9f8596586f7fde9cc7f74efd9e969e49e78e3ca8`; it is not approval of the current head.

Older Team Lite runs for `d181042` and `c2072e6` are also queued. Do not count them as current-head approval.

### Shared fixture queue

Both candidate workflows use the same concurrency group `upstatus-signaling-isolated-tests`, `queue: max`, and `cancel-in-progress: false`. This correctly serializes Normal and Team Lite fixture-mutating suites.

At the last query:
- Normal Smoke [42332377754](https://github.com/Reekyi/UpStatus/actions/runs/42332377754) was **IN PROGRESS** on predecessor head `14b2f38d233a45214c5e24a8e3efec8bc9ac5bf4`.
- Its job was in `Run authenticated isolated integration and browser tests`.
- Its later rate-limit, read-receipt, and setup-invite steps were still pending.
- Exact-current Normal Smoke and Team Lite runs were queued behind it.

The active predecessor run is not evidence for either current exact head. The queue also contains obsolete intermediate Team Lite commits, delaying current-head validation.

## 3. AUTH-03 — one-time first-access enrollment

### Candidate source inspection

Normal template blob: `e483aedbdc38e7557c2143a4637ec72a0ec2383b`.  
Team Lite template blob: `264119e617f3371dfa938074fccf8dd3d3b58d2f`.

Both candidates now:
- require a valid UpStatus session and stored `implementation_admin` role to issue `POST /api/setup-invite`;
- generate 32 random bytes and store only the SHA-256 hash;
- set a 15-minute expiry and issuer/timestamp metadata;
- require a 64-character hex setup token on `POST /api/setup`;
- consume the invite through `consume_upstatus_setup_invite`;
- return a generic public `GET /api/account` response;
- default a NULL role to `implementation_user`;
- do not persist the raw setup token in GM storage or sessionStorage.

The route order is relevant: the request must first resolve through `contextName(req)`, then the invite handler checks the current stored role through `admin(adminName)`. The handler does not trust a role field supplied by the caller.

Candidate static test blob: `7127799d0859540ad2ea9a0fe50d87a7f4c2b73b`.  
Runtime test blob: `6ea501766b9e97b9605650b6abafb85fc4136d24`.  
Production migration candidate blob: `cc052b3195f4ec8b3b37e217abd8c3f99b6b080c`.  
Isolated test migration blob: `c161d8b8122ae701116ac1992a2a58c03d629775`.

### RPC/catalog inspection

The isolated ledger records `20261107020949_upstatus_setup_invites_isolated_test`. The installed `public.consume_upstatus_setup_invite(text,text,text)` is:
- SECURITY INVOKER;
- configured with empty `search_path`;
- executable by `service_role`;
- not executable by `anon` or `authenticated`;
- a single conditional UPDATE that checks user, NULL/empty password state, token hash, expiry, and nonempty password hash, then clears invite metadata.

The unique partial index on non-NULL setup token hashes is present. The isolated function definition and effective privileges were inspected with SELECT-only catalog queries.

### Runtime test coverage in source, not yet executed on current heads

The runtime script covers:
- NULL and legacy empty-string password rows;
- denial for already-configured accounts;
- malformed and wrong token hashes;
- one-winner concurrent consumption;
- explicit replay rejection;
- expired token rejection;
- non-admin role fallback;
- token metadata clearing and fixture cleanup.

However, the script directly PATCHes fixture rows and calls the RPC using service_role. It does **not** exercise the actual HTTP `/api/setup-invite` route, prove non-admin issuance denial through the Edge Function, or test the full HTTP issuance/private-delivery/setup path. Those route-level checks remain **PENDING**. No current-head runtime enrollment test has completed.

### Remaining AUTH-03 details

- There is no dedicated admin-panel UI for issuing invites; a controlled internal API client and private token delivery are still required.
- The shared mutation guard checks the exact isolated origin and requires explicit opt-in, but its error text says `UPSTATUS_SIGNAL_ALLOW_MUTATION=1` even when the auth test caller is using `UPSTATUS_AUTH_ALLOW_MUTATION=1`. The workflows set the correct auth variable; this is a low-severity local-runner guidance mismatch.
- The RPC uses `coalesce(u.role,'implementation_user')`, which handles NULL but not an empty/whitespace role. This does not grant admin, but can leave a blank stored role. Normalize blank roles and add a regression case.
- Normal still requires six password characters; Team Lite requires four. Because both products share the account store, this is a concrete cross-client login compatibility gap.
- Neither product nor either Supabase project has a dedicated distributed login/setup rate limiter. Signaling rate limits do not protect login or enrollment.

## 4. Production Supabase — unchanged and blocked

Project `dlfvkawaiqduhlazsszm`:
- PostgreSQL 17.11;
- 7 migrations through `20261027155438`;
- 38/38 Edge Functions ACTIVE;
- all 38 report `verify_jwt=false` (custom application auth must be reviewed route by route; this alone does not prove unauthenticated access).

Core deployed functions:
- Normal `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, embedded userscript 3.4.7.
- Team Lite `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, embedded userscript 3.4.30.
- Legacy Normal screen-share endpoint v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Read-only source inspection confirms all three deployed core functions still use the old public first-setup path and name-based admin fallback. `GET /api/account?name=...` still reports setup state. Production aggregate users query: 5 total, 0 uninitialized, 0 missing/blank roles, 3 explicit admins. This is a latent provision/reinitialization risk, not evidence of a currently claimable official account.

Production catalog confirms absence of:
- setup-token columns and `consume_upstatus_setup_invite`;
- auth rate-limit table/RPC;
- signaling rate-limit table/RPC;
- signaling rooms/call attempts/voice attempts;
- atomic chat-read receipt RPC.

### RT-01 and grants

The three production broadcast triggers remain enabled:
- `upstatus_messages_broadcast` on `public.messages`;
- `upstatus_remote_state_broadcast` on `public.upstatus_state`;
- `upstatus_users_broadcast` on `public.users`.

Their SECURITY DEFINER functions still use `search_path=public`, have EXECUTE effective for anon/authenticated, and call `realtime.send(..., false)` (public topic). The messages trigger publishes the complete row via `to_jsonb`; remote-state publishes command/result metadata; user-status publishes name/status/reason/update metadata.

Nine backend-owned public tables remain RLS-enabled with zero policies and all eight table privileges effective for both anon and authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN. `realtime.messages` is a partitioned table with RLS, zero policies, and anon/authenticated SELECT/INSERT grants. Grants alone do not prove row access in the absence of permissive policies, but the privilege surface is excessive.

Production default ACLs remain broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public.

Security Advisor observed at 2026-11-07 03:37:07 UTC:
- 3 SECURITY DEFINER WARN for anon;
- 3 SECURITY DEFINER WARN for authenticated;
- 10 RLS-without-policy INFO.
Performance and Health returned no findings.

## 5. Isolated Supabase

Project `bfpjtfqlnypisxljoxkb`:
- PostgreSQL 17.11;
- 29 migration records through `20261107020949`;
- `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`;
- `upstatus-signal-e2e-once` v3, SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`.

The signaling endpoint uses the installed bounded rate-limit RPC, returns HTTP 429 with `Retry-After: 60`, and exposes the header through CORS. The setup-invite RPC is present with the restricted privileges above. No auth-specific rate-limit table/RPC exists.

Signaling backend tables have RLS enabled and no direct anon/authenticated table privileges. In contrast, `realtime.messages` remains RLS-enabled with zero policies and anon/authenticated SELECT/INSERT grants; private Realtime authorization is not complete.

Default ACL hardening is partial:
- postgres defaults in public are narrowed to postgres/service_role;
- postgres defaults in storage remain broad;
- supabase_admin defaults in public/graphql/graphql_public remain broad.

Isolated Security Advisor: 0 WARN, 17 RLS-without-policy INFO. Performance Advisor: 4 unused-index INFO. Health: no findings.

### Fixture activity — do not mutate or clean

Read-only snapshots changed during the observation window. Latest snapshot at approximately 03:37 UTC:
- users: 4 (0 matching the auth-test fixture prefix);
- sessions: 4;
- signal rooms: 17;
- memberships: 19;
- call attempts: 3;
- voice-room attempts: 4;
- events: 4;
- rate-limit buckets: 6.

The Normal predecessor workflow `42332377754` was in its authenticated integration/browser step at the time. This is consistent with the observed fixture activity, but individual rows were not attributed to that run with log evidence. QA did not start tests, mutate, or clean any fixtures. Wait for the active run and queue to finish, then verify cleanup with SELECT before authorizing another suite.

## 6. Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with 0/8 acceptance criteria checked. Real no-F5 recovery, physical microphone/display capture, browser termination while offline, and installed Normal ↔ Team Lite acceptance remain **MANUAL PENDING**.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 86 comments. Its main checklist body still shows the older 2026-11-03 / 16-of-35 snapshot. Latest engineering comment [6701433511](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6701433511) records the NULL/empty eligibility correction and exact-head CI still pending.

## 7. Documentation PR #82

PR #82 remains open/Draft at `4465d5fdba2f29f63fb7f1e452c998e042b0f9b8`, 79 ahead / 0 behind master. Validate [42330121968](https://github.com/Reekyi/UpStatus/actions/runs/42330121968) failed on the inherited `production updateURL mismatch` assertion in `scripts/validate.mjs:26`; the failure is in the master baseline and the validator was not weakened.

The existing `docs/RELEASE_READINESS.md` was read first and left untouched in this pass. Its current blob SHA before this addendum was `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`.

## 8. Next gates

1. Let the active predecessor Normal run finish; then require current-head Normal Smoke and Team Lite Candidate Checks to complete on the exact heads above.
2. Add HTTP-level enrollment tests: admin issuance, non-admin denial, invalid target, raw token handling/private delivery, setup consumption, and no token leakage.
3. Normalize blank roles in the RPC and test NULL, empty, and whitespace roles.
4. Add a separate distributed, fail-closed login/setup throttle with concurrency and 429/Retry-After tests.
5. Unify the Normal/Team Lite password minimum or explicitly prevent cross-client account incompatibility.
6. Add a controlled admin UI or documented secure operational issuance procedure.
7. Do not cut production over until setup invite migration and matching Edge Function versions are reviewed, tested in official TEST, and have rollback.
8. Remove full-row public Realtime broadcasts; complete authenticated signaling and private Realtime authorization.
9. Reduce production table/function grants and resolve ACL-02 through an authorized admin path.
10. Complete physical #78 acceptance, reconcile #79, obtain human PR reviews, and resolve the inherited #82 updater URL validator mismatch without weakening validation.

## Safety record

No production or isolated SQL write, migration, Edge Function deployment, secret/flag/role change, userscript publication, PR merge, release, fixture mutation, or fixture cleanup was performed by QA. All SQL issued by QA was SELECT-only. No workflow was started or rerun. Existing workflows were inspected only. The only repository write in this audit is this new documentation addendum on the dedicated QA branch; the existing readiness file and all engineering branches were preserved. No completion percentage is reported.


## Post-commit workflow recheck — 2026-11-07 03:38 UTC

After this addendum was committed as `b9e0ec6478ba51a73ad11696adb07475b745a4ca` (file blob `3c0bfa1098166d8a303d2030f9d8ec3f6c853377`), a fresh read-only workflow check showed:

- Normal exact-head Signaling Smoke [42332394510](https://github.com/Reekyi/UpStatus/actions/runs/42332394510) is now **IN PROGRESS** on `7a8c407bbbcf4c21624981708576930f284caf2d`. Job `128289469874`: syntax/static harness checks and unauthenticated endpoint checks passed; authenticated isolated integration/browser step is in progress; distributed rate-limit, atomic read-receipt, and setup-invite runtime steps remain pending.
- Team Lite exact-head Candidate Checks [42332429169](https://github.com/Reekyi/UpStatus/actions/runs/42332429169) remains **PENDING** with no jobs; exact head remains `c87e4daa9e966980d08a03f3ea5c014ae2f0fca1`.
- QA documentation Validate [42334907192](https://github.com/Reekyi/UpStatus/actions/runs/42334907192) is **IN PROGRESS** on the new documentation commit. No result is claimed yet.
- PR #82 remains open/Draft, now 80 commits ahead / 0 behind master. The main `docs/RELEASE_READINESS.md` blob remains unchanged at `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`.

No test was launched or rerun by QA; these are existing engineering workflows observed after the documentation commit.
