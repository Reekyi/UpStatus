# UpStatus release pipeline

Status: release-process implementation in progress. This document is a safety contract, not authorization to deploy.

## Current production baseline

- Official project: Supabase project \`mvjqunhjxkbfcrxkjtgf\` (UpStatus Revived).
- Current Normal userscript: \`3.4.7\`.
- The deployed userscript advertises the Stable script endpoint:
  \`https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus/upstatus.user.js\`.
- The GitHub \`master/release.json\` observed on 2026-11-26 still referenced the previous project ref \`dlfvkawaiqduhlazsszm\`. That disagreed with the URL pinned by the recovered Revived userscript and could block the updater even when the manifest is reachable.
- The recovered updater also used page \`fetch()\` for both GitHub Raw and Supabase cross-origin requests. In the browser context this can fail at the CORS/network layer. The working source copy now uses Tampermonkey's granted \`GM_xmlhttpRequest\`, with explicit HTTP, network, timeout and abort handling.
- The updater remains fail-closed: it accepts only a Stable manifest, pins the exact Revived URL, and requires the manifest version to match the downloaded userscript header.

## Source-of-truth rule

The immutable recovery files under \`recovery/runtime-2026-11-26/\` are evidence and must not be edited.

The working Normal userscript source is:
\`src/userscript/normal-3.4.7.user.template.js\`

It was copied from the recovered \`upstatus-normal-3.4.7.user.js\` artifact. The modular candidate builder now embeds this Revived-specific source, rather than the archived \`original-project-normal-3.4.7.user.js\` that carries the old project URL.

## Release lanes

### Development

- Feature work happens on isolated Git branches.
- Unit, integration, syntax and differential tests run before creating a release candidate.
- No active Supabase function or production artifact is modified during ordinary development.

### Beta / staging

A separate Supabase project is required. The existing Revived project is production, and the historical \`original\` and \`security\` projects are explicitly out of scope.

Staging must have its own:
- Supabase project ID, URL and service credentials;
- database schema and seed/test accounts;
- Storage buckets and test files;
- Realtime topics;
- Edge Function deployment target;
- GitHub Actions Environment and secrets.

Do not treat a second Edge Function deployed into the production project as isolated staging. It would still share the project's database and Storage unless every resource were separately isolated and proven so.

The existing \`deploy-test.yml\` and legacy \`scripts/build.mjs\` belong to the older project/channel architecture. They are not an approved deployment path for Revived and must not be run as a shortcut.

### Stable / production

- Stable uses only the Revived production project.
- Only a release explicitly approved by Ricardo may be promoted.
- The exact tested artifact should be promoted; do not rebuild a different artifact between Beta approval and Stable publication.
- Production deployment must remain manual and protected by the GitHub \`production\` Environment.
- Keep the previous known-good userscript and backend artifact available for rollback.

## Proposed release lifecycle

\`feature branch → automated checks → staging deployment → manual Beta install → acceptance checklist → release candidate → explicit approval → Stable promotion → user updates\`

Version examples:
- Stable: \`3.4.8\`
- Beta: \`3.4.8-beta.1\`, \`3.4.8-beta.2\`
- A Beta manifest and Stable manifest must be separate. Beta must never be able to replace the Stable feed.

## Hard release gates

1. No deploy from a feature branch or pull request.
2. Beta and Stable must use distinct manifests, update/download URLs and storage/realtime namespaces.
3. Staging must use a separate Supabase project, not the active Revived database.
4. Automated checks must cover userscript syntax, updater transport, API contracts, auth, chat, media, status and failure/permission cases.
5. A release is not approved merely because CI passes. Ricardo must perform the manual Sale Smartly acceptance test.
6. Promotion requires an explicit manual action and protected production environment.
7. Every Stable release must have a documented rollback artifact and release notes.

## Work completed in this foundation branch

- Created a working source copy of the recovered Revived userscript, preserving the immutable recovery evidence.
- Replaced cross-origin page \`fetch()\` in the updater with \`GM_xmlhttpRequest\` transport.
- Added strict Stable manifest, endpoint and version consistency checks.
- Aligned the branch's Stable manifest with the official Revived endpoint.
- Changed the modular candidate builder to embed the Revived userscript source.
- Added automated transport and release-contract tests.

## Still required before real Beta testing

- Provision a new, dedicated Supabase staging project.
- Seed an isolated test dataset and configure Storage, Realtime and required secrets.
- Implement the Beta build/manifest and its channel identity.
- Implement a protected staging deploy workflow and manual artifact download/install path.
- Validate the complete candidate on managed Supabase Edge Runtime before any production cutover.

Nothing in this branch has been deployed to Supabase. The active Revived project, its Edge Functions, database, Storage and secrets remain untouched.
