# Team Lite authenticated call-source boundary regression

Date: 2026-11-08

The Team Lite client previously trusted the payload-controlled `_authenticatedTransport: true` property as proof that a call signal came from server-mediated polling. A public Realtime sender could include the same property in its JSON payload.

The candidate now passes transport provenance out-of-band:
- Authenticated room polling and invitation polling call `receiveCallSignal(payload, true)`.
- The public Realtime listener calls `receiveCallSignal(payload, false)`.
- The internal marker was removed from all call payloads.
- A shared own-property allowlist accepts only `type: "presence"` and `type: "ended"` when `discoveryOnly: true`.
- The public `ended` handler only removes a call-directory entry; it does not terminate an active call.
- Public `join_declined`, offer, answer and ICE events are not accepted as discovery hints.

Offline regressions cover the policy and the actual Team Lite call-site wiring. A dedicated GitHub Actions workflow runs only Node tests, without Supabase, secrets, network calls, or fixtures. The full Team Lite candidate workflow also includes the guard for later promotion to `team-lite-official`.

Residual: public presence can still create misleading directory entries and public ended can hide an entry. Neither grants room membership or authorizes call-control events. Replacing public discovery remains part of the coordinated server-mediated cutover.

No Supabase changes, migrations, deploys, merges, releases, or userscript publications were performed.
