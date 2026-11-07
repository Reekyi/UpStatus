# UpStatus Development Workflow

This document defines the standard path for bugs, improvements, and new features across UpStatus Normal and Team Lite.

## 1. Work intake

Every request is recorded as a GitHub Issue before implementation.

- **Bug:** include reproducible steps, actual/expected behavior, affected client, version, and evidence.
- **Feature:** include the user problem, proposed behavior, affected client, scope, and acceptance criteria.
- **Improvement / maintenance:** record the reason, impact, and measurable outcome.

Do not put credentials, session tokens, customer data, or private user information in issues, commits, logs, or screenshots.

## 2. Issue lifecycle

1. **Inbox:** received, not yet assessed.
2. **Triaged:** priority, affected components, risk, and acceptance criteria are defined.
3. **Ready:** implementation scope and test plan are clear.
4. **In progress:** work is happening on an isolated branch.
5. **Review:** implementation and diff are being checked.
6. **Manual validation:** candidate is ready for any required browser/device confirmation.
7. **Done:** acceptance criteria are met and evidence is recorded.

An issue is not Done merely because code was committed or CI passed.

## 3. Implementation rules

- Keep Normal and Team Lite compatibility explicit. A shared fix must be implemented and tested in both clients when both are affected.
- Work in candidate branches and draft pull requests.
- Keep commits focused and link them to their issue.
- Add regression coverage for every reproducible defect where practical.
- Treat public Realtime messages as untrusted hints, never as authoritative identity or permission data.
- Do not silently change user-facing behavior, room semantics, access rules, or data retention.
- Voice rooms are open channels: users join and leave freely. Do not introduce invitation/acceptance flows for voice rooms unless the product requirement changes.
- Call invitations are a separate product flow and may require acceptance.

## 4. Required validation

Choose tests based on the change, and record exact evidence:

- Static validation, syntax, and build.
- Unit and regression tests.
- Backend integration tests in an isolated Supabase project.
- Browser/WebRTC tests for call, voice, screen share, reconnection, teardown, and cross-client behavior when affected.
- Manual Tampermonkey/Sale Smartly validation for UI, GM bridge, microphone, camera, and screen-capture behavior when affected.
- Check for regressions in chat, status, notifications, sessions, portals, and updater when relevant.

CI success proves only the scenarios exercised by that workflow. It does not replace hardware or production-browser validation.

## 5. Pull request Definition of Done

A PR can be considered ready for release only when:

- Acceptance criteria are satisfied.
- The final commit's required CI checks pass.
- Diff and generated artifacts are reviewed.
- Normal and Team Lite compatibility is confirmed or explicitly scoped.
- Security, permissions, migrations, and data effects are reviewed.
- Required manual tests have evidence.
- Documentation and version metadata are current.
- Remaining risks and rollback steps are documented.

Keep PRs Draft while implementation or required validation is incomplete.

## 6. Release and production safety

Development, candidate validation, official TEST, and production are separate environments.

- Never treat isolated security-test results as production evidence.
- Review migrations before applying them; prefer isolated-project validation first.
- Document deployment order and rollback before a production cutover.
- Do not enable a feature flag before its matching backend and client are deployed and validated.
- Keep production changes separate from candidate implementation commits.
- After release, verify health, authentication, core workflows, and error logs.

## 7. Progress reporting

Report progress by verifiable criteria, not by subjective effort.

Use these states:
- **Passed:** evidence exists for the exact candidate commit.
- **Failed:** a test or manual scenario reproduced a defect.
- **Pending:** not yet run or awaiting external/manual validation.
- **Blocked:** cannot proceed without a specific dependency or user action.

A percentage is an estimate of the defined release checklist, not a claim that every possible behavior is tested. The final 100% requires all agreed release criteria to be passed or explicitly waived with a recorded decision.
