# BFF session strategy

Source: [BffStrategy.ts](BffStrategy.ts), [BffSession.ts](BffSession.ts), [BffSessionSync.ts](BffSessionSync.ts),
[UseBffAuth.ts](UseBffAuth.ts).

For an SPA served on the same origin as its BFF. The BFF owns the session cookie; the SPA never holds a token.
Routes (default prefix `/auth`, option `prefix`): `GET /session`, `GET /login?returnUrl=`, `POST /logout`.

## Wiring

```ts
const bridge = createAuthBridge<BffUser>({ getIdentity: BffSessionExtensions.identity });
const bff = createBffStrategy(); // { prefix, baseUrl, csrfHeaderName, sync, refresh, navigate, fetch }
const http = createApiClient({
  scope: bridge.scope,
  onUnauthorized: bridge.onUnauthorized,
  antiforgery: bff.antiforgery, // X-Csrf-Token on POST/PUT/PATCH/DELETE
});
bridge.subscribeExpired(bff.redirectToLogin); // a 401 → /auth/login?returnUrl=<page>
bridge.subscribeExpired(feedbackSessionExpiry(bus)); // optional neutral notice

// <AuthProvider :strategy="bff" :bridge="bridge"> … </AuthProvider>
const auth = useBffAuth(); // person · organization · role · permissions · hasPermission(p) · signIn · signOut
```

`auth.signIn(returnUrl?)` navigates to `/auth/login?returnUrl=…`; a path that is not local (`//host`, `\`, absolute
URL, control character) fails as `validation`. `redirectToLogin` falls back to `/` for the same input.

## Session

`GET /session` decodes to `BffUser { person, organization | null, permissions, expiresAt | null }`. The CSRF token is
not part of the user: the strategy keeps it and clears it on sign-out, expiry and a signed-out read. A payload that
breaks the contract (no `person.sub`, no `csrfToken`, a non-text permission) is a `protocol` failure, which settles
anonymous and reaches `onResolveError`. `getIdentity` keys the session by person and organization: a refreshed
session keeps the caches, an organization or person switch drops them.

## CSRF

`bff.antiforgery` is `{ headerName: 'X-Csrf-Token', getToken }`: `ApiAntiforgeryOptions.getToken` supplies the token
in place of the cookie read. It is read per unsafe request, so a rotated token applies at once and a signed-out client
sends no header. The strategy's own client (for `/auth/*`) uses the same option and carries no request scope, so a
sign-out cannot cancel its own `POST /logout`.

## Sign-out

`POST /logout` with the token, then `navigate(endSessionUrl)`. The URL must be a local path or an absolute `http(s)`
URL; anything else is a `protocol` failure and no navigation. The provider has already flipped to anonymous. A 401
counts as already signed out. A server failure is returned and the token is dropped.

## Tab sync

`BroadcastChannel` `wow-two.auth.bff` (option `sync.channelName`), falling back to the `storage` event through
`createSyncChannel`; `sync: false` turns it off. Messages are hints (`signed-in` | `signed-out`), never identity: a
tab that hears one re-reads `GET /session` silently.

- Sign-in: any change to a signed-in identity announces `signed-in`, a fresh load that lands signed in included.
- Sign-out: announced after `POST /logout` answered, and on a bridged 401 — never before, or a peer could read the
  session before it ended.
- A tab applying a hint never announces, so tabs cannot echo. A hint during this tab's own sign-in or sign-out is
  dropped.

## Refresh

`AuthStrategy.connect(host)` is the seam: the provider calls it once mounted, never under SSR, and calls the disposer
on unmount or strategy replacement. `host.revalidate()` re-reads the session without passing through `resolving`:
a found user replaces the snapshot, a signed-out answer expires a signed-in session through the bridge (one expiry,
same listeners as a 401), a failed read keeps the session and reports through `onResolveError`. It resolves cancelled
while a sign-in or sign-out runs.

- Timer: at `expiresAt − leadMs` (60 s), then once at `expiresAt`, at most once each per `expiresAt` value. A server
  that does not extend the session cannot loop; an extended one earns a new pair. `minIntervalMs` (15 s) floors the
  pace. Failures retry after `retryMs` (30 s) doubling to 5 min, and stop after `maxRetries` (5) until the next wake.
- Wake: a focus or visibility change re-reads a session older than `staleAfterMs` (30 s), signed in or out.
- `refresh: false` turns both off; peer hints still re-read.

## Limits

- A write rejected for a stale token after a sign-in elsewhere returns the 403; the hint and the wake refresh the
  token, there is no retry.
- A BFF that 401s API calls while `GET /session` still answers signed in sends the person through sign-in on every
  load; the SDK has no cross-page redirect-loop guard.
- `hasPermission` is a UX decision; the BFF authorizes every request.

## Verification

[BffStrategy.test.ts](../../tests/unit/auth/BffStrategy.test.ts) (session read, CSRF, 401 redirect, sign-in/out),
[BffSessionSync.test.ts](../../tests/unit/auth/BffSessionSync.test.ts) (hub-based sync, refresh schedule, retries),
[BffSessionSync.dom.test.ts](../../tests/unit/auth/BffSessionSync.dom.test.ts) (focus, visibility, `storage`
fallback), [BffTabSync.test.ts](../../tests/unit/auth/BffTabSync.test.ts) (real `BroadcastChannel`),
[BffProvider.dom.test.ts](../../tests/unit/auth/BffProvider.dom.test.ts) (provider, bridge, two tabs, lifetime),
[BffProvider.ssr.test.ts](../../tests/unit/auth/BffProvider.ssr.test.ts). All run against a mocked `fetch`.
