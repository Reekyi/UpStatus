# Team Lite production review provenance guard

**Date:** 2026-11-09  
**Base PR:** [#125](https://github.com/Reekyi/UpStatus/pull/125)  
**Candidate branch:** `fix/team-lite-production-review-provenance-20261109`

## QA finding addressed

The 11:34 UTC independent audit found that the #125 dispatcher could accept a bot approval or a review from an older PR head. It also did not verify that the reviewer was in an owner-approved release allowlist.

## Implementation

- Add `scripts/verify-team-lite-release-review.mjs` with a pure, offline-testable approval contract.
- Require `user.type === "User"`, a reviewer login in the explicit comma-separated repository variable `UPSTATUS_RELEASE_REVIEWERS`, and a reviewer different from the PR author.
- Consider only APPROVED / CHANGES_REQUESTED / DISMISSED reviews whose `commit_id` equals the exact current PR head SHA.
- Require the latest relevant current-head review event to be APPROVED; a later changes-requested or dismissed review blocks dispatch.
- Checkout the default-branch dispatcher source before running the helper, then checkout the exact Team Lite release SHA only after approval provenance passes.
- Preserve the existing one-page review-history guard; 100 or more reviews fail closed rather than silently truncating the audit.

## Owner configuration still required

The repository variable `UPSTATUS_RELEASE_REVIEWERS` is not created or changed by this candidate. Until the repository owner configures an explicit allowlist, production dispatch fails closed.

The GitHub `production` environment's required-reviewer configuration is still not verified by the available connection. This code guard is additional provenance validation, not a replacement for branch/environment protection.

## Validation boundary

The focused workflow is offline-only. Tests use synthetic review objects and do not call GitHub, Supabase, or production. No secrets, variables, environment reviewers, branch protection, deploy, migration, merge, release, or userscript publication were changed.
