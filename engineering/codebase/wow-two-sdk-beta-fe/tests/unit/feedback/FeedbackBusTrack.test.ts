import { describe, expect, it, vi } from 'vitest';
import { createFeedbackBus, NoticeCategory, NoticeTone, type FeedbackNotice, type NoticeProgress } from '@src/feedback';
import { deferred, watch } from './FeedbackBusHarness';

/*
 * `unit` project (node). `track()` turns one async operation into a running notice followed by exactly one
 * settled notice under the same id. Every case builds its own bus and records what subscribers received.
 */

const running: FeedbackNotice = { tone: NoticeTone.Info, title: 'Uploading' };
const done: FeedbackNotice = { tone: NoticeTone.Success, title: 'Uploaded' };
const failed: FeedbackNotice = { tone: NoticeTone.Danger, title: 'Upload failed' };

describe('track', () => {
  it('publishes running with an indeterminate progress, then success under the same id without progress', async () => {
    const { bus, seen } = watch();
    const work = deferred<number>();

    const result = bus.track(work.promise, { running, success: done, failure: failed });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ title: 'Uploading', progress: {} });
    const id = seen[0]!.id;
    expect(id).toBeTypeOf('string');

    work.resolve(7);
    await expect(result).resolves.toBe(7);

    expect(seen).toHaveLength(2);
    expect(seen[1]).toMatchObject({ id, title: 'Uploaded', tone: NoticeTone.Success });
    expect('progress' in seen[1]!).toBe(false);
  });

  it('keeps the supplied running id and progress, and overrides any id on the settled notice', async () => {
    const { bus, seen } = watch();
    const progress: NoticeProgress = { value: 2, max: 10, label: 'Step 1' };

    await bus.track(Promise.resolve('ok'), {
      running: { ...running, id: 'upload', progress },
      success: { ...done, id: 'something-else', progress: { value: 1 } },
      failure: failed,
    });

    expect(seen.map((notice) => notice.id)).toEqual(['upload', 'upload']);
    expect(seen[0]?.progress).toEqual(progress);
    expect('progress' in seen[1]!).toBe(false);
  });

  it('builds the success notice from the resolved value', async () => {
    const { bus, seen } = watch();
    const success = vi.fn((count: number): FeedbackNotice => ({ ...done, title: `Uploaded ${count} files` }));

    await bus.track(Promise.resolve(3), { running, success, failure: failed });

    expect(success).toHaveBeenCalledExactlyOnceWith(3);
    expect(seen[1]?.title).toBe('Uploaded 3 files');
  });

  it('publishes failure under the same id and rethrows the original error', async () => {
    const { bus, seen } = watch();
    const error = new Error('network');
    const failure = vi.fn((cause: unknown): FeedbackNotice => ({ ...failed, description: String(cause) }));

    await expect(bus.track(Promise.reject(error), { running, success: done, failure })).rejects.toBe(error);

    expect(failure).toHaveBeenCalledExactlyOnceWith(error);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toMatchObject({ id: seen[0]!.id, title: 'Upload failed', tone: NoticeTone.Danger });
    expect('progress' in seen[1]!).toBe(false);
  });

  it('treats a synchronous throw from the work as a rejection, settling with a static failure notice', async () => {
    const { bus, seen } = watch();
    const error = new Error('sync');

    await expect(
      bus.track(
        () => {
          throw error;
        },
        { running, success: done, failure: failed },
      ),
    ).rejects.toBe(error);

    expect(seen.map((notice) => notice.title)).toEqual(['Uploading', 'Upload failed']);
    expect(seen[1]?.id).toBe(seen[0]?.id);
  });

  it('calls a function work synchronously with report, and republishes the running notice per report', async () => {
    const { bus, seen } = watch();
    const work = deferred<void>();
    let reportProgress!: (progress: NoticeProgress) => void;
    const start = vi.fn((report: (progress: NoticeProgress) => void) => {
      reportProgress = report;
      return work.promise;
    });

    const result = bus.track(start, { running: { ...running, id: 'run' }, success: done, failure: failed });

    expect(start).toHaveBeenCalledOnce();
    reportProgress({ value: 25, max: 100, label: 'Quarter' });
    reportProgress({ value: 50, max: 100 });

    expect(seen.map((notice) => notice.progress)).toEqual([
      {},
      { value: 25, max: 100, label: 'Quarter' },
      { value: 50, max: 100 },
    ]);
    expect(seen.every((notice) => notice.id === 'run' && notice.title === 'Uploading')).toBe(true);

    work.resolve();
    await result;
    expect(seen).toHaveLength(4);
    expect(seen[3]?.title).toBe('Uploaded');
  });

  it('allows report while the function runs synchronously before it returns', async () => {
    const { bus, seen } = watch();
    await bus.track(
      async (report) => {
        report({ value: 1 });
        return 'done';
      },
      { running, success: done, failure: failed },
    );
    expect(seen.map((notice) => notice.progress)).toEqual([{}, { value: 1 }, undefined]);
  });

  it.each([
    { outcome: 'success', settle: (): Promise<void> => Promise.resolve() },
    { outcome: 'failure', settle: (): Promise<void> => Promise.reject(new Error('late')) },
  ])('ignores report after a $outcome settled', async ({ settle }) => {
    const { bus, seen } = watch();
    let reportProgress!: (progress: NoticeProgress) => void;

    await bus
      .track(
        (report) => {
          reportProgress = report;
          return settle();
        },
        { running, success: done, failure: failed },
      )
      .catch(() => undefined);
    reportProgress({ value: 99 });

    expect(seen).toHaveLength(2);
    expect('progress' in seen.at(-1)!).toBe(false);
  });

  it.each([
    { callback: 'success', settledTitle: 'Upload failed' },
    { callback: 'failure', settledTitle: 'Uploading' },
  ] as const)(
    'rejects with the callback error when the $callback callback throws, and settles as $settledTitle',
    async ({ callback, settledTitle }) => {
      const { bus, seen } = watch();
      const callbackError = new Error(`bad ${callback}`);
      const fail = (): never => {
        throw callbackError;
      };
      const work = callback === 'success' ? Promise.resolve(1) : Promise.reject(new Error('original'));

      await expect(
        bus.track(work, {
          running,
          success: callback === 'success' ? fail : done,
          failure: callback === 'failure' ? fail : failed,
        }),
      ).rejects.toBe(callbackError);

      expect(seen).toHaveLength(2);
      expect(seen[1]).toMatchObject({ id: seen[0]!.id, title: settledTitle });
      expect('progress' in seen[1]!).toBe(false);
    },
  );

  it('hands a throwing success callback’s error to the failure callback, and falls back to running when both throw', async () => {
    const { bus, seen } = watch();
    const successError = new Error('bad value');
    const failure = vi.fn((cause: unknown): FeedbackNotice => ({ ...failed, description: String(cause) }));
    const throwSuccess = (): never => {
      throw successError;
    };

    await expect(bus.track(Promise.resolve(1), { running, success: throwSuccess, failure })).rejects.toBe(successError);
    expect(failure).toHaveBeenCalledExactlyOnceWith(successError);
    expect(seen[1]?.description).toBe('Error: bad value');

    const throwFailure = (): never => {
      throw new Error('bad failure');
    };
    await expect(
      bus.track(Promise.resolve(1), {
        running: { ...running, id: 'both' },
        success: throwSuccess,
        failure: throwFailure,
      }),
    ).rejects.toBe(successError);
    expect(seen.at(-1)).toMatchObject({ id: 'both', title: 'Uploading' });
    expect('progress' in seen.at(-1)!).toBe(false);
  });

  it('generates one stable id per call, distinct between calls', async () => {
    const { bus, seen } = watch();
    await Promise.all([
      bus.track(Promise.resolve(1), { running, success: done, failure: failed }),
      bus.track(Promise.resolve(2), { running, success: done, failure: failed }),
    ]);

    const [firstRun, secondRun, firstDone, secondDone] = seen;
    expect(firstRun!.id).not.toBe(secondRun!.id);
    expect(firstDone!.id).toBe(firstRun!.id);
    expect(secondDone!.id).toBe(secondRun!.id);
  });

  it('keeps a retained tracked notice as one history entry with its original time', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const bus = createFeedbackBus();
      const work = deferred<string>();

      const result = bus.track(work.promise, {
        running: { ...running, id: 'export', category: NoticeCategory.Retained },
        success: { ...done, category: NoticeCategory.Retained },
        failure: failed,
      });
      expect(bus.retained()).toHaveLength(1);
      expect(bus.retained()[0]?.progress).toEqual({});

      vi.setSystemTime(9_000);
      work.resolve('file');
      await result;

      expect(bus.retained()).toHaveLength(1);
      expect(bus.retained()[0]).toMatchObject({ id: 'export', title: 'Uploaded', publishedAtMs: 1_000 });
      expect('progress' in bus.retained()[0]!).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still returns the settlement and publishes nothing after dispose', async () => {
    const { bus, seen } = watch();
    const success = vi.fn(() => done);
    bus.dispose();

    await expect(bus.track(Promise.resolve('value'), { running, success, failure: failed })).resolves.toBe('value');
    const error = new Error('after dispose');
    await expect(bus.track(Promise.reject(error), { running, success, failure: failed })).rejects.toBe(error);

    expect(seen).toEqual([]);
    expect(success).not.toHaveBeenCalled();
  });

  it('publishes nothing further when the bus is disposed while the work runs', async () => {
    const { bus, seen } = watch();
    const work = deferred<number>();
    const success = vi.fn(() => done);
    let reportProgress!: (progress: NoticeProgress) => void;
    const result = bus.track(
      (report) => {
        reportProgress = report;
        return work.promise;
      },
      { running, success, failure: failed },
    );
    expect(seen).toHaveLength(1);

    bus.dispose();
    reportProgress({ value: 1 });
    work.resolve(5);

    await expect(result).resolves.toBe(5);
    expect(seen).toHaveLength(1);
    expect(success).not.toHaveBeenCalled();
  });
});
