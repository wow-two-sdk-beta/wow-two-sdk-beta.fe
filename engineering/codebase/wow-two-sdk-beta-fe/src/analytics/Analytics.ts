// The client every app talks to. Five decisions worth stating, because none of them is the obvious one:
//
// - **Failure isolation.** A sink is third-party code on a non-critical path, so a throwing (or rejecting)
//   provider must never reach the caller — `track()` is called from render paths and click handlers where
//   an exception is a real bug. Every dispatch is wrapped and routed to `onError`; one broken provider
//   never stops the others in the fan-out.
// - **Buffering before ready.** Vendor scripts load late, so calls made before any provider registers are
//   queued (drop-oldest at `maxQueueSize`) and replayed on the first `register`. Without this the most
//   valuable events — the ones at app start — are exactly the ones silently lost.
// - **The enabled gate is read at CALL time, not at construction.** Consent and Do-Not-Track resolve after
//   the client exists. Disabled calls do not queue either, and `setEnabled(false)` DROPS what is already
//   buffered: replaying pre-consent events the moment consent is granted would defeat the gate.
// - **Super-properties merge into event properties only, never into `identify` traits.** Traits describe
//   the person, properties describe the moment; merging the two writes request-scoped noise into the
//   permanent user profile.
// - **The queue drains to the newly registered provider only.** The buffer is non-empty only while no
//   provider is registered, so the one that registers is the only possible recipient — a later provider
//   gets live traffic, never a replay of history it was absent for.

import {
  AnalyticsCallKind,
  DefaultPageName,
  type AnalyticsCall,
  type AnalyticsEvent,
  type AnalyticsIdentity,
  type AnalyticsProperties,
} from './AnalyticsEvent';
import { AnalyticsFailurePhase, type AnalyticsErrorHandler, type AnalyticsProvider } from './AnalyticsProvider';

/** Narrows an unknown sink return value to a thenable — a vendor adapter may hand back a non-native promise. */
function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && typeof (value as { then?: unknown }).then === 'function';
}

/** Defines the options for {@link createAnalytics}. */
export interface AnalyticsOptions {
  /** The sinks registered up front; more may join later via `register`. */
  readonly providers?: ReadonlyArray<AnalyticsProvider>;

  /** Whether calls dispatch at all. Default `true`; flip at runtime with `setEnabled` for consent / Do-Not-Track. */
  readonly enabled?: boolean;

  /** The initial super-properties merged into every event. */
  readonly context?: AnalyticsProperties;

  /** The calls buffered while no provider is registered; the oldest drops past it. Default `100`, `0` disables. */
  readonly maxQueueSize?: number;

  /** Receives every sink failure. Omitted means failures are swallowed — analytics is never worth an app crash. */
  readonly onError?: AnalyticsErrorHandler;

  /** Supplies the call timestamp (epoch ms) — injectable for deterministic tests. Default `Date.now`. */
  readonly now?: () => number;
}

/** Defines the headless analytics client — fans the three canonical calls out to every registered sink. */
export interface Analytics {
  /** Records a named event, with super-properties merged under the given properties. */
  track(name: string, properties?: AnalyticsProperties): void;

  /** Binds subsequent calls to a user, with optional traits describing them. */
  identify(userId: string, traits?: AnalyticsProperties): void;

  /** Records a page / screen view; the name defaults to {@link DefaultPageName}. */
  page(name?: string, properties?: AnalyticsProperties): void;

  /** Merges super-properties into the set attached to every subsequent event. */
  setContext(context: AnalyticsProperties): void;

  /** Drops every super-property. */
  clearContext(): void;

  /** Reads a copy of the current super-properties. */
  getContext(): AnalyticsProperties;

  /** Registers a sink, replaying anything buffered into it; returns an unregister. */
  register(provider: AnalyticsProvider): () => void;

  /** Turns dispatch on / off at runtime — the consent gate. Turning it off discards anything still buffered. */
  setEnabled(enabled: boolean): void;

  /** Reports whether dispatch is currently on. */
  isEnabled(): boolean;

  /** Awaits dispatched calls, then every registered sink's optional `flush` — for page unload and test drainage. */
  flush(): Promise<void>;
}

/** Creates an {@link Analytics} client — one per app. Without isolation, use the default {@link analytics}. */
export function createAnalytics(options: AnalyticsOptions = {}): Analytics {
  const { maxQueueSize = 100, onError, now = Date.now } = options;
  if (!Number.isSafeInteger(maxQueueSize) || maxQueueSize < 0) {
    throw new RangeError('Analytics maxQueueSize must be a non-negative safe integer.');
  }
  const providers = new Set<AnalyticsProvider>(options.providers ?? []);
  const queue: AnalyticsCall[] = [];
  const pendingDeliveries = new Set<Promise<void>>();
  let context: AnalyticsProperties = { ...options.context };
  let enabled = options.enabled ?? true;

  /** Routes a sink failure to `onError`; an `onError` that throws is swallowed, having nowhere left to report. */
  const report = (
    error: unknown,
    provider: AnalyticsProvider,
    phase: AnalyticsFailurePhase,
    call?: AnalyticsCall,
  ): void => {
    if (!onError) return;
    try {
      onError(error, { provider, phase, call });
    } catch {
      // The handler is the last line of defence; a throw here must not reach the caller either.
    }
  };

  /** Invokes one sink method isolated — a throw and a rejected promise both land in `report`. */
  const invoke = (
    provider: AnalyticsProvider,
    phase: AnalyticsFailurePhase,
    call: AnalyticsCall | undefined,
    method: () => void | Promise<void>,
  ): Promise<void> => {
    try {
      const result: unknown = method();
      if (isPromiseLike(result)) {
        return Promise.resolve(result).then(
          () => undefined,
          (error: unknown) => report(error, provider, phase, call),
        );
      }
    } catch (error) {
      report(error, provider, phase, call);
    }
    return Promise.resolve();
  };

  /** Delivers one call to one sink, picking the matching method — an absent method is simply skipped. */
  const deliverNow = (provider: AnalyticsProvider, call: AnalyticsCall): Promise<void> => {
    switch (call.kind) {
      case AnalyticsCallKind.Track:
        return invoke(provider, AnalyticsFailurePhase.Track, call, () => provider.track?.(call.event));
      case AnalyticsCallKind.Identify:
        return invoke(provider, AnalyticsFailurePhase.Identify, call, () => provider.identify?.(call.identity));
      case AnalyticsCallKind.Page:
        return invoke(provider, AnalyticsFailurePhase.Page, call, () => provider.page?.(call.event));
    }
  };

  const deliver = (provider: AnalyticsProvider, call: AnalyticsCall): Promise<void> => {
    const pending = deliverNow(provider, call);
    pendingDeliveries.add(pending);
    void pending.finally(() => pendingDeliveries.delete(pending));
    return pending;
  };

  /** Fans one call out to every registered sink, or buffers it while none has registered yet. */
  const dispatch = (call: AnalyticsCall): void => {
    if (!enabled) return;

    if (providers.size === 0) {
      if (maxQueueSize <= 0) return;
      while (queue.length >= maxQueueSize) queue.shift();
      queue.push(call);
      return;
    }

    for (const provider of providers) void deliver(provider, call);
  };

  /** Builds the event — super-properties spread first so a call-site key of the same name wins. */
  const toEvent = (name: string, properties?: AnalyticsProperties): AnalyticsEvent => {
    const merged: AnalyticsProperties = { ...context, ...properties };
    const timestamp = now();
    return Object.keys(merged).length > 0 ? { name, properties: merged, timestamp } : { name, timestamp };
  };

  return {
    track(name: string, properties?: AnalyticsProperties): void {
      dispatch({ kind: AnalyticsCallKind.Track, event: toEvent(name, properties) });
    },

    identify(userId: string, traits?: AnalyticsProperties): void {
      const timestamp = now();
      const identity: AnalyticsIdentity = traits ? { userId, traits: { ...traits }, timestamp } : { userId, timestamp };
      dispatch({ kind: AnalyticsCallKind.Identify, identity });
    },

    page(name?: string, properties?: AnalyticsProperties): void {
      dispatch({ kind: AnalyticsCallKind.Page, event: toEvent(name ?? DefaultPageName, properties) });
    },

    setContext(next: AnalyticsProperties): void {
      context = { ...context, ...next };
    },

    clearContext(): void {
      context = {};
    },

    getContext(): AnalyticsProperties {
      return { ...context };
    },

    register(provider: AnalyticsProvider): () => void {
      providers.add(provider);

      if (queue.length > 0) {
        for (const call of queue.splice(0, queue.length)) void deliver(provider, call);
      }

      return () => void providers.delete(provider);
    },

    setEnabled(next: boolean): void {
      enabled = next;
      if (!next) queue.length = 0;
    },

    isEnabled(): boolean {
      return enabled;
    },

    async flush(): Promise<void> {
      await Promise.all([...pendingDeliveries]);
      const drains = [...providers].map((provider) =>
        invoke(provider, AnalyticsFailurePhase.Flush, undefined, () => provider.flush?.()),
      );
      await Promise.all(drains);
    },
  };
}

/** The default app-wide client — what the bare {@link track} / {@link identify} / {@link page} helpers bind to. */
export const analytics: Analytics = createAnalytics();

/** Records a named event on the default {@link analytics} client — the `track('signup_completed')` entry point. */
export function track(name: string, properties?: AnalyticsProperties): void {
  analytics.track(name, properties);
}

/** Binds subsequent calls on the default {@link analytics} client to a user. */
export function identify(userId: string, traits?: AnalyticsProperties): void {
  analytics.identify(userId, traits);
}

/** Records a page / screen view on the default {@link analytics} client. */
export function page(name?: string, properties?: AnalyticsProperties): void {
  analytics.page(name, properties);
}
