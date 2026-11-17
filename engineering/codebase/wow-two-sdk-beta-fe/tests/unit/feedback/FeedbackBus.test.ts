import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@src/foundation/http';
import {
  createFeedbackBus,
  feedbackQueryErrors,
  NoticePriority,
  NoticeTone,
  toErrorNotice,
  type FeedbackNotice,
  type FeedbackNotificationState,
  type NoticeListener,
} from '@src/feedback';
import { keep, record, watch } from './FeedbackBusHarness';

/*
 * `unit` project (node). The bus is the seam between "something failed" and "something is on screen": delivery
 * and the id every notice comes back with, isolation from broken subscribers, dismissal, the toast pause and its
 * bypass, reset and dispose, and the query-error adapter. History lives in `FeedbackBusHistory`, `track` in
 * `FeedbackBusTrack`.
 */

const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);

describe('delivery', () => {
  it('delivers a notice to every subscriber', () => {
    const { bus, seen: first } = watch();
    const second = record(bus);

    bus.notify({ tone: NoticeTone.Success, title: 'Saved' });

    expect(first.map((notice) => notice.title)).toEqual(['Saved']);
    expect(second).toHaveLength(1);
  });

  it('returns the published id, and generates one when the caller gives none', () => {
    const { bus, seen } = watch();

    const generated = bus.notify({ tone: NoticeTone.Info, title: 'A' });
    const explicit = bus.notify({ tone: NoticeTone.Info, title: 'B', id: 'mine' });

    expect(generated).toBeTruthy();
    expect(explicit).toBe('mine');
    expect(seen.map((notice) => notice.id)).toEqual([generated, 'mine']);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = createFeedbackBus();
    const titles: string[] = [];
    const unsubscribe = bus.subscribe((notice) => titles.push(String(notice.title)));

    bus.notify({ tone: NoticeTone.Info, title: 'before' });
    unsubscribe();
    bus.notify({ tone: NoticeTone.Info, title: 'after' });

    expect(titles).toEqual(['before']);
  });
});

/*
 * A subscriber is adapter code the publisher does not own, and `notify()` is called from click handlers and
 * `catch` blocks. So the fan-out isolates each listener: one that throws costs its own delivery and nothing
 * else — not the subscribers after it in the set, and not the caller.
 */
describe('subscriber isolation', () => {
  const boom = new Error('adapter down');

  /** Builds a listener that always throws — the broken presentation adapter. */
  const throwing = (): NoticeListener => () => {
    throw boom;
  };

  it('keeps delivering past a throwing subscriber, and still returns the id to the caller', () => {
    const bus = createFeedbackBus();
    const first = record(bus);
    bus.subscribe(throwing());
    const third = record(bus);

    expect(bus.notify({ tone: NoticeTone.Success, title: 'Saved', id: 'mine' })).toBe('mine');

    expect(first.map((notice) => notice.title)).toEqual(['Saved']);
    expect(third.map((notice) => notice.title)).toEqual(['Saved']);
  });

  it('reports every failure to onError with the listener and the notice in flight, and keeps the listener', () => {
    const failures: { error: unknown; listener: unknown; title: unknown }[] = [];
    const broken = throwing();
    const bus = createFeedbackBus({
      onError: (error, context) => failures.push({ error, listener: context.listener, title: context.notice.title }),
    });
    bus.subscribe(broken);

    bus.notify({ tone: NoticeTone.Info, title: 'Heads up' });
    bus.notify({ tone: NoticeTone.Info, title: 'Again' });

    expect(failures).toEqual([
      { error: boom, listener: broken, title: 'Heads up' },
      { error: boom, listener: broken, title: 'Again' },
    ]);
  });

  it('survives an onError that itself throws', () => {
    const bus = createFeedbackBus({
      onError: () => {
        throw new Error('handler down');
      },
    });
    bus.subscribe(throwing());
    const healthy = record(bus);

    expect(() => bus.notify({ tone: NoticeTone.Info, title: 'still delivered' })).not.toThrow();
    expect(healthy).toHaveLength(1);
  });

  it('isolates a throwing dismiss listener', () => {
    const bus = createFeedbackBus();
    const healthy = vi.fn();
    bus.subscribeDismiss(() => {
      throw new Error('observer');
    });
    bus.subscribeDismiss(healthy);

    expect(() => bus.dismiss('x')).not.toThrow();
    expect(healthy).toHaveBeenCalledExactlyOnceWith('x');
  });
});

describe('dismiss', () => {
  it('closes the toast of any id and leaves retained history and unread state alone', () => {
    const bus = createFeedbackBus();
    const dismissed: Array<string | null> = [];
    bus.subscribeDismiss((id) => dismissed.push(id));
    bus.notify(keep('kept'));
    const before = bus.retained();
    const state = bus.notificationState();

    bus.dismiss('toast-only');
    bus.dismiss('kept');

    expect(dismissed).toEqual(['toast-only', 'kept']);
    expect(bus.retained()).toBe(before);
    expect(bus.notificationState()).toBe(state);
    expect(bus.notificationState().unreadIds).toEqual(['kept']);
  });
});

describe('toast pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const notice = (priority?: FeedbackNotice['priority']): FeedbackNotice => ({
    title: 'n',
    tone: NoticeTone.Info,
    ...(priority ? { priority } : {}),
  });

  it('resumes a timed pause on its own without replaying the deliveries made during it', () => {
    const { bus, seen } = watch();
    const states: FeedbackNotificationState[] = [];
    bus.subscribeNotificationState((state) => states.push(state));
    bus.setToastPause(NOW + 90_000);
    bus.notify(keep('run'));
    bus.notify({ title: 'Transient', tone: NoticeTone.Info });
    expect(states.at(-1)).toEqual({ pausedUntil: NOW + 90_000, unreadCount: 1, unreadIds: ['run'] });

    vi.advanceTimersByTime(90_000);

    expect(states.at(-1)).toEqual({ pausedUntil: null, unreadCount: 1, unreadIds: ['run'] });
    expect(seen).toHaveLength(2);
  });

  it('never ends a manual pause on its own, and reset clears it', () => {
    const bus = createFeedbackBus();
    bus.setToastPause('manual');
    vi.advanceTimersByTime(24 * 60 * 60_000);
    expect(bus.notificationState().pausedUntil).toBe('manual');

    bus.reset();

    expect(bus.notificationState()).toEqual({ pausedUntil: null, unreadCount: 0, unreadIds: [] });
  });

  it.each<{ bypass?: NoticePriority; through: Array<NoticePriority | undefined> }>([
    { bypass: undefined, through: [] },
    {
      bypass: NoticePriority.Normal,
      through: [undefined, NoticePriority.Normal, NoticePriority.High, NoticePriority.Urgent],
    },
    { bypass: NoticePriority.High, through: [NoticePriority.High, NoticePriority.Urgent] },
  ])(
    'with bypass $bypass, suppresses nothing before a pause and only what is below the bypass during one',
    ({ bypass, through }) => {
      const bus = createFeedbackBus({ pauseBypass: bypass });
      const priorities = [undefined, ...Object.values(NoticePriority)];
      for (const priority of priorities) expect(bus.suppresses(notice(priority)), String(priority)).toBe(false);

      bus.setToastPause('manual');

      for (const priority of priorities) {
        expect(bus.suppresses(notice(priority)), String(priority)).toBe(!through.includes(priority));
      }
    },
  );

  it('stops suppressing once a timed pause has elapsed, even before the resume timer fires', () => {
    const bus = createFeedbackBus();
    bus.setToastPause(NOW + 1_000);
    expect(bus.suppresses(notice())).toBe(true);

    vi.setSystemTime(NOW + 1_000);

    expect(bus.suppresses(notice())).toBe(false);
    expect(bus.notificationState().pausedUntil).toBeNull();
  });

  it('still closes every live toast when a pause starts', () => {
    const bus = createFeedbackBus({ pauseBypass: NoticePriority.Urgent });
    const dismiss = vi.fn();
    bus.subscribeDismiss(dismiss);
    bus.setToastPause('manual');
    expect(dismiss).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('rejects a bypass that is not a notice priority', () => {
    for (const pauseBypass of ['critical', '', 'HIGH', 2, null] as unknown as Array<FeedbackNotice['priority']>) {
      expect(() => createFeedbackBus({ pauseBypass }), String(pauseBypass)).toThrow(RangeError);
    }
    for (const pauseBypass of [undefined, ...Object.values(NoticePriority)]) {
      expect(() => createFeedbackBus({ pauseBypass })).not.toThrow();
    }
  });
});

describe('reset and dispose', () => {
  it('resets one bus without changing another, keeping subscriptions through throwing observers', () => {
    const first = createFeedbackBus();
    const second = createFeedbackBus();
    const dismiss = vi.fn();
    const notices = vi.fn();
    first.subscribeDismiss(dismiss);
    first.subscribe(notices);
    first.subscribeRetained(() => {
      throw new Error('observer');
    });
    first.subscribeDismiss(() => {
      throw new Error('observer');
    });
    for (const bus of [first, second]) bus.notify(keep('kept'));

    expect(() => first.reset()).not.toThrow();

    expect(first.retained()).toEqual([]);
    expect(second.retained()).toHaveLength(1);
    expect(dismiss).toHaveBeenCalledWith(null);
    first.notify({ title: 'New session', tone: NoticeTone.Info });
    expect(notices).toHaveBeenCalledTimes(2);
  });

  it('goes inert after dispose, and a second dispose is safe', () => {
    const { bus, seen } = watch();
    const dismiss = vi.fn();
    bus.subscribeDismiss(dismiss);
    bus.notify(keep('a'));
    bus.setToastPause('manual');
    bus.dispose();
    seen.length = 0;
    dismiss.mockClear();

    bus.notify(keep('late'));
    bus.dismiss('a');
    bus.clearRetained();

    expect(seen).toEqual([]);
    expect(dismiss).not.toHaveBeenCalled();
    expect(bus.retained()).toEqual([]);
    expect(bus.suppresses({ title: 'n', tone: NoticeTone.Info })).toBe(false);
    expect(() => bus.dispose()).not.toThrow();
  });
});

describe('safe query feedback', () => {
  /** A reporter that records each captured error. */
  const reporterOf = (captured: unknown[] = []) => ({
    capture: (error?: unknown) => {
      captured.push(error);
      return { id: 'i', occurredAt: '', send: async () => ({ id: 'i' }), build: async () => ({}) as never };
    },
  });

  it('uses only display-safe catalog text, excluding backend diagnostics', () => {
    const failure = new ApiError(422, { title: 'private', detail: 'secret' }).failure;
    expect(toErrorNotice(failure)).toEqual({ tone: NoticeTone.Danger, title: failure.message });
  });

  it('publishes ordinary failures and suppresses cancellation', () => {
    const { bus, seen } = watch();
    feedbackQueryErrors(bus)(new ApiError(404, null).failure);
    feedbackQueryErrors(bus)({ type: 'cancelled', message: 'Cancelled.' });
    expect(seen).toHaveLength(1);
  });

  it('offers a one-click report only for failures that point at a defect or an outage', () => {
    const { bus, seen } = watch();
    const captured: unknown[] = [];
    const onError = feedbackQueryErrors(bus, { reporter: reporterOf(captured) });

    onError(new ApiError(500, null).failure);
    onError(new ApiError(404, null).failure);
    onError({ type: 'timeout', message: 'Timed out.' });

    expect(seen.map((notice) => typeof notice.report)).toEqual(['function', 'undefined', 'function']);
    expect(captured).toHaveLength(2);
  });

  it('lets the app decide which failures are reportable', () => {
    const { bus, seen } = watch();
    feedbackQueryErrors(bus, { reporter: reporterOf(), isReportable: (error) => error.type === 'conflict' })(
      new ApiError(409, null).failure,
    );
    expect(seen[0]!.report).toBeTypeOf('function');
  });
});
