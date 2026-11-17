import type { VNode } from 'vue';

import { Severity } from '../foundation/styles';
import type { ReportSend } from '../reporting';

/** Defines the tone of a notice — the house `Severity` vocabulary minus `neutral` (a notice always carries intent). */
export const NoticeTone = {
  /** Refers to an informational notice. */
  Info: Severity.Info,
  /** Refers to a positive / success notice. */
  Success: Severity.Success,
  /** Refers to a caution / warning notice. */
  Warning: Severity.Warning,
  /** Refers to a destructive / error notice. */
  Danger: Severity.Danger,
} as const;

export type NoticeTone = (typeof NoticeTone)[keyof typeof NoticeTone];

/** Defines how urgently a live notice needs attention. Equal priorities retain their delivery order. */
export const NoticePriority = {
  /** Refers to a passive update whose result is already visible. */
  Low: 'low',
  /** Refers to a routine confirmation. */
  Normal: 'normal',
  /** Refers to a task outcome or progress update people are waiting on. */
  High: 'high',
  /** Refers to an immediate decision, such as an Undo with a real deadline. */
  Urgent: 'urgent',
} as const;

export type NoticePriority = (typeof NoticePriority)[keyof typeof NoticePriority];

/** The sort rank of each priority; a higher rank sits closer to the stack's anchor. */
export const NoticePriorityRank: Readonly<Record<NoticePriority, number>> = Object.freeze({
  [NoticePriority.Low]: 0,
  [NoticePriority.Normal]: 1,
  [NoticePriority.High]: 2,
  [NoticePriority.Urgent]: 3,
});

/** Represents a renderable slice of a notice — a string or a caller-built VNode. */
export type NoticeNode = string | VNode;

/** Represents the copy shown when a notice is read in a compact list. */
export interface NoticeCompactCopy {
  /** The headline in the compact list. */
  readonly title: NoticeNode;

  /** The optional supporting body in the compact list. */
  readonly description?: NoticeNode;
}

/** Defines whether a notice is toast-only or remains in the explicit notification center. */
export const NoticeCategory = {
  /** Refers to a transient toast; dismissal leaves no history. */
  Transient: 'transient',
  /** Refers to a notice retained in this bus until removed or the scope resets. */
  Retained: 'retained',
} as const;

export type NoticeCategory = (typeof NoticeCategory)[keyof typeof NoticeCategory];

/** Joins live notices with the same key behind one expandable toast. Each notice keeps its own identity. */
export interface NoticeGroup {
  /** The key shared by every notice that joins the group. */
  readonly key: string;

  /** The summary title shown while the group holds more than one notice. */
  readonly title: string;
}

/** Represents the stable identifiers and due time passed to the owning product's reminder scheduler. */
export interface NoticeReminderRequest {
  /** The id of the notice to remind about. */
  readonly noticeId: string;

  /** The notice's `reminderKey`, which the product can resolve after a reload. */
  readonly key: string;

  /** The epoch milliseconds when the reminder falls due. */
  readonly dueAtMs: number;
}

/** Defines reminder scheduling for a feedback scope; the product delivers due notices through its bus. */
export interface FeedbackReminderOptions {
  /** The delay before a reminder falls due, in ms. Finite and positive. */
  readonly delayMs: number;

  /** Records one reminder; resolving hides the notice, and `signal` aborts when the notice is removed or replaced. */
  readonly schedule: (request: NoticeReminderRequest, signal: AbortSignal) => Promise<void>;
}

/**
 * Defines the progress of a running operation behind a notice. Omit `value` for an indeterminate operation;
 * `max` defaults to 1 when a surface renders it, so the bus never normalizes either field.
 */
export interface NoticeProgress {
  /** How much work is done, between 0 and `max`. Omitted means indeterminate. */
  readonly value?: number;

  /** The value that counts as complete. A surface treats an omitted `max` as 1. */
  readonly max?: number;

  /** Optional text describing the current step. */
  readonly label?: string;
}

/** Represents a notice published on the bus — the headless payload a presentation adapter renders. */
export interface FeedbackNotice {
  /** The semantic tone — maps 1:1 onto the toast `severity` vocabulary. */
  readonly tone: NoticeTone;

  /** Controls stack position and selects the configured default lifetime. */
  readonly priority?: NoticePriority;

  /** Defaults to transient; retained notices remain in this bus's in-memory notification center. */
  readonly category?: NoticeCategory;

  /** The headline. */
  readonly title: NoticeNode;

  /** The optional supporting body. */
  readonly description?: NoticeNode;

  /** Optional shorter copy for expanded groups and stack overflow. The default toast keeps its full copy. */
  readonly compact?: NoticeCompactCopy;

  /** Additional content revealed in the toast on demand. */
  readonly details?: NoticeNode;

  /** An explicit grouping key and summary title. Omit to deliver a separate toast. */
  readonly group?: NoticeGroup;

  /** An optional action slot (e.g. a retry button) — passed through to the rendering surface. */
  readonly action?: NoticeNode;

  /** Overrides the action in History. Set false for a toast-only action. Deadlines apply in both places. */
  readonly historyAction?: NoticeNode | false;

  /**
   * Sends a one-click report of the failure behind this notice — a captured incident's `send` from
   * `/reporting`. The rendering surface shows it as a Report action beside `action`.
   */
  readonly report?: ReportSend;

  /** An optional stable identity, assigned by the bus (`n_<seq>`) when omitted. Set it to dedupe later. */
  readonly id?: string;

  /** ms before the rendering surface auto-dismisses. Surface default when omitted; `Infinity` = sticky. */
  readonly durationMs?: number;

  /** Absolute deadline in epoch milliseconds. It takes precedence over the display duration and cannot pause. */
  readonly expiresAtMs?: number;

  /** Overrides the host's pin default for this toast. */
  readonly canPin?: boolean;

  /** Enables Remind later when the bus has a scheduler. Use a stable key the product can resolve after reload. */
  readonly reminderKey?: string;

  /**
   * Marks the operation behind this notice as still running; surfaces render it sticky with no countdown.
   * Republish the same id without `progress` to mark completion.
   */
  readonly progress?: NoticeProgress;

  /**
   * Epoch milliseconds of the first publication. A product may supply it when restoring a notice; the bus
   * otherwise stamps `Date.now()`, and republishing a retained id keeps its original time.
   */
  readonly publishedAtMs?: number;
}

/** Represents a notice as delivered to subscribers — identity and publication time always assigned. */
export interface PublishedNotice extends FeedbackNotice {
  readonly id: string;
  readonly publishedAtMs: number;
}

/** Represents a retained notice a product restores through `initialRetained`; its id is required. */
export type RetainedSeed = FeedbackNotice & { readonly id: string };

/** Defines a listener notified on every published notice. */
export type NoticeListener = (notice: PublishedNotice) => void;

/** Defines a listener receiving the complete retained snapshot, including an immediate initial snapshot. */
export type RetainedNoticeListener = (notices: ReadonlyArray<PublishedNotice>) => void;

/** Defines a toast dismissal listener; null closes every toast belonging to this bus. */
export type NoticeDismissListener = (id: string | null) => void;

/** Defines a pop-up pause — an epoch deadline, `'manual'` until resumed, or `null` for active pop-ups. */
export type ToastPauseUntil = number | 'manual' | null;

/** Represents the pop-up pause and the unread retained ids of a feedback scope. */
export interface FeedbackNotificationState {
  /** The pause in effect, or `null` while pop-ups are active. */
  readonly pausedUntil: ToastPauseUntil;

  /** Equals `unreadIds.length`. */
  readonly unreadCount: number;

  /** The unread retained ids, newest-first in the order of the retained list. */
  readonly unreadIds: ReadonlyArray<string>;
}

/** Defines a listener receiving the notification state, including an immediate initial snapshot. */
export type NotificationStateListener = (state: FeedbackNotificationState) => void;

/** Represents the context handed to `onError` when a subscriber throws. */
export interface FeedbackErrorContext {
  /** The listener that threw. */
  readonly listener: NoticeListener;

  /** The notice being delivered when it threw. */
  readonly notice: PublishedNotice;
}

/** Defines the subscriber-failure handler; publishing never breaks the publisher, so a listener throw lands here. */
export type FeedbackErrorHandler = (error: unknown, context: FeedbackErrorContext) => void;

/** Defines the options for {@link createFeedbackBus}. */
export interface FeedbackBusOptions {
  /**
   * Explicitly restores an application-validated retained snapshot without replaying toasts. No storage is read.
   * A seed without a finite `publishedAtMs` is stamped with the creation time, and every seed starts read.
   */
  readonly initialRetained?: ReadonlyArray<RetainedSeed>;

  /**
   * Keeps only the newest N retained notices; older ones leave the history, unread state and reminders without
   * closing their toasts. A positive integer or `Infinity`; defaults to 200.
   */
  readonly maxRetained?: number;

  /** Notices at or above this priority still pop up while pop-ups are paused. Omitted pauses every notice. */
  readonly pauseBypass?: NoticePriority;

  /** Receives every subscriber failure. Omitted swallows them — a broken subscriber is not worth a crash. */
  readonly onError?: FeedbackErrorHandler;

  /** Registers the scheduler and delay for Remind later. */
  readonly reminders?: FeedbackReminderOptions;
}

/** Defines the notices `track()` publishes while work runs and once it settles. */
export interface FeedbackTrackNotices<T> {
  /** The notice published while the work runs; its `progress` marks the operation as running. */
  readonly running: FeedbackNotice;

  /** The notice that replaces it when the work resolves, or a function of the resolved value. */
  readonly success: FeedbackNotice | ((value: T) => FeedbackNotice);

  /** The notice that replaces it when the work rejects, or a function of the rejection. */
  readonly failure: FeedbackNotice | ((error: unknown) => FeedbackNotice);
}

/**
 * Defines the module-scope feedback hub between app code and the surface that renders notices.
 * Mount the adapter (`<FeedbackToastHost/>`) before publishing — a transient notice with no subscriber is dropped.
 * Retained notices stay in memory only; no browser storage, network or account wiring is implicit.
 */
export interface FeedbackBus {
  /** Publishes to subscribers and returns the id. Retained notices also update history without a mounted surface. */
  notify(notice: FeedbackNotice): string;

  /** Subscribes to published notices; returns an unsubscribe. */
  subscribe(listener: NoticeListener): () => void;

  /** Returns the newest-first retained snapshot. The array and notice objects are immutable. */
  retained(): ReadonlyArray<PublishedNotice>;

  /** Subscribes to retained snapshots; receives the current snapshot immediately. Listener failures are isolated. */
  subscribeRetained(listener: RetainedNoticeListener): () => void;

  /** Subscribes a toast adapter to removal/reset. Listener failures are isolated. */
  subscribeDismiss(listener: NoticeDismissListener): () => void;

  /** Returns the pop-up pause and unread retained ids for this scope. */
  notificationState(): FeedbackNotificationState;

  /** Subscribes to notification state and immediately receives a snapshot. */
  subscribeNotificationState(listener: NotificationStateListener): () => void;

  /** Hides this scope's visible pop-ups and suppresses new ones until resumed. Use null to resume. */
  setToastPause(until: ToastPauseUntil): void;

  /** Clears every unread id while leaving the retained entries available. */
  markNotificationsRead(): void;

  /** Marks one retained id read; a read or unknown id is a no-op. */
  markRead(id: string): void;

  /** Reports whether pop-ups are paused now (an elapsed timed pause is over) and the notice does not bypass it. */
  suppresses(notice: FeedbackNotice): boolean;

  /** Schedules an eligible notice, then hides it from the live stack. Retained history stays available. */
  readonly remindLater?: (notice: PublishedNotice) => Promise<void>;

  /** Removes a retained notice and closes its toast; a transient or unknown id is a no-op. */
  remove(id: string): void;

  /** Closes the live toast of any id, transient or retained. Retained history and unread state stay untouched. */
  dismiss(id: string): void;

  /** Removes every retained notice and closes their toasts; pause and subscriptions stay. A no-op when empty. */
  clearRetained(): void;

  /**
   * Publishes `running` with a stable id and `progress`, then replaces it under that id with the settled notice,
   * `progress` removed. Resolves with the work's value; rethrows its original error. After `dispose()` it
   * returns the settlement and publishes nothing.
   */
  track<T>(
    work: Promise<T> | ((report: (progress: NoticeProgress) => void) => Promise<T>),
    notices: FeedbackTrackNotices<T>,
  ): Promise<T>;

  /** Clears retained notices and this bus's toasts; subscriptions remain for a new session scope. */
  reset(): void;

  /** Resets and permanently disposes subscriptions. Subsequent publication is a no-op. */
  dispose(): void;
}

/** @internal The default cap on retained notices. */
const DefaultMaxRetained = 200;

/** @internal Reports whether a value is a finite millisecond count. */
function isFiniteMs(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

/**
 * Creates a {@link FeedbackBus} — one per app, module scope, shared by publishers and the rendering adapter.
 * Apps that don't need isolation use the default {@link feedbackBus}; pass `onError` to see the subscriber
 * failures the bus otherwise swallows.
 */
export function createFeedbackBus(options: FeedbackBusOptions = {}): FeedbackBus {
  const { onError, reminders, pauseBypass } = options;
  if (reminders && (!Number.isFinite(reminders.delayMs) || reminders.delayMs <= 0)) {
    throw new RangeError('Reminder delay must be finite and positive.');
  }
  const maxRetained = options.maxRetained === undefined ? DefaultMaxRetained : options.maxRetained;
  if (maxRetained !== Infinity && !(Number.isInteger(maxRetained) && maxRetained > 0)) {
    throw new RangeError('Retained limit must be a positive integer or Infinity.');
  }
  if (pauseBypass !== undefined && !Object.values<string>(NoticePriority).includes(pauseBypass)) {
    throw new RangeError('Pause bypass must be a notice priority.');
  }
  const listeners = new Set<NoticeListener>();
  const retainedListeners = new Set<RetainedNoticeListener>();
  const dismissListeners = new Set<NoticeDismissListener>();
  const notificationListeners = new Set<NotificationStateListener>();
  const unread = new Set<string>();
  const scheduling = new Map<string, { key: string; controller: AbortController; pending: Promise<void> }>();
  let pausedUntil: ToastPauseUntil = null;
  let resumeTimer: ReturnType<typeof setTimeout> | undefined;
  let notificationSnapshot: FeedbackNotificationState = Object.freeze({
    pausedUntil,
    unreadCount: 0,
    unreadIds: Object.freeze([]),
  });
  const seededAtMs = Date.now();
  let notices: ReadonlyArray<PublishedNotice> = Object.freeze(
    capped([
      ...new Map(
        (options.initialRetained ?? []).map((seed) => [
          seed.id,
          Object.freeze({
            ...seed,
            category: NoticeCategory.Retained,
            publishedAtMs: isFiniteMs(seed.publishedAtMs) ? seed.publishedAtMs : seededAtMs,
          }),
        ]),
      ).values(),
    ]),
  );
  let idSeq = 0;
  let disposed = false;
  const nextId = (): string => {
    let id: string;
    do {
      id = `n_${++idSeq}`;
    } while (notices.some((notice) => notice.id === id));
    return id;
  };

  /** Keeps the newest `maxRetained` entries of a newest-first list; dropped ids leave unread and reminders. */
  function capped(list: ReadonlyArray<PublishedNotice>): ReadonlyArray<PublishedNotice> {
    if (list.length <= maxRetained) return list;
    for (const dropped of list.slice(maxRetained)) {
      unread.delete(dropped.id);
      cancelReminder(dropped.id);
    }
    return list.slice(0, maxRetained);
  }

  // Snapshot/lifecycle observers cannot break notification delivery or scope cleanup.
  const deliver = <T>(subscribers: ReadonlySet<(value: T) => void>, value: T): void => {
    for (const listener of [...subscribers]) {
      try {
        listener(value);
      } catch {
        /* Observer failure stays isolated. */
      }
    }
  };
  const publishRetained = (): void => deliver(retainedListeners, notices);

  function publishNotificationState(): void {
    const unreadIds = notices.filter((notice) => unread.has(notice.id)).map((notice) => notice.id);
    const previous = notificationSnapshot.unreadIds;
    if (
      notificationSnapshot.pausedUntil === pausedUntil &&
      previous.length === unreadIds.length &&
      previous.every((id, index) => id === unreadIds[index])
    ) {
      return;
    }
    notificationSnapshot = Object.freeze({
      pausedUntil,
      unreadCount: unreadIds.length,
      unreadIds: Object.freeze(unreadIds),
    });
    deliver(notificationListeners, notificationSnapshot);
  }

  function scheduleResume(): void {
    clearTimeout(resumeTimer);
    if (typeof pausedUntil !== 'number') return;
    const wait = Math.max(1, pausedUntil - Date.now());
    resumeTimer = setTimeout(
      () => {
        if (typeof pausedUntil === 'number' && pausedUntil <= Date.now()) setToastPause(null);
        else scheduleResume();
      },
      Math.min(wait, 2_147_483_647),
    );
  }

  function setToastPause(until: ToastPauseUntil): void {
    if (disposed) return;
    const next =
      until === 'manual' ||
      (typeof until === 'number' && Number.isFinite(new Date(until).getTime()) && until > Date.now())
        ? until
        : null;
    if (next === pausedUntil) return;
    const starting = pausedUntil === null && next !== null;
    pausedUntil = next;
    scheduleResume();
    publishNotificationState();
    if (starting) deliver(dismissListeners, null);
  }

  function notificationState(): FeedbackNotificationState {
    if (typeof pausedUntil === 'number' && pausedUntil <= Date.now()) setToastPause(null);
    return notificationSnapshot;
  }

  function suppresses(notice: FeedbackNotice): boolean {
    if (notificationState().pausedUntil === null) return false;
    if (pauseBypass === undefined) return true;
    return NoticePriorityRank[notice.priority ?? NoticePriority.Normal] < NoticePriorityRank[pauseBypass];
  }

  function cancelReminder(id: string): void {
    const current = scheduling.get(id);
    scheduling.delete(id);
    current?.controller.abort();
  }

  const reset = (): void => {
    for (const id of scheduling.keys()) cancelReminder(id);
    clearTimeout(resumeTimer);
    pausedUntil = null;
    unread.clear();
    notices = Object.freeze([]);
    publishRetained();
    publishNotificationState();
    deliver(dismissListeners, null);
  };

  const remindLater = reminders
    ? (notice: PublishedNotice): Promise<void> => {
        const key = notice.reminderKey;
        if (disposed || !key || Number.isFinite(notice.expiresAtMs)) {
          return Promise.reject(new Error('This notice cannot be scheduled.'));
        }
        const existing = scheduling.get(notice.id);
        if (existing?.key === key) return existing.pending;
        cancelReminder(notice.id);
        const controller = new AbortController();
        const { signal } = controller;
        const request = { noticeId: notice.id, key, dueAtMs: Date.now() + reminders.delayMs };
        const pending = Promise.resolve()
          .then(() => {
            signal.throwIfAborted();
            return reminders.schedule(request, signal);
          })
          .then(() => {
            signal.throwIfAborted();
            deliver(dismissListeners, notice.id);
          })
          .finally(() => {
            if (scheduling.get(notice.id)?.controller === controller) scheduling.delete(notice.id);
          });
        scheduling.set(notice.id, { key, controller, pending });
        return pending;
      }
    : undefined;

  /** Routes a subscriber failure to `onError`; a handler that throws is swallowed, having nowhere to report. */
  const report = (error: unknown, listener: NoticeListener, notice: PublishedNotice): void => {
    if (!onError) return;
    try {
      onError(error, { listener, notice });
    } catch {
      // A throwing handler stays isolated.
    }
  };

  function notify(notice: FeedbackNotice): string {
    const id = notice.id ?? nextId();
    const existingEntry = notices.find((item) => item.id === id);
    const published: PublishedNotice = Object.freeze({
      ...notice,
      id,
      publishedAtMs:
        existingEntry?.publishedAtMs ?? (isFiniteMs(notice.publishedAtMs) ? notice.publishedAtMs : Date.now()),
    });
    if (disposed) return id;
    notificationState();
    const pending = scheduling.get(id);
    if (pending && pending.key !== published.reminderKey) cancelReminder(id);
    const retained = notice.category === NoticeCategory.Retained;
    if (retained || existingEntry) {
      notices = Object.freeze(
        capped(
          retained
            ? existingEntry
              ? notices.map((item) => (item.id === id ? published : item))
              : [published, ...notices]
            : notices.filter((item) => item.id !== id),
        ),
      );
      if (retained) unread.add(id);
      else unread.delete(id);
      publishRetained();
      publishNotificationState();
    }
    // Each subscriber runs in isolation; a throw costs only its own delivery and surfaces on `onError`.
    for (const listener of [...listeners]) {
      try {
        listener(published);
      } catch (failure) {
        report(failure, listener, published);
      }
    }
    return id;
  }

  /** Republishes a notice under the tracked id with `progress` removed — the operation is over. */
  function settle(notice: FeedbackNotice, id: string): void {
    const settled: { -readonly [K in keyof FeedbackNotice]: FeedbackNotice[K] } = { ...notice, id };
    delete settled.progress;
    notify(settled);
  }

  function track<T>(
    work: Promise<T> | ((report: (progress: NoticeProgress) => void) => Promise<T>),
    tracked: FeedbackTrackNotices<T>,
  ): Promise<T> {
    const id = tracked.running.id ?? nextId();
    let finished = false;
    const showProgress = (progress: NoticeProgress): void => {
      if (!finished) notify({ ...tracked.running, id, progress });
    };
    showProgress(tracked.running.progress ?? {});
    let operation: Promise<T>;
    try {
      operation = Promise.resolve(typeof work === 'function' ? work(showProgress) : work);
    } catch (failure) {
      operation = Promise.reject(failure);
    }
    return operation.then(
      (value) => {
        finished = true;
        if (!disposed) settle(typeof tracked.success === 'function' ? tracked.success(value) : tracked.success, id);
        return value;
      },
      (failure: unknown) => {
        finished = true;
        if (!disposed) settle(typeof tracked.failure === 'function' ? tracked.failure(failure) : tracked.failure, id);
        throw failure;
      },
    );
  }

  return {
    notify,

    subscribe(listener: NoticeListener): () => void {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    retained: () => notices,

    subscribeRetained(listener): () => void {
      deliver(new Set([listener]), notices);
      if (disposed) return () => undefined;
      retainedListeners.add(listener);
      return () => {
        retainedListeners.delete(listener);
      };
    },

    subscribeDismiss(listener): () => void {
      if (disposed) return () => undefined;
      dismissListeners.add(listener);
      return () => {
        dismissListeners.delete(listener);
      };
    },

    notificationState,

    subscribeNotificationState(listener): () => void {
      deliver(new Set([listener]), notificationState());
      if (disposed) return () => undefined;
      notificationListeners.add(listener);
      return () => {
        notificationListeners.delete(listener);
      };
    },

    setToastPause,

    markNotificationsRead(): void {
      unread.clear();
      publishNotificationState();
    },

    markRead(id): void {
      if (unread.delete(id)) publishNotificationState();
    },

    suppresses,

    remindLater,

    remove(id): void {
      if (disposed || !notices.some((notice) => notice.id === id)) return;
      cancelReminder(id);
      notices = Object.freeze(notices.filter((notice) => notice.id !== id));
      unread.delete(id);
      publishRetained();
      publishNotificationState();
      deliver(dismissListeners, id);
    },

    dismiss(id): void {
      if (!disposed) deliver(dismissListeners, id);
    },

    clearRetained(): void {
      if (disposed || notices.length === 0) return;
      const ids = notices.map((notice) => notice.id);
      for (const id of ids) cancelReminder(id);
      unread.clear();
      notices = Object.freeze([]);
      publishRetained();
      publishNotificationState();
      for (const id of ids) deliver(dismissListeners, id);
    },

    track,

    reset,

    dispose(): void {
      if (disposed) return;
      disposed = true;
      reset();
      listeners.clear();
      retainedListeners.clear();
      dismissListeners.clear();
      notificationListeners.clear();
    },
  };
}

/** The default app-wide bus — what `notify` and the adapters bind to unless handed an explicit bus. */
export const feedbackBus: FeedbackBus = createFeedbackBus();

/** Publishes a notice on the default {@link feedbackBus} — the `notify({ tone, title })` entry point. */
export function notify(notice: FeedbackNotice): string {
  return feedbackBus.notify(notice);
}
