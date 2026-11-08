# Admin setup-invite UI: Normal and Team Lite

Date: 2026-11-08

## Summary

The previously identified gap between the AUTH-03 server endpoint and the userscripts is now implemented in two isolated Draft follow-up PRs:

- [PR #94, Normal admin setup-invite UI](https://github.com/Reekyi/UpStatus/pull/94)
- [PR #95, Team Lite admin setup-invite UI](https://github.com/Reekyi/UpStatus/pull/95)

Both call the existing candidate server route `POST /api/setup-invite` through the authenticated UpStatus API wrapper. The administrator enters the exact account name. The UI explains that issuing a replacement invalidates the previous invite and that the new invite expires after 15 minutes.

The client validates that the response name matches the requested account, that the token is exactly 64 hexadecimal characters, and that the expiry is in the future. It copies the token using the new `GM_setClipboard` userscript grant, with `navigator.clipboard.writeText` as fallback. The raw token is never inserted into the DOM, persisted in GM/local/session storage, or logged. The UI displays only copy/expiry status.

The server remains authoritative: the existing candidate route checks the persisted administrator role and only issues an invite for an account that has not initialized a password. The client-side role gate is an additional UI guard, not an authorization boundary.

## Normal

- Branch: `fix/normal-setup-invite-admin-ui-20261108`
- HEAD: `00462a202661fe3502d015dd2dd0ef1da239059d`
- Base: PR #93, `fix/normal-beta10-verify-jwt-config-guard-20261108`
- Exact-head validation: [Run 42498502349](https://github.com/Reekyi/UpStatus/actions/runs/42498502349), SUCCESS.
- Full offline `scripts/validate.mjs` passed, including VM-backed contract tests for stored-role gating, endpoint/method/payload, 64-hex token validation, expiry, clipboard fallback, and no DOM/storage/log exposure.

## Team Lite

- Branch: `fix/team-lite-setup-invite-admin-ui-20261108`
- HEAD: `3dc309ce17470eb706d3cd2223e99e33a94a8bd6`
- Base: PR #92, `fix/team-lite-deploy-jwt-config-guard-20261108`
- Exact-head validation: [Run 42499554010](https://github.com/Reekyi/UpStatus/actions/runs/42499554010), SUCCESS; [Run 42499560082](https://github.com/Reekyi/UpStatus/actions/runs/42499560082), SUCCESS.
- VM-backed contract tests passed.
- Authenticated offline Playwright Full-IIFE smoke passed. It uses inert GM/API and Realtime stubs, invokes the administrator settings and health actions, submits an invite request to the test host, confirms the token is copied, and verifies that the token does not appear in DOM or persistent GM storage.
- Build generated Team Lite 3.4.31; the generated `supabase/functions/upstatus-team-lite/index.ts` matched release metadata and the exact userscript source.

### Team Lite access issue discovered

The first authenticated browser smoke showed that Team Lite unconditionally removed `.up-settings-btn`, even for administrators, leaving the settings menu (and therefore the health/invite panel) unreachable. The candidate now retains the settings entry only when the stored client role is `implementation_admin`; ordinary Team Lite users keep the minimal UI. The server route continues to enforce the actual persisted role.

The browser smoke uses inert stubs and programmatic invocation of the settings/health controls because the shell starts hidden in the test harness. It is not a real Tampermonkey clipboard test or a live Edge Function HTTP integration test. The VM test separately verifies the non-admin helper gate.

## Release and production status

- Both PRs remain open and Draft, stacked on #93 and #92 respectively.
- No merge, deploy, release, migration, publication, or production mutation occurred.
- Production project `dlfvkawaiqduhlazsszm` remains on 7 migrations; the three AUTH-03 setup-invite migrations, columns, and consume RPC are still absent.
- The laboratory project `bfpjtfqlnypisxljoxkb` has 38 migrations and the setup-invite schema/RPC; the lab was not mutated by these UI tests.
- The UI does not make AUTH-03 production-ready. The migration-to-deploy window, production migration preflight, live HTTP Deno integration, and coordinated rollout/rollback remain release gates.
- Team Lite still needs its own production deploy workflow with project/SHA verification, pinned CLI, migration preflight, API-before-client ordering, and rollback plan.
- RT-01/ACL-02, AUTH-02, the managed Supabase branch `MIGRATIONS_FAILED` diagnosis, TEST full-product, human reviews, and physical acceptance #78 remain open.
- Issue #78 remains 0/8 physical criteria; no real Tampermonkey Normal ↔ Team Lite acceptance was performed.

## Coordination

The independent QA branch and `docs/RELEASE_READINESS.md` were not edited. QA should reconcile its earlier “no client UI to issue invites” finding against PRs #94/#95 after reviewing their exact-head evidence. This does not close the migration, deployment, or live HTTP gates.
