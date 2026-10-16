// @wow-two-beta/ui-vue/analytics — headless analytics event bus. App code reports the three canonical
// calls (`track('signup_completed')` / `identify(userId)` / `page('/pricing')` on the default client, or
// `createAnalytics()` for isolation) and a sink adapter ships them — `register(provider)` plugs in GA,
// PostHog, Segment, `consoleAnalyticsProvider()` in dev, or `memoryAnalyticsProvider()` in a test.
//
// The client absorbs the four things every app otherwise re-implements around a vendor SDK: a runtime
// consent gate (`setEnabled`, no-op when off), super-properties merged into every event (`setContext`),
// failure isolation so a broken sink never surfaces to the caller (routed to `onError` instead), and a
// bounded pre-init buffer so events fired before the vendor script loads are replayed rather than lost.
//
// Seam mirrors `/feedback` exactly — a factory plus a module-scope default singleton with bare convenience
// functions bound to it. No provide/inject, no composable: this subpath is peer-free (see the `analytics`
// element in `eslint.config.js` and its vite entry), and a provider component would pull Vue in as a
// runtime import for zero gain — an analytics client has no per-subtree scope to distribute. Nothing
// auto-registers; every wire is explicit opt-in (GWDNBM).
//
// Framework-free all the way down: this module is the Vue port's only subpath that is a byte-for-byte
// copy of its React original apart from this header. It touches no browser global (`Date.now` and
// `console` only), so it imports and runs unchanged under SSR.

// Event contract — the wire model every sink sees
export {
  AnalyticsCallKind,
  DefaultPageName,
  type AnalyticsEvent,
  type AnalyticsIdentity,
  type AnalyticsProperties,
  type AnalyticsCall,
} from './AnalyticsEvent';

// Sink seam — the adapter interface plus its failure vocabulary
export {
  AnalyticsFailurePhase,
  type AnalyticsProvider,
  type AnalyticsErrorContext,
  type AnalyticsErrorHandler,
} from './AnalyticsProvider';

// Client — factory, default singleton, bound convenience calls
export { createAnalytics, analytics, track, identify, page, type Analytics, type AnalyticsOptions } from './Analytics';

// Built-in sinks — dev logger + test double
export { consoleAnalyticsProvider, type ConsoleAnalyticsProviderOptions } from './ConsoleAnalyticsProvider';
export { memoryAnalyticsProvider, type MemoryAnalyticsProvider } from './MemoryAnalyticsProvider';
