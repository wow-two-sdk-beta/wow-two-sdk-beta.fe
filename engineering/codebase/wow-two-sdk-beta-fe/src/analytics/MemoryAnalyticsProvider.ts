// The test double — a sink that ships nowhere and remembers everything.
//
// Assertions want two different views of the same traffic: "which events fired" (`events`) and "what
// happened, in order, across all three call kinds" (`calls`). Deriving one from the other at every
// assertion site is noise, so both are recorded. The arrays surface through getters typed `readonly`, so
// a test reads the live capture without being able to push into it. `flushCount` is a plain counter
// rather than a spy, so drainage can be asserted without wiring a mocking library in.

import { AnalyticsCallKind, type AnalyticsCall, type AnalyticsEvent, type AnalyticsIdentity } from './AnalyticsEvent';
import type { AnalyticsProvider } from './AnalyticsProvider';

/** Defines the in-memory sink returned by {@link memoryAnalyticsProvider} — a provider plus the capture it records. */
export interface MemoryAnalyticsProvider extends AnalyticsProvider {
  /** Every call received, in dispatch order across all three kinds. */
  readonly calls: ReadonlyArray<AnalyticsCall>;

  /** The `track` events received, in order. */
  readonly events: ReadonlyArray<AnalyticsEvent>;

  /** The `page` events received, in order. */
  readonly pages: ReadonlyArray<AnalyticsEvent>;

  /** The `identify` payloads received, in order. */
  readonly identities: ReadonlyArray<AnalyticsIdentity>;

  /** How many times `flush` was invoked. */
  readonly flushCount: number;

  /** Clears every capture — for a `beforeEach` reset of a shared instance. */
  reset(): void;
}

/** Creates an in-memory sink capturing every call — the test double for asserting what an app reports. */
export function memoryAnalyticsProvider(): MemoryAnalyticsProvider {
  const calls: AnalyticsCall[] = [];
  const events: AnalyticsEvent[] = [];
  const pages: AnalyticsEvent[] = [];
  const identities: AnalyticsIdentity[] = [];
  let flushCount = 0;

  return {
    name: 'memory',

    get calls() {
      return calls;
    },
    get events() {
      return events;
    },
    get pages() {
      return pages;
    },
    get identities() {
      return identities;
    },
    get flushCount() {
      return flushCount;
    },

    track: (event) => {
      calls.push({ kind: AnalyticsCallKind.Track, event });
      events.push(event);
    },

    identify: (identity) => {
      calls.push({ kind: AnalyticsCallKind.Identify, identity });
      identities.push(identity);
    },

    page: (event) => {
      calls.push({ kind: AnalyticsCallKind.Page, event });
      pages.push(event);
    },

    flush: () => {
      flushCount += 1;
    },

    reset: () => {
      calls.length = 0;
      events.length = 0;
      pages.length = 0;
      identities.length = 0;
      flushCount = 0;
    },
  };
}
