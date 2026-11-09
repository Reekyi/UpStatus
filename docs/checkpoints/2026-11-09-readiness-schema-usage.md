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

- Branch starts from PR #113 updated HEAD `c4a13a578288c8eb90f5fa0501c757dfaafa5471`.
- Three source/test files changed.
- PR-specific Validate is pending.
- Live lab readiness and migration tests remain pending QA coordination.
- No migration was applied and no database was modified.
- Production and the QA-shared lab remain read-only.
