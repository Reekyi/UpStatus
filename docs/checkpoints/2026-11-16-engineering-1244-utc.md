# Engineering checkpoint — 2026-11-16 12:44 UTC

This checkpoint records the Team Lite signed-upload parity work on Draft PR #76, the independent offline test result, and the separate Supabase quota blocker.

## Code candidate

- PR: [#76](https://github.com/Reekyi/UpStatus/pull/76)
- Branch: `team-lite/signaling-transport-candidate`
- HEAD: `00a578e9174e08238a1289a35feb02d171625421`
- Main implementation commit: [3b4385c](https://github.com/Reekyi/UpStatus/commit/3b4385c088285e14a4ad4c4b4f229b18e77023b2)
- Workflow/test separation commit: [66b4930](https://github.com/Reekyi/UpStatus/commit/66b493026f6d240a30facee59a10116cb0c28b1c)
- Extraction/job-order correction: [00a578e](https://github.com/Reekyi/UpStatus/commit/00a578e9174e08238a1289a35feb02d171625421)

The server now validates the signed upload URL's HTTPS origin, bucket, exact object path, token, public URL and safe-integer size. Avatar URL handling parses and validates the full URL rather than trusting a string prefix. The legacy data-URL avatar path remains compatible with its existing 20 MB ceiling.

The userscript validates route, bucket, MIME, size, API project origin, object path and one-time token. Its PUT uses `credentials: omit` and `redirect: error`. Chat and avatar upload UI paths use the signed-upload helper.

## Exact-head CI

[Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235):

- `signed-upload-contracts`: SUCCESS. Workflow trigger test, server contract and client contract all passed.
- `candidate-checks`: FAILURE. Authenticated integration received HTTP 402 from the isolated Supabase project.

The server/client tests use mocks and do not perform a real Storage PUT or inspect object bytes. The full isolated integration remains blocked.

## Supabase quota

The workflow response from `bfpjtfqlnypisxljoxkb` is explicit: `exceed_edge_functions_invocations_quota`; the project owner must upgrade the plan or remove spend caps. No plan or billing setting was changed.

Production logs for `2026-11-15T12:26:00Z`–`2026-11-16T12:26:00Z` contain 5,889 HTTP 402 Edge entries, all GET requests to beta10. The production log view does not expose response bodies, so the lab quota reason is not automatically attributed to production.

## Release status

NOT READY. Realtime, AUTH-03, ACL/Storage, migration provenance, Full-Product TEST, physical reconnect acceptance and human review remain open. #78 is still 0/8. No merge, deploy, release, production write, migration, secret/flag/ACL/policy change or userscript publication occurred.
