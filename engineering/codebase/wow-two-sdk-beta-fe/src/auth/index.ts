// @wow-two-beta/ui-vue/auth — headless session client over the wow-two backend identity baseline.
// `AuthProvider` owns the session state machine (unknown → resolving → authenticated | anonymous):
// me-resolve on mount (deduped through a shared in-flight promise), signIn / signOut / refresh /
// setUser actions, generic `TUser` typing. `createAuthBridge` is the app-owned hub for the
// non-Vue seams — feed `bridge.scope` and `bridge.onUnauthorized` to `createApiClient` so a 401 flips the session, and
// `bridge.isAuthenticated` to the router's `requireAuth(...)` guard so protected routes await the
// resolve before redirecting. Strategies cover the three evidenced product shapes: cookie
// me-resolve (wheelhouse, smart-qr incl. guest/`isAnonymous`), in-memory bearer (secrets-vault —
// `getAuthToken` feeds `createApiClient`), and external OAuth redirect (wheelhouse sign-in). This
// subpath carries NO peer dependency (plain Vue + `foundation/http` types) and NO UI — gates,
// splash screens, and login pages stay app-side.
//
// PORT NOTES:
//   - `useAuth()` returns the same `AuthApi` shape as React, but its four state members are reactive
//     GETTERS over the provider's session ref. Read them off the object; destructuring snapshots.
//   - The me-resolve runs from `onMounted`, so it never fires under SSR — the Vue equivalent of
//     React's mount effect, and the reason no browser-global guard is needed here.
//   - `bridge.isAuthenticated` still names the router's `requireAuth(...)`, which lands with
//     `/router` in v0.2. The bridge itself is framework-free and wired today.

// Session model + provider
export { AuthStatus, type AuthSession, type AuthResolveContext, type AuthStrategy } from './AuthSession';
export { default as AuthProvider, type AuthProviderProps } from './providers/AuthProvider.vue';
export { useAuth, type AuthApi } from './providers/AuthContext';

// Non-Vue seams — api-client 401s in, router-guard reads out
export {
  createAuthBridge,
  type AuthBridge,
  type AuthBridgeOptions,
  type AuthBridgeOwner,
  type UnauthorizedListener,
  type SessionListener,
} from './AuthBridge';

// Google sign-in is NOT here. The GIS client (`provideGoogleIdentity`) is a provider-script wrapper
// with no session concepts, so it ships as `foundation/oauth`; its button is
// `presentation/actions`'s `GoogleSignInButton`. Feed the credential the owner receives to this
// module's `signIn` — that handoff is where the session starts.

// Strategies
export {
  createCookieStrategy,
  type CreateCookieStrategyOptions,
  type CookieAuthClient,
  type CookieSignInContext,
} from './CookieStrategy';
export {
  createBearerStrategy,
  type CreateBearerStrategyOptions,
  type BearerStrategy,
  type BearerCredentials,
} from './BearerStrategy';
export { createRedirectStrategy, type CreateRedirectStrategyOptions } from './RedirectStrategy';
export { createMemoryTokenStorage, type TokenStorage } from './TokenStorage';
