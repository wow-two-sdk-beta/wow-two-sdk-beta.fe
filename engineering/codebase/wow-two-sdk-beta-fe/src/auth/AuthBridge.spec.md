# App session ownership

Source: [AuthBridge.ts](AuthBridge.ts), [AuthProvider.vue](providers/AuthProvider.vue).

Create one bridge per app/SSR request. Pass `bridge.scope` to HTTP and query clients, and
`bridge.onUnauthorized` to HTTP. The originating request snapshot prevents a stale 401 from logging out
a replacement identity. Supplying only the callback cannot identify the originating session.

Use `getIdentity(user)` for a stable user-and-tenant key. Object identity is the default; replacing a user
object without a stable key intentionally invalidates. Anonymous→authenticated, identity switch and logout
invalidate exactly once. Resolving/refreshing preserves the prior identity until the result settles.
Provider replacement/teardown also invalidates pending work; old provider leases cannot publish or detach successors.
Unmounting a provider settles unresolved authentication guards as false and removes its authenticated snapshot.
`isAuthenticated(signal)` lets an abandoned navigation cancel its own wait without changing the app session.

Strategies receive cancellation signals. Superseded provider work resolves a cancelled Result even when the
strategy ignores its signal. Actual remote side effects cannot be undone by cancelling the local wait.

[AuthBridgeLifetime.dom.test.ts](../../tests/unit/auth/AuthBridgeLifetime.dom.test.ts) verifies identity changes,
provider replacement/disposal, cancellation and Alice→Bob late-401 integration.
