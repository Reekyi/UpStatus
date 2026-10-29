# UpStatus Development Workflow

The goal is to make small corrections quickly without rereading or rewriting the entire userscript and without losing progress when a ChatGPT conversation ends.

## For every new bug or improvement

1. **Record the request.** Write down the observed behavior, expected behavior, product (normal, TEST, Team Lite, or multiple), theme/browser if relevant, and reproducible steps.
2. **Inspect the current repository state.** Read the current branch head and only the relevant files/functions. Do not rely solely on remembered context from an earlier chat.
3. **Trace the implementation.** Identify the source file, generated artifact, backend endpoint, updater, and tests that are actually involved.
4. **Create an isolated branch.** Start from the correct product baseline. Do not use `master` as a substitute for the latest TEST line or Team Lite branch.
5. **Make the smallest coherent patch.** Preserve unrelated behavior and avoid whole-file replacement for large scripts.
6. **Run targeted checks first.** Then run syntax, build, regression, and artifact-parity checks that are safe for the touched product.
7. **Inspect the diff.** Confirm only intended files changed and no unrelated product/release identifiers changed.
8. **Test in TEST or a safe preview.** Separate source-level tests from actual browser verification. State clearly what was and was not verified.
9. **Prepare a release summary.** Include files changed, behavior changed, tests and results, version implications, deployment destination, and rollback instructions.
10. **Deploy only with explicit approval.** Production publication is a separate action from editing code. After deployment, verify the served script/version and runtime where possible.

## Do not do these things

- Do not paste or regenerate a 500 KB userscript in chat when a small patch to the relevant source file will do.
- Do not assume the template is authoritative just because it is named `template`.
- Do not run `npm run validate` casually: the current validator runs the build first, and the build deletes/recreates generated directories.
- Do not deploy a generated Edge Function just because the GitHub source changed.
- Do not mix the normal script, TEST script, and Team Lite updater or release manifests.
- Do not claim that a browser-level issue is fixed based only on successful parsing or static tests.
- Do not silently change release versions, deploy to production, or rewrite stable artifacts to resolve a mismatch.

## Chat handoff

At the end of a work session, update `WORKLOG.md` with:
- request and intended outcome;
- branch and base commit;
- files changed and reason;
- tests run and exact results;
- what remains unverified;
- next concrete action;
- deployment state (not started, TEST deployed, or production deployed and verified).

A new conversation should read this document, `ARCHITECTURE.md`, and `WORKLOG.md`, then verify the actual GitHub branch heads and current files before continuing. It should fetch only relevant code ranges rather than loading every script.

## Definition of done

A correction is done only when:
- the intended behavior is implemented;
- relevant automated checks pass;
- the final diff has been inspected;
- the correct product artifact is generated and consistent with its source;
- any unavailable browser/runtime verification is disclosed;
- deployment and version state are recorded accurately.
