// The wire model every sink sees. Three canonical calls (`track` · `identify` · `page`) rather than one
// generic event, because every vendor (GA · PostHog · Segment) models exactly these three — a single
// shape would force each adapter to re-derive the distinction from a magic property name. `page` carries
// the same `AnalyticsEvent` payload as `track` but stays a separate call so an adapter can route it to a
// pageview rather than a custom event.
//
// Two non-obvious decisions:
//
// - **The client stamps `timestamp`, not the adapter.** A call buffered before a provider registers keeps
//   the time it HAPPENED, not the time it was delivered — otherwise the whole pre-init window collapses
//   onto the instant the vendor script finished loading.
// - **`AnalyticsCall` exists for that buffer.** Replay has to preserve `identify` → `track` ordering (an
//   event replayed before its identify attaches to the wrong profile), so the queue holds discriminated
//   calls rather than a flat event list.

/** Defines the free-form properties attached to a call — JSON-shaped values a sink serializes. */
export type AnalyticsProperties = Record<string, unknown>;

/** Provides the event name used when `page()` is called without one — sinks route it as a page / screen view. */
export const DefaultPageName = 'page_view';

/** Defines a single analytics event handed to every registered sink — the payload of a `track` or `page` call. */
export interface AnalyticsEvent {
  /** The event name (`'checkout_completed'`; a route like `'/pricing'` for a page). */
  readonly name: string;

  /** The merged properties — super-properties first, call-site values winning. Omitted when empty. */
  readonly properties?: AnalyticsProperties;

  /** When the call happened (epoch ms), stamped at call time — never at delivery time. */
  readonly timestamp: number;
}

/** Defines the payload of an `identify` call — who the user is, plus optional descriptive traits. */
export interface AnalyticsIdentity {
  /** The stable user id the sink keys the profile on. */
  readonly userId: string;

  /** The user traits (email, plan, locale…) — these describe the PERSON, so super-properties are never merged in. */
  readonly traits?: AnalyticsProperties;

  /** When the call happened (epoch ms), stamped at call time. */
  readonly timestamp: number;
}

/** Defines the kind of call dispatched or buffered — the discriminant of {@link AnalyticsCall}. */
export const AnalyticsCallKind = {
  /** Refers to a `track` call — a named event. */
  Track: 'track',
  /** Refers to an `identify` call — binding subsequent events to a user. */
  Identify: 'identify',
  /** Refers to a `page` call — a page / screen view. */
  Page: 'page',
} as const;

export type AnalyticsCallKind = (typeof AnalyticsCallKind)[keyof typeof AnalyticsCallKind];

/** Defines one dispatched or buffered call — discriminated so a replayed queue preserves cross-kind ordering. */
export type AnalyticsCall =
  /** Refers to a `track` call carrying its named event. */
  | { readonly kind: typeof AnalyticsCallKind.Track; readonly event: AnalyticsEvent }
  /** Refers to an `identify` call carrying its user identity. */
  | { readonly kind: typeof AnalyticsCallKind.Identify; readonly identity: AnalyticsIdentity }
  /** Refers to a `page` call carrying its page-view event. */
  | { readonly kind: typeof AnalyticsCallKind.Page; readonly event: AnalyticsEvent };
