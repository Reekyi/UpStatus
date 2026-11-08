# Team Lite authenticated call-source boundary regression

Date: 2026-11-08

The Team Lite client previously trusted the payload-controlled `_authenticatedTransport: true` property as proof that a call signal came from the server-mediated polling path. A public Realtime sender could include the same property in its JSON payload.

The candidate now passes transport provenance out-of-band:
- Authenticated room polling and invitation polling call `receiveCallSignal(payload, true)`.
- The public Realtime listener calls `receiveCallSignal(payload, false)`.
- The internal marker was removed from all call payloads.
- The shared allowlist accepts only own-property `type: "presence"` with `discoveryOnly: true`; public `ended`, `join_declined`, offer, answer and ICE are not discovery events.

Offline regressions cover the policy and the actual Team Lite call-site wiring. A dedicated GitHub Actions workflow runs only Node tests, without Supabase, secrets, network calls, or fixtures. The full Team Lite candidate workflow also includes the guard for later promotion to `team-lite-official`.

Residual: public presence remains an untrusted discovery hint and can still create misleading directory entries. It does not grant room membership or authorize call-control events. Replacing public discovery remains part of the coordinated server-mediated cutover.

No Supabase changes, migrations, deploys, merges, releases, or userscript publications were performed.
