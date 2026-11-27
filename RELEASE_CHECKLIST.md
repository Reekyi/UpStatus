# UpStatus 3.5.2 Release Checklist

## Stable promotion
- [ ] Confirm `release.json` has version `3.5.2`, empty `preRelease`, and the official `upstatus` installer URL.
- [ ] Confirm the production workflow guard accepts only stable `3.5.2`.
- [ ] Run `node scripts/validate.mjs`; require GitHub Actions validation to pass.
- [ ] Confirm the production artifact uses namespace `upseller` and the existing stable local storage prefix.
- [ ] Confirm the pinned Beta 2 test artifact remains `3.5.1-beta.2` and uses only `upstatus-351-test`.
- [ ] Confirm existing production Beta 5 `upstatus-test` remains untouched.
- [ ] Deploy only the official `upstatus` function via the production workflow.
- [ ] Verify production deployment metadata, `/health`, `/api/update-info`, served userscript header and official installer URL.
- [ ] Verify no database migration, account cleanup or Storage migration occurred.

## Update compatibility
- [ ] Confirm 3.5.2 compares newer than 3.4.7, 3.4.8 and 3.5.0.
- [ ] Confirm a 3.5.2 installation does not offer an update to itself.
- [ ] Keep the existing updater manifest/script consistency check.

## Behavior accepted by Ricardo in Beta 2
- [x] Sale Smartly native status changes mirror into UpStatus.
- [x] UpStatus status changes are confirmed by the native Sale Smartly action first.
- [x] Agenda visibility and lunch edit permissions for Ricardo, Guilherme and Lohan.
- [x] Daily training and weekly Aulão assignments are editable only by Ricardo.
- [x] Aulão selection persists through the current week; next week starts a new assignment window.
- [x] Chat, profiles and images verified against live team data by Ricardo.

## Known deferred work
- [ ] General light-theme call-control visual refinements. These are not claimed as fixed in 3.5.2.

## Rollback
- Keep the prior production function source/deployment metadata as the last-known-good target.
- If the 3.5.2 runtime fails, stop further changes and deliberately redeploy the verified 3.5.0 source; do not change Beta 5 or Beta 2 test functions.
