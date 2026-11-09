# Signaling readiness schema-usage guard — 2026-11-09

## Finding

The database-backed readiness contract checked service_role table privileges and handler RPC execution, but did not explicitly check USAGE on the `public` schema. PostgREST resolution of the readiness RPC and handler tables depends on schema visibility; table/function ACL checks alone do not fully express that dependency.

## Change

- Add `pg_catalog.has_schema_privilege('service_role', 'public', 'USAGE')` to the readiness dependency set.
- Return a generic missing dependency marker internally when that privilege is absent; the public `GET /ready` response remains generic.
- Extend the isolated catalog migration and offline source contract to require the schema-usage check.

## Live read-only observation

At the time of this candidate, both production `dlfvkawaiqduhlazsszm` and the isolated lab `bfpjtfqlnypisxljoxkb` returned `service_role_usage=true` for `public`. This is a defensive readiness guard for future privilege drift, not a report of a current outage.

## Validation boundary

- Branch starts from PR #113 HEAD `41982e8eb7a9347ce54d2e22cec76eaeb08ac99a`.
- Three source/test files changed; compare reports 3 commits ahead / 0 behind PR #113 before this checkpoint file.
- Parent #113 Validate workflow now includes this child PR base (parent workflow commit `ade95d17a5b3b37590657a00dd8566de6b758339`); exact-head PR Validate is pending.
- No migration was applied and no database was modified.
- Production and the QA-shared lab remain read-only.
