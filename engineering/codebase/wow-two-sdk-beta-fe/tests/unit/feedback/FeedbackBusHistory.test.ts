import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFeedbackBus,
  NoticeCategory,
  NoticeTone,
  type FeedbackNotificationState,
  type FeedbackReminderOptions,
  type PublishedNotice,
} from '@src/feedback';
import { abortableSchedule, ids, keep, record } from './FeedbackBusHarness';

/*
 * `unit` project (node). Covers the bus's retained history: what it keeps and replays, removal, publication
 * timestamps, seeds, the retained cap, clear-all, per-entry unread state and reminders. Fake timers pin
 * `Date.now()` so every timestamp is exact.
 */

const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('retention', () => {
  it('retains only explicit retained notices, even when transient notices have infinite duration', () => {
    const bus = createFeedbackBus();
    bus.notify({ title: 'Toast only', tone: NoticeTone.Info, durationMs: Infinity });
    bus.notify(keep('keep', { tone: NoticeTone.Warning }));
    expect(ids(bus)).toEqual(['keep']);
    expect(Object.isFrozen(bus.retained())).toBe(true);
    expect(Object.isFrozen(bus.retained()[0])).toBe(true);
  });

  it('replays the history to a later subscriber and updates a stable id in place', () => {
    const bus = createFeedbackBus();
    bus.notify(keep('keep', { title: 'Earlier' }));
    const snapshot = vi.fn<(notices: ReadonlyArray<PublishedNotice>) => void>();
    const unsubscribe = bus.subscribeRetained(snapshot);
    expect(snapshot.mock.calls[0]?.[0].map((notice) => notice.title)).toEqual(['Earlier']);

    bus.notify(keep('keep', { title: 'Updated' }));
    expect(snapshot.mock.calls[1]?.[0].map((notice) => notice.title)).toEqual(['Updated']);

    unsubscribe();
    bus.remove('keep');
    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('removes only retained ids, newest first, closing the removed toast and dropping it from unread', () => {
    const bus = createFeedbackBus();
    const dismiss = vi.fn();
    bus.subscribeDismiss(dismiss);
    for (const id of ['first', 'second']) bus.notify(keep(id));
    expect(ids(bus)).toEqual(['second', 'first']);

    bus.remove('missing');
    expect(dismiss).not.toHaveBeenCalled();
    bus.remove('first');

    expect(ids(bus)).toEqual(['second']);
    expect(dismiss).toHaveBeenCalledExactlyOnceWith('first');
    expect(bus.notificationState().unreadIds).toEqual(['second']);
  });
});

describe('publication timestamps', () => {
  it('stamps the publication time and honours a finite supplied time', () => {
    const bus = createFeedbackBus();
    const seen = record(bus);

    bus.notify({ id: 'a', title: 'a', tone: NoticeTone.Info });
    bus.notify({ id: 'b', title: 'b', tone: NoticeTone.Info, publishedAtMs: 1_000 });
    bus.notify({ id: 'c', title: 'c', tone: NoticeTone.Info, publishedAtMs: Number.NaN });
    bus.notify({ id: 'd', title: 'd', tone: NoticeTone.Info, publishedAtMs: Infinity });

    expect(seen.map((notice) => notice.publishedAtMs)).toEqual([NOW, 1_000, NOW, NOW]);
  });

  it('keeps the original time when a retained id is republished, and drops it once republished transient', () => {
    const bus = createFeedbackBus();
    const seen = record(bus);

    bus.notify(keep('job'));
    vi.setSystemTime(NOW + 5_000);
    bus.notify(keep('job', { title: 'Updated', publishedAtMs: NOW + 9_000 }));
    vi.setSystemTime(NOW + 8_000);
    bus.notify({ id: 'job', title: 'Now transient', tone: NoticeTone.Success });

    expect(seen.map((notice) => notice.publishedAtMs)).toEqual([NOW, NOW, NOW]);
    expect(bus.retained()).toEqual([]);
  });

  it('stamps a first retained publication and restamps once the id left the history', () => {
    const bus = createFeedbackBus();
    bus.notify(keep('job', { publishedAtMs: 42 }));
    expect(bus.retained()[0]?.publishedAtMs).toBe(42);

    bus.remove('job');
    vi.setSystemTime(NOW + 1_000);
    bus.notify(keep('job'));
    expect(bus.retained()[0]?.publishedAtMs).toBe(NOW + 1_000);
  });
});

describe('seeds', () => {
  it('gives each seed its own supplied time or the creation time, keeps it on republish, and starts it read', () => {
    const bus = createFeedbackBus({
      initialRetained: [
        { id: 'newest', title: 'Newest', tone: NoticeTone.Info, publishedAtMs: 9_000 },
        { id: 'untimed', title: 'Untimed', tone: NoticeTone.Info },
        { id: 'broken', title: 'Broken', tone: NoticeTone.Info, publishedAtMs: Number.NaN },
      ],
    });
    vi.setSystemTime(NOW + 60_000);

    expect(bus.retained().map((notice) => [notice.id, notice.publishedAtMs])).toEqual([
      ['newest', 9_000],
      ['untimed', NOW],
      ['broken', NOW],
    ]);
    expect(bus.retained().every((notice) => notice.category === NoticeCategory.Retained)).toBe(true);
    expect(bus.notificationState()).toEqual({ pausedUntil: null, unreadCount: 0, unreadIds: [] });

    bus.notify(keep('newest', { title: 'Updated' }));
    expect(bus.retained()[0]).toMatchObject({ id: 'newest', title: 'Updated', publishedAtMs: 9_000 });
  });

  it('hydrates seeds without replaying them or colliding with generated ids', () => {
    const bus = createFeedbackBus({ initialRetained: [{ id: 'n_1', title: 'Earlier', tone: NoticeTone.Info }] });
    const published = vi.fn();
    bus.subscribe(published);
    expect(published).not.toHaveBeenCalled();
    expect(bus.notify({ title: 'New', tone: NoticeTone.Info })).toBe('n_2');
    expect(bus.retained()[0]?.title).toBe('Earlier');
  });
});

describe('history cap', () => {
  it('keeps the newest 200 entries by default', () => {
    const bus = createFeedbackBus();
    for (let index = 0; index < 205; index += 1) bus.notify(keep(`n${index}`));

    expect(bus.retained()).toHaveLength(200);
    expect(bus.retained()[0]?.id).toBe('n204');
    expect(bus.retained().at(-1)?.id).toBe('n5');
    expect(bus.notificationState().unreadCount).toBe(200);
  });

  it('trims the oldest entries and their unread ids after each change, and leaves live toasts open', () => {
    const bus = createFeedbackBus({ maxRetained: 2 });
    const snapshots: string[][] = [];
    const dismiss = vi.fn();
    bus.subscribeRetained((list) => snapshots.push(list.map((notice) => notice.id)));
    bus.subscribeDismiss(dismiss);

    bus.notify(keep('a'));
    bus.notify(keep('b'));
    bus.markRead('b');
    bus.notify(keep('c'));

    expect(ids(bus)).toEqual(['c', 'b']);
    expect(snapshots).toEqual([[], ['a'], ['b', 'a'], ['c', 'b']]);
    expect(bus.notificationState()).toMatchObject({ unreadCount: 1, unreadIds: ['c'] });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('does not trim when a retained id is republished in place', () => {
    const bus = createFeedbackBus({ maxRetained: 2 });
    bus.notify(keep('a'));
    bus.notify(keep('b'));
    bus.notify(keep('a', { title: 'Updated' }));

    expect(ids(bus)).toEqual(['b', 'a']);
    expect(bus.retained()[1]?.title).toBe('Updated');
  });

  it('cancels the pending reminder of a dropped entry', async () => {
    const { schedule, aborted } = abortableSchedule();
    const bus = createFeedbackBus({ maxRetained: 1, reminders: { delayMs: 1_000, schedule } });
    bus.notify(keep('a', { reminderKey: 'k:a' }));
    const settled = bus.remindLater!(bus.retained()[0]!).catch((error: unknown) => error);
    await Promise.resolve();
    expect(schedule).toHaveBeenCalledOnce();
    expect(aborted).toEqual([]);

    bus.notify(keep('b'));

    expect(aborted).toEqual(['a']);
    expect(await settled).toHaveProperty('name', 'AbortError');
  });

  it('caps the initial snapshot, newest first', () => {
    const bus = createFeedbackBus({
      maxRetained: 2,
      initialRetained: ['x', 'y', 'z'].map((id) => ({ id, title: id, tone: NoticeTone.Info })),
    });
    expect(ids(bus)).toEqual(['x', 'y']);
  });

  it('keeps everything with an infinite cap', () => {
    const bus = createFeedbackBus({ maxRetained: Infinity });
    for (let index = 0; index < 250; index += 1) bus.notify(keep(`n${index}`));
    expect(bus.retained()).toHaveLength(250);
  });

  it('rejects a cap that is not a positive integer or Infinity', () => {
    for (const maxRetained of [
      0,
      -1,
      1.5,
      Number.NaN,
      -Infinity,
      '3' as unknown as number,
      null as unknown as number,
    ]) {
      expect(() => createFeedbackBus({ maxRetained }), String(maxRetained)).toThrow(RangeError);
    }
    expect(() => createFeedbackBus({ maxRetained: 1 })).not.toThrow();
    expect(() => createFeedbackBus({ maxRetained: undefined })).not.toThrow();
  });
});

describe('clearRetained', () => {
  it('removes every entry, closes their toasts, and clears unread and reminders', async () => {
    const { schedule, aborted } = abortableSchedule();
    const bus = createFeedbackBus({ reminders: { delayMs: 1_000, schedule } });
    const dismissed: Array<string | null> = [];
    const snapshots: number[] = [];
    const states: FeedbackNotificationState[] = [];
    bus.notify(keep('a', { reminderKey: 'k:a' }));
    bus.notify(keep('b'));
    const settled = bus.remindLater!(bus.retained()[1]!).catch((error: unknown) => error);
    await Promise.resolve();
    bus.subscribeDismiss((id) => dismissed.push(id));
    bus.subscribeRetained((list) => snapshots.push(list.length));
    bus.subscribeNotificationState((state) => states.push(state));
    bus.markRead('a');

    bus.clearRetained();

    expect(bus.retained()).toEqual([]);
    expect(Object.isFrozen(bus.retained())).toBe(true);
    expect(dismissed).toEqual(['b', 'a']);
    expect(snapshots).toEqual([2, 0]);
    expect(states.at(-1)).toEqual({ pausedUntil: null, unreadCount: 0, unreadIds: [] });
    expect(aborted).toEqual(['a']);
    await settled;
  });

  it('keeps the pause and subscriptions, and accepts new notices afterwards', () => {
    const bus = createFeedbackBus();
    const seen = vi.fn();
    bus.subscribe(seen);
    bus.notify(keep('a'));
    bus.setToastPause('manual');

    bus.clearRetained();

    expect(bus.notificationState().pausedUntil).toBe('manual');
    bus.notify(keep('b'));
    expect(ids(bus)).toEqual(['b']);
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when empty', () => {
    const bus = createFeedbackBus();
    const snapshot = vi.fn();
    const state = vi.fn();
    const dismiss = vi.fn();
    bus.subscribeRetained(snapshot);
    bus.subscribeNotificationState(state);
    bus.subscribeDismiss(dismiss);
    snapshot.mockClear();
    state.mockClear();

    bus.clearRetained();

    expect(snapshot).not.toHaveBeenCalled();
    expect(state).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });
});

describe('per-entry unread state', () => {
  it('lists unread ids newest-first in the retained order, frozen, with a matching count', () => {
    const bus = createFeedbackBus();
    for (const id of ['a', 'b', 'c']) bus.notify(keep(id));
    bus.markRead('b');

    const state = bus.notificationState();

    expect(state.unreadIds).toEqual(['c', 'a']);
    expect(state.unreadCount).toBe(state.unreadIds.length);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.unreadIds)).toBe(true);
    expect(ids(bus)).toEqual(['c', 'b', 'a']);
  });

  it('republishes the snapshot only when the pause or the unread id set changes', () => {
    const bus = createFeedbackBus();
    const states: FeedbackNotificationState[] = [];
    bus.subscribeNotificationState((state) => states.push(state));
    expect(states).toHaveLength(1);

    bus.notify(keep('a'));
    expect(states).toHaveLength(2);
    bus.notify(keep('a', { title: 'Again' }));
    bus.notify({ title: 'Transient', tone: NoticeTone.Info });
    bus.markRead('missing');
    expect(states).toHaveLength(2);

    bus.markRead('a');
    expect(states).toHaveLength(3);
    bus.markRead('a');
    bus.markNotificationsRead();
    expect(states).toHaveLength(3);

    bus.setToastPause('manual');
    expect(states).toHaveLength(4);
    bus.setToastPause('manual');
    expect(states).toHaveLength(4);
    expect(states.at(-1)).toEqual({ pausedUntil: 'manual', unreadCount: 0, unreadIds: [] });
  });

  it('marks a republished retained id unread again, in its original position', () => {
    const bus = createFeedbackBus();
    for (const id of ['a', 'b']) bus.notify(keep(id));
    bus.markNotificationsRead();

    bus.notify(keep('a', { title: 'Changed' }));

    expect(bus.notificationState().unreadIds).toEqual(['a']);
    expect(ids(bus)).toEqual(['b', 'a']);
  });

  it('clears every id with markNotificationsRead and keeps the entries', () => {
    const bus = createFeedbackBus();
    for (const id of ['a', 'b']) bus.notify(keep(id));

    bus.markNotificationsRead();

    expect(bus.notificationState()).toEqual({ pausedUntil: null, unreadCount: 0, unreadIds: [] });
    expect(bus.retained()).toHaveLength(2);
  });
});

describe('reminders', () => {
  it('coalesces reminder requests and aborts in-flight scheduling on a reset', async () => {
    let complete!: () => void;
    const schedule = vi.fn<FeedbackReminderOptions['schedule']>(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    const bus = createFeedbackBus({ reminders: { delayMs: 1000, schedule } });
    const dismiss = vi.fn();
    bus.subscribeDismiss(dismiss);
    const notice = { id: 'review', reminderKey: 'draft:a', title: 'Review', tone: NoticeTone.Info, publishedAtMs: 0 };
    const pending = bus.remindLater!(notice);
    expect(bus.remindLater!(notice)).toBe(pending);
    await Promise.resolve();
    expect(schedule).toHaveBeenCalledOnce();

    bus.reset();

    expect(schedule.mock.calls[0]![1].aborted).toBe(true);
    complete();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(dismiss.mock.calls).toEqual([[null]]);
  });
});
