# TEST environment and deployment guard

The `upstatus-test` function name is not an environment boundary. A TEST userscript or Edge Function must never target the production project `dlfvkawaiqduhlazsszm`.

## Required project configuration

The manual TEST deployment workflow requires the repository variable `SUPABASE_TEST_PROJECT_ID`. It rejects:
- production project `dlfvkawaiqduhlazsszm`;
- isolated signaling/auth fixture project `bfpjtfqlnypisxljoxkb`;
- empty or malformed project references.

The full product TEST project must be provisioned separately and its schema/migrations rehearsed before the variable is configured. The current organization inventory contains only production and the isolated signaling/auth project; neither is a full product TEST environment.

Before deployment, the workflow also reads the configured project through the Supabase Management API. It requires:
- exact project reference match;
- organization ID `bcjtvojfkfoxvsitzmkl` (the UpStatus organization);
- project status `ACTIVE_HEALTHY`;
- database host exactly `db.<project-ref>.supabase.co`.

The existing `SUPABASE_ACCESS_TOKEN` must have read access to project metadata (the Management API `projects:read` scope / `projects_read` permission for fine-grained tokens) as well as the existing function-deploy permission. A missing scope, API error, wrong organization, inactive project, or metadata mismatch fails closed before the deploy command. The preflight does not create projects, change settings, read database contents, or alter secrets.

## Build behavior

- Production remains pinned to `dlfvkawaiqduhlazsszm`.
- TEST builds use `UPSTATUS_TEST_PROJECT_ID`.
- If no TEST project is configured, the build uses the inert sentinel `00000000000000000000`; this artifact is intentionally non-functional and must not be deployed.
- The build rejects production and the isolated signaling/auth project before writing generated function or distribution files.
- The build manifest records the TEST project reference and whether it was explicitly configured.

## Deployment behavior

- TEST deployment is manual-only and restricted to the `develop` ref.
- The workflow checks out the exact `github.sha` captured by the dispatch event, then verifies `git rev-parse HEAD` equals `GITHUB_SHA`. It does not resolve the moving `develop` branch after dispatch, so a concurrent push cannot silently change which commit the run deploys.
- It uses `vars.SUPABASE_TEST_PROJECT_ID`, not the shared production project secret.
- The workflow runs build-target and project-metadata regressions plus full repository validation before invoking the Management API preflight.
- The Management API preflight is read-only and confirms that the target is an active project in the UpStatus organization.
- The access token is scoped to only the credential-check, metadata-verification, and deploy steps; build and test scripts do not inherit it.
- The CLI version is pinned. The workflow deploys only `upstatus-test` to the verified TEST project.
- The workflow regression asserts manual-only triggering, exact dispatch-SHA checkout, the `develop` ref guard, SHA equality, TEST-only target, and step-scoped token access.

No project was created, no migration was applied, no secret was changed, and no Edge Function was deployed as part of this change. A full TEST project and its migration/rollback rehearsal remain release gates.

## Signed Storage uploads

The client requests a short-lived upload ticket from the authenticated Edge Function, then uploads directly to the configured project's Storage origin. The client validates the expected bucket, object path, MIME/size contract, public URL, and signed upload token before issuing the PUT. The one-time token stays in the signed URL query; it is not sent as a bearer service credential or persisted by the userscript.

The regression script `scripts/test-signed-upload-client.mjs` exercises the client helper with mocked API/Storage responses, including cross-origin rejection, bucket/path mismatch, missing or mismatched token, invalid MIME/size, avatar-vs-chat route constraints, and failed Storage responses. The same regression runs in Validate and before any manual TEST deploy.
