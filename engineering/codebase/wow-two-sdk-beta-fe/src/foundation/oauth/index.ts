// @wow-two-beta/ui-vue/foundation/oauth — third-party sign-in scripts, wrapped as composables.
// Foundation rather than `auth`: this layer knows nothing about sessions, strategies, or the
// backend. It loads a provider's client script, hands its global a config, and surfaces the
// credential the provider hands back. Turning that credential into a session is `auth`'s job, and
// posting it to a backend is the app's — the same split every other foundation browser-API wrapper
// keeps (`share`, `speech`, `geolocation`).
//
// Living here is also what lets `presentation` host a provider's button: `presentation → auth` is a
// disallowed edge (auth is a standalone top-level layer), `presentation → foundation` is not.

export {
  GoogleIdentityStatus,
  loadGoogleIdentity,
  useGoogleIdentity,
  provideGoogleIdentity,
  type GoogleButtonOptions,
  type GoogleCredentialResponse,
  type GoogleIdentityApi,
  type ProvideGoogleIdentityOptions,
} from './GoogleIdentity';
