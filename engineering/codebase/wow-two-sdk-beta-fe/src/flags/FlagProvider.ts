import type { EvaluationContext, FlagErrorCode, FlagReason, FlagValue, JsonObject } from './FlagTypes';

/*
 * The backend seam: one interface a flag source implements (LaunchDarkly, Unleash, GrowthBook, a
 * `/api/flags` fetch, or the built-in `staticFlagProvider`). Everything above it — typing, defaulting,
 * targeting-context merge, Vue wiring — is source-agnostic.
 *
 * NOTE ON NAMING: `FlagProvider` (here) is the OpenFeature-shaped BACKEND ADAPTER. `FlagsProvider`
 * (plural, `FlagsProvider.vue`) is the Vue provider component. Same split as the spec, which pairs a
 * provider with `<OpenFeatureProvider/>`; the plural is always the component one.
 *
 * Resolution is SYNCHRONOUS by design, unlike the spec's async provider API. A flag read happens
 * inside a `computed` (`useFlag`), where an async read would force a suspense boundary or a loading
 * flicker on every gated element. So a provider holds an in-memory snapshot and resolves out of it;
 * fetching that snapshot is the adapter's own business, and `onContextChange` is the seam where a
 * remote adapter refetches after the targeting context moves.
 *
 * The four typed `resolve*` methods are typed for the CALLER's convenience only — the client
 * re-checks every resolved value at runtime, because a remote adapter's payload is untyped wire
 * data and a stale flag definition really does hand back a string for a boolean flag.
 */

/** Defines what a provider hands back for one flag — the spec's "resolution details". */
export interface FlagResolution<TValue extends FlagValue> {
  /** The resolved value, re-checked by the client. A wrong type falls back to the default, `reason: 'error'`. */
  readonly value: TValue;

  /** Why this value was produced. `static` when omitted, `targeting` on a rule match, `disabled` to gate off. */
  readonly reason?: FlagReason;

  /** The name of the matched variant — surfaced on the evaluation for analytics/exposure logging. */
  readonly variant?: string;

  /** A non-throwing failure channel; the client falls back to the default, `reason: 'error'`, and reports it. */
  readonly errorCode?: FlagErrorCode;

  /** A human-readable description accompanying `errorCode`. */
  readonly errorMessage?: string;
}

/**
 * Defines the flag source behind a {@link FlagClient}. Return `undefined` from a `resolve*` to say
 * "this flag is not configured" — the client then uses the caller's `defaultValue` with
 * `reason: 'default'`, no error reported. Throwing is allowed but not required: the client catches
 * every throw, falls back, and routes it to `onError`.
 */
export interface FlagProvider {
  /** An optional name for diagnostics / logs (`'static'`, `'launchdarkly'`). */
  readonly name?: string;

  /** Resolves a boolean flag; `undefined` when the flag is not configured. */
  resolveBoolean(key: string, context: EvaluationContext): FlagResolution<boolean> | undefined;

  /** Resolves a string flag; `undefined` when the flag is not configured. */
  resolveString(key: string, context: EvaluationContext): FlagResolution<string> | undefined;

  /** Resolves a number flag; `undefined` when the flag is not configured. */
  resolveNumber(key: string, context: EvaluationContext): FlagResolution<number> | undefined;

  /** Resolves a JSON object flag; `undefined` when the flag is not configured. */
  resolveObject(key: string, context: EvaluationContext): FlagResolution<JsonObject> | undefined;

  /**
   * Fires after the client's evaluation context changes — where a remote adapter refetches its
   * snapshot for the new targeting subject. A returned promise is awaited only to catch rejection
   * (routed to `onError`); evaluation never blocks on it.
   */
  onContextChange?(context: EvaluationContext): void | Promise<void>;
}
