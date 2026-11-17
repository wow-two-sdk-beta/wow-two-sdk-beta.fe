import { vi } from 'vitest';
import {
  createFeedbackBus,
  NoticeCategory,
  NoticeTone,
  type FeedbackBus,
  type FeedbackBusOptions,
  type FeedbackNotice,
  type FeedbackReminderOptions,
  type PublishedNotice,
} from '@src/feedback';

/*
 * Shared setup for the `FeedbackBus` unit tests. Every case builds its OWN bus rather than touching the
 * module-level `feedbackBus` singleton: a subscription leaked onto the shared instance would cross-talk
 * into any later suite.
 */

/** Subscribes to `bus` and returns the list every published notice lands in. */
export const record = (bus: FeedbackBus): PublishedNotice[] => {
  const seen: PublishedNotice[] = [];
  bus.subscribe((notice) => seen.push(notice));
  return seen;
};

/** A fresh bus with one recording subscriber. */
export const watch = (options?: FeedbackBusOptions): { bus: FeedbackBus; seen: PublishedNotice[] } => {
  const bus = createFeedbackBus(options);
  return { bus, seen: record(bus) };
};

/** A retained notice titled by its id. */
export const keep = (id: string, extra: Partial<FeedbackNotice> = {}): FeedbackNotice => ({
  id,
  title: id,
  tone: NoticeTone.Info,
  category: NoticeCategory.Retained,
  ...extra,
});

/** The retained ids, newest first. */
export const ids = (bus: FeedbackBus): string[] => bus.retained().map((notice) => notice.id);

/** A promise settled from outside. */
export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((settleResolve, settleReject) => {
    resolve = settleResolve;
    reject = settleReject;
  });
  return { promise, resolve, reject };
};

/** A reminder scheduler that never completes on its own and records the notice id of every aborted request. */
export const abortableSchedule = () => {
  const aborted: string[] = [];
  const schedule = vi.fn<FeedbackReminderOptions['schedule']>(
    (request, signal) =>
      new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted.push(request.noticeId);
          reject(signal.reason);
        });
      }),
  );
  return { schedule, aborted };
};
