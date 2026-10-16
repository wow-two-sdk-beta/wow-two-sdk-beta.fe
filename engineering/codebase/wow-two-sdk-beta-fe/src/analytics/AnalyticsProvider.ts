// The sink seam — one small interface between the client and whatever actually ships the data
// (GA · PostHog · Segment · a console logger · a test double).
//
// Every method is OPTIONAL: a sink that only cares about events implements `track` and nothing else, and
// the client skips what is absent instead of making each adapter stub three no-ops. Methods may return a
// promise, but the client never awaits one on the hot path — `track` stays fire-and-forget, so a rejected
// promise is routed to `onError` exactly like a synchronous throw (see `Analytics.ts`). `flush` is the one
// call a consumer awaits, for page-unload and test drainage.
//
// `AnalyticsFailurePhase` reuses the `AnalyticsCallKind` values and adds `flush`, so a handler can switch
// over one vocabulary covering every place a third-party sink can fail.

import { AnalyticsCallKind, type AnalyticsCall, type AnalyticsEvent, type AnalyticsIdentity } from './AnalyticsEvent';

/** Defines a sink the client fans calls out to — implement only the calls the vendor actually supports. */
export interface AnalyticsProvider {
  /** The name used in diagnostics and `onError` reporting. */
  readonly name?: string;

  /** Ships a tracked event. */
  readonly track?: (event: AnalyticsEvent) => void | Promise<void>;

  /** Binds subsequent events to a user. */
  readonly identify?: (identity: AnalyticsIdentity) => void | Promise<void>;

  /** Ships a page / screen view. */
  readonly page?: (event: AnalyticsEvent) => void | Promise<void>;

  /** Drains whatever the sink batched — the only method `Analytics.flush()` awaits. */
  readonly flush?: () => void | Promise<void>;
}

/** Defines where a provider failure came from — the three call kinds plus `flush`. */
export const AnalyticsFailurePhase = {
  /** Refers to a failure raised by `track`. */
  Track: AnalyticsCallKind.Track,
  /** Refers to a failure raised by `identify`. */
  Identify: AnalyticsCallKind.Identify,
  /** Refers to a failure raised by `page`. */
  Page: AnalyticsCallKind.Page,
  /** Refers to a failure raised by `flush`. */
  Flush: 'flush',
} as const;

export type AnalyticsFailurePhase = (typeof AnalyticsFailurePhase)[keyof typeof AnalyticsFailurePhase];

/** Defines the context handed to `onError` when a sink throws or rejects. */
export interface AnalyticsErrorContext {
  /** The provider that failed. */
  readonly provider: AnalyticsProvider;

  /** The phase the failure came from. */
  readonly phase: AnalyticsFailurePhase;

  /** The call being dispatched — omitted for a `flush` failure, which belongs to no single call. */
  readonly call?: AnalyticsCall;
}

/** Defines the sink-failure handler; analytics never breaks the caller, so a provider throw lands here. */
export type AnalyticsErrorHandler = (error: unknown, context: AnalyticsErrorContext) => void;
