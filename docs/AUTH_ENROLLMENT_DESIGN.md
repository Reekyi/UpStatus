# UpStatus first-access enrollment design

**Status:** candidate implementation, not deployed.  
**Products:** Normal and Team Lite.  
**Security boundary:** production remains unchanged until a separately approved cutover.

## Problem

The current public `POST /api/setup` accepts a caller-supplied password for any existing `public.users` row whose `password_hash` is empty. Knowing the account name is enough to race for first ownership. The public `GET /api/account?name=...` also exposes setup state.

## Candidate flow

1. An authenticated `implementation_admin` calls `POST /api/setup-invite` with the pre-provisioned account name.
2. The server verifies the admin session and confirms that the target account exists and has no password.
3. The server generates 32 random bytes, stores only the SHA-256 hash, records issuer/time, and sets a 15-minute expiry.
4. The raw token is returned once to the admin. It must be delivered to the intended person over a private channel and must not be logged or stored by the userscript.
5. The user enters the token in the first-access field and submits a password to `POST /api/setup`.
6. The Edge Function hashes the password with the existing scrypt format and calls `consume_upstatus_setup_invite`.
7. The SECURITY INVOKER RPC, executable only by `service_role`, atomically sets the password and clears the invite fields. A concurrent or replayed request receives no row and cannot create a second session.

## Database contract

- `public.users.setup_token_hash`: SHA-256 only, unique when non-null.
- Invite issuance and atomic consumption treat both `password_hash IS NULL` and legacy `password_hash = ''` as uninitialized; configured password hashes are never overwritten.
- `setup_token_expires_at`, `setup_token_issued_by`, `setup_token_issued_at`: enrollment metadata.
- `consume_upstatus_setup_invite(text,text,text)`: SECURITY INVOKER, empty search_path, service_role-only EXECUTE.
- No client role receives direct access to the RPC or invite metadata.
- The public account-state endpoint returns a generic response and no longer reports whether a named account needs setup.

## Compatibility and rollout

- Existing configured accounts continue using `/api/login`.
- Old clients that still query `/api/account` receive `needsSetup:false`; they can continue logging into configured accounts but cannot claim a new account.
- New clients expose an optional one-time token field. Tokens are not persisted in GM storage or sessionStorage.
- New first-access setup keeps the existing product policy: Normal requires six characters and Team Lite requires four. For existing logins, both handlers accept at least four characters so a 4–5-character Team Lite account can authenticate in Normal without weakening passwords issued by Normal.
- This candidate does not yet add the separate distributed auth rate limiter. Login brute-force protection remains an independent release gate.
- The migration is staged only. Apply it to the isolated project for validation; never infer production readiness from isolated success.

## Validation required

- Wrong, expired, replayed, and malformed tokens do not set a password.
- Two concurrent setup requests with one token produce exactly one winner.
- Missing roles default to `implementation_user`, never an admin role.
- Only an authenticated admin can issue a token, and only for an existing uninitialized account.
- No raw token is logged or stored.
- Normal and Team Lite UI submit the token without persisting it.
- The auth-specific distributed rate limiter is validated separately before release.
- Physical first-login acceptance and the production cutover remain pending.

## Admin operation (candidate only)

The candidate exposes an authenticated admin endpoint; there is not yet a dedicated admin-panel button.

```http
POST /api/setup-invite
Content-Type: application/json
x-upstatus-token: <active-admin-session-token>

{"name":"<pre-provisioned-account-name>"}
```

The response returns `setupToken` once and an `expiresAt` timestamp. Deliver the token privately to the intended user. Do not paste it into GitHub comments, tickets, logs, or persistent userscript storage. The route requires the caller's current UpStatus session and stored `implementation_admin` role; it returns a generic conflict when the target does not exist or already has a password.

The admin UI for issuing invites remains a usability follow-up. Until it exists, use a controlled internal API client. New setup retains the product-specific minima (Normal 6, Team Lite 4), while login validation accepts four characters in both products for shared-store compatibility. The distributed login/setup rate limiter is still a separate open gate.
