import { describe, expect, it } from 'vitest';
import { AnalyticsFailurePhase, createAnalytics, DefaultPageName, memoryAnalyticsProvider } from '@src/analytics';

/*
 * Smoke depth, `unit` project (node). Two contracts carry the slice, and the second is the one
 * that matters in production: a call reaches every registered sink, and a SINK THAT THROWS is
 * isolated — analytics is the last thing that should be able to take down a checkout, so a
 * broken vendor script has to land in `onError` rather than in the caller's stack.
 *
 * Every case builds its own instance; the module-level `analytics` singleton is never touched.
 */

describe('delivery', () => {
  it('reaches a registered provider', () => {
    const sink = memoryAnalyticsProvider();
    const analytics = createAnalytics({ providers: [sink] });

    analytics.track('checkout_started', { plan: 'pro' });

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]?.name).toBe('checkout_started');
    expect(sink.events[0]?.properties).toMatchObject({ plan: 'pro' });
  });

  it('merges super-properties, with the call site winning on a shared key', () => {
    const sink = memoryAnalyticsProvider();
    const analytics = createAnalytics({ providers: [sink], context: { app: 'ui', tier: 'free' } });

    analytics.track('viewed', { tier: 'pro' });

    expect(sink.events[0]?.properties).toMatchObject({ app: 'ui', tier: 'pro' });
  });

  it('names an unnamed page view rather than emitting an empty one', () => {
    const sink = memoryAnalyticsProvider();
    createAnalytics({ providers: [sink] }).page();

    expect(sink.pages[0]?.name).toBe(DefaultPageName);
  });

  it('records an identity', () => {
    const sink = memoryAnalyticsProvider();
    createAnalytics({ providers: [sink] }).identify('user-7', { plan: 'pro' });

    expect(sink.identities[0]?.userId).toBe('user-7');
  });

  it('drops everything while disabled', () => {
    const sink = memoryAnalyticsProvider();
    const analytics = createAnalytics({ providers: [sink] });

    analytics.setEnabled(false);
    analytics.track('ignored');

    expect(analytics.isEnabled()).toBe(false);
    expect(sink.calls).toHaveLength(0);
  });
});

describe('sink isolation', () => {
  it('does not let a throwing provider reach the caller or starve the others', () => {
    const good = memoryAnalyticsProvider();
    const failures: { phase: AnalyticsFailurePhase }[] = [];
    const analytics = createAnalytics({
      providers: [
        {
          name: 'throwing',
          track: () => {
            throw new Error('vendor script down');
          },
        },
        good,
      ],
      onError: (_error, context) => failures.push({ phase: context.phase }),
    });

    expect(() => analytics.track('still_delivered')).not.toThrow();
    expect(good.events).toHaveLength(1);
    expect(failures).toEqual([{ phase: AnalyticsFailurePhase.Track }]);
  });

  it('swallows a rejected promise from a provider too', async () => {
    const failures: unknown[] = [];
    const analytics = createAnalytics({
      providers: [{ name: 'async-throwing', track: () => Promise.reject(new Error('later')) }],
      onError: (error) => failures.push(error),
    });

    analytics.track('fire and forget');
    // `track` is fire-and-forget by design, so the rejection lands a tick later — a macrotask
    // turn drains the microtask queue the `.then` handler is queued on.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(failures).toHaveLength(1);
  });
});

describe('buffering', () => {
  /* Calls made before any provider registers are held, then replayed — otherwise every event
     fired during app boot is lost, which is exactly the window a launch funnel needs. */
  it('replays calls made before the first provider registered', () => {
    const analytics = createAnalytics({});
    analytics.track('early');

    const sink = memoryAnalyticsProvider();
    analytics.register(sink);

    expect(sink.events.map((event) => event.name)).toContain('early');
  });
});

it('flush waits for already dispatched async delivery before flushing the vendor', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const order: string[] = [];
  const client = createAnalytics({
    providers: [
      {
        track: () =>
          pending.then(() => {
            order.push('delivered');
          }),
        flush: () => {
          order.push('flushed');
        },
      },
    ],
  });
  client.track('event');
  const flushed = client.flush();
  await Promise.resolve();
  expect(order).toEqual([]);
  release();
  await flushed;
  expect(order).toEqual(['delivered', 'flushed']);
});
