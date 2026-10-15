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

/**
 * A renderable slice of a notice. React's `ReactNode` becomes `string | VNode`
 * for the same reason the `ToastHost` payload did: notices travel as data through
 * `notify()`, not through a slot, so a caller who wants markup builds it with
 * `h()`. Structurally identical to `presentation/feedback`'s `ToastNode` — the
 * adapter's assignment is what keeps the two from drifting, and this module
 * cannot import that one (boundaries: `feedback` never reaches into
 * `presentation`).
 */
export type NoticeNode = string | VNode;

/** Defines whether a notice is toast-only or remains in the explicit notification center. */
export const NoticeCategory = {
  /** Refers to a transient toast; dismissal leaves no history. */
  Transient: 'transient',
  /** Refers to a notice retained in this bus until removed or the scope resets. */
  Retained: 'retained',
} as const;

export type NoticeCategory = (typeof NoticeCategory)[keyof typeof NoticeCategory];

/** Defines a notice published on the bus — the headless payload a presentation adapter renders. */
export interface FeedbackNotice {
  /** The semantic tone — maps 1:1 onto the toast `severity` vocabulary. */
  readonly tone: NoticeTone;

  /** Defaults to transient; retained notices remain in this bus's in-memory notification center. */
  readonly category?: NoticeCategory;

  /** The headline. */
  readonly title: NoticeNode;

  /** The optional supporting body. */
  readonly description?: NoticeNode;

  /** An optional action slot (e.g. a retry button) — passed through to the rendering surface. */
  readonly action?: NoticeNode;

  /**
   * Sends a one-click report of the failure behind this notice — a captured incident's `send` from
   * `/reporting`. The rendering surface shows it as a Report action beside `action`.
   */
  readonly report?: ReportSend;

  /** An optional stable identity, assigned by the bus (`n_<seq>`) when omitted. Set it to dedupe later. */
  readonly id?: string;

  /** ms before the rendering surface auto-dismisses. Surface default when omitted; `Infinity` = sticky. */
  readonly durationMs?: number;
}

/** Defines a notice as delivered to subscribers — identity always assigned. */
export interface PublishedNotice extends FeedbackNotice {
  readonly id: string;
}

/** Defines a listener notified on every published notice. */
export type NoticeListener = (notice: PublishedNotice) => void;

/** Defines a listener receiving the complete retained snapshot, including an immediate initial snapshot. */
export type RetainedNoticeListener = (notices: ReadonlyArray<PublishedNotice>) => void;

/** Defines a toast dismissal listener; null closes every toast belonging to this bus. */
export type NoticeDismissListener = (id: string | null) => void;

/** Defines the context handed to `onError` when a subscriber throws. */
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
  /** Explicitly restores an application-validated retained snapshot without replaying toasts. No storage is read. */
  readonly initialRetained?: ReadonlyArray<PublishedNotice>;
  /** Receives every subscriber failure. Omitted swallows them — a broken subscriber is not worth a crash. */
  readonly onError?: FeedbackErrorHandler;
}

/**
 * Defines the module-scope feedback hub wiring app code to whatever surface renders notices.
 * Transient notices are fire-and-forget (no replay). Retained notices explicitly opt into an in-memory
 * snapshot rendered by `NotificationCenterGroup`. No browser storage, network or account wiring is implicit.
 * A transient notice published with no subscriber is dropped, so mount
 * the adapter (`<FeedbackToastHost/>`) before publishing. Nothing subscribes automatically — GWDNBM,
 * every wire is explicit:
 *
 * - **Notices in** — `notify({ tone, title })` from anywhere (composables, api client code, stores);
 *   `feedbackQueryErrors(bus)` plugs a `/query` global error seam in.
 * - **Toasts out** — `<FeedbackToastHost/>` (`/presentation/feedback`) subscribes and forwards each
 *   notice into the imperative `toastHost.toast()` API.
 *
 * Plain module state rather than a Vue plugin / `provide`: the bus is publisher-agnostic, and a
 * publisher is rarely inside a component's `setup()` (an interceptor, a store action). The
 * `bus` prop on the adapter is the isolation seam an app needs instead.
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

  /** Removes a retained notice and closes its toast; a transient or unknown id is a no-op. */
  remove(id: string): void;

  /** Clears retained notices and this bus's toasts; subscriptions remain for a new session scope. */
  reset(): void;

  /** Resets and permanently disposes subscriptions. Subsequent publication is a no-op. */
  dispose(): void;
}

/**
 * Creates a {@link FeedbackBus} — one per app, module scope, shared by publishers and the rendering adapter.
 * Apps that don't need isolation use the default {@link feedbackBus}; pass `onError` to see the subscriber
 * failures the bus otherwise swallows.
 */
export function createFeedbackBus(options: FeedbackBusOptions = {}): FeedbackBus {
  const { onError } = options;
  const listeners = new Set<NoticeListener>();
  const retainedListeners = new Set<RetainedNoticeListener>();
  const dismissListeners = new Set<NoticeDismissListener>();
  let notices: ReadonlyArray<PublishedNotice> = Object.freeze([
    ...new Map(
      (options.initialRetained ?? []).map((notice) => [
        notice.id,
        Object.freeze({ ...notice, category: NoticeCategory.Retained }),
      ]),
    ).values(),
  ]);
  let idSeq = 0;
  let disposed = false;
  const nextId = (): string => {
    let id: string;
    do {
      id = `n_${++idSeq}`;
    } while (notices.some((notice) => notice.id === id));
    return id;
  };

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
  const reset = (): void => {
    notices = Object.freeze([]);
    publishRetained();
    deliver(dismissListeners, null);
  };

  /** Routes a subscriber failure to `onError`; a handler that throws is swallowed, having nowhere to report. */
  const report = (error: unknown, listener: NoticeListener, notice: PublishedNotice): void => {
    if (!onError) return;
    try {
      onError(error, { listener, notice });
    } catch {
      // The handler is the last line of defence; a throw here must not reach the caller either.
    }
  };

  return {
    notify(notice: FeedbackNotice): string {
      const published: PublishedNotice = Object.freeze({ ...notice, id: notice.id ?? nextId() });
      if (disposed) return published.id;
      const retained = notice.category === NoticeCategory.Retained;
      const existing = notices.some((item) => item.id === published.id);
      if (retained || existing) {
        notices = Object.freeze(
          retained
            ? existing
              ? notices.map((item) => (item.id === published.id ? published : item))
              : [published, ...notices]
            : notices.filter((item) => item.id !== published.id),
        );
        publishRetained();
      }
      // Every subscriber is invoked in isolation. A subscriber is adapter code the publisher does not own,
      // and `notify()` is called from click handlers, `catch` blocks and error boundaries — precisely where a
      // second exception masks the first and takes down the path that was meant to recover. So a throwing
      // subscriber costs only its own delivery: the rest of the fan-out still runs, `notify()` still returns
      // the id, and the failure surfaces on `onError` rather than in the caller.
      for (const listener of [...listeners]) {
        try {
          listener(published);
        } catch (failure) {
          report(failure, listener, published);
        }
      }
      return published.id;
    },

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

    remove(id): void {
      if (disposed || !notices.some((notice) => notice.id === id)) return;
      notices = Object.freeze(notices.filter((notice) => notice.id !== id));
      publishRetained();
      deliver(dismissListeners, id);
    },

    reset,

    dispose(): void {
      if (disposed) return;
      disposed = true;
      reset();
      listeners.clear();
      retainedListeners.clear();
      dismissListeners.clear();
    },
  };
}

/** The default app-wide bus — what `notify` and the adapters bind to unless handed an explicit bus. */
export const feedbackBus: FeedbackBus = createFeedbackBus();

/** Publishes a notice on the default {@link feedbackBus} — the `notify({ tone, title })` entry point. */
export function notify(notice: FeedbackNotice): string {
  return feedbackBus.notify(notice);
}
