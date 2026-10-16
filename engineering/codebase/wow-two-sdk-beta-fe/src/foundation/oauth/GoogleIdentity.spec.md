# Google Identity ownership

Source: [GoogleIdentity.ts](GoogleIdentity.ts).

Call `provideGoogleIdentity({ clientId, onCredential, onError, autoSelect, cancelOnTapOutside })` once in an
ancestor component setup. Descendants call injection-only `useGoogleIdentity()` or render `GoogleSignInButton`.
Buttons own appearance; the provider owns script loading, initialization and credential delivery.

GIS exposes one initialization/callback configuration per browser document. A competing live owner reports
failure rather than silently overwriting the existing callback. Multiple buttons under one owner initialize
once. Provider disposal releases ownership; obsolete configuration and disposed callbacks deliver no tokens.
The owner remains app-local during SSR and loads only after mount. A missing client ID renders nothing.
Script failures and a bounded load timeout clear the loader cache for a later attempt.

The owner emits an ID token, not an authenticated session. Products verify credentials server-side and pass
verified user state into auth. `disableAutoSelect()` remains explicit at signout.

[GoogleIdentity.dom.test.ts](../../../tests/unit/foundation/oauth/GoogleIdentity.dom.test.ts) verifies loader retry
and stale callbacks; [GoogleSignInButton.dom.test.ts](../../../tests/unit/presentation/actions/GoogleSignInButton.dom.test.ts)
verifies shared ownership, appearance, conflicting owners and disposal.
