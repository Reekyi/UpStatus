# TEST environment and deployment guard

The upstatus-test function name is not an environment boundary. A TEST userscript or Edge Function must never target the production project dlfvkawaiqduhlazsszm.

## Required project configuration

The manual TEST deployment workflow requires the repository variable SUPABASE_TEST_PROJECT_ID. It rejects:
- production project dlfvkawaiqduhlazsszm;
- isolated signaling/auth fixture project bfpjtfqlnypisxljoxkb;
- empty or malformed project references.

The full product TEST project must be provisioned separately and its schema/migrations rehearsed before the variable is configured. The current organization inventory contains only production and the isolated signaling/auth project; neither is a full product TEST environment.

## Build behavior

- Production remains pinned to dlfvkawaiqduhlazsszm.
- TEST builds use UPSTATUS_TEST_PROJECT_ID for the Edge Function API, Realtime, updater URL, and Storage fallback.
- TEST updater is disabled and contains no production release-manifest URL until a dedicated TEST release feed exists.
- If no TEST project is configured, the build uses the inert sentinel 00000000000000000000; this artifact is intentionally non-functional and must not be deployed.
- The build rejects production and the isolated signaling/auth project before writing generated function or distribution files.
- The build manifest records the TEST project reference and whether it was explicitly configured.

## Deployment behavior

- TEST deployment is manual-only and restricted to the develop ref.
- It uses vars.SUPABASE_TEST_PROJECT_ID, not the shared production project secret.
- The workflow runs the build-target guard and full repository validation before invoking the Supabase CLI.
- The CLI version is pinned. The workflow deploys only upstatus-test to the configured dedicated TEST project.

No project was created, no migration was applied, and no Edge Function was deployed as part of this change. A full TEST project and its migration/rollback rehearsal remain release gates.
