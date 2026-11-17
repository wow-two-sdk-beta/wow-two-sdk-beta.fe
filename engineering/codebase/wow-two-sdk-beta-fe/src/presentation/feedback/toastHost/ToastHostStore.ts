import { NoticePriority, NoticePriorityRank } from '../../../feedback';
import { Severity } from '../../../foundation/styles';
import type { ToastContent } from './ToastContent';
import type { ToastEntry } from './ToastEntry';
import type { ToastOptions } from './ToastOptions';
import type { ToastPromiseOptions } from './ToastPromiseOptions';
import type { ToastSeverity } from './ToastSeverity';

/** @internal Receives the live toast list on every change. */
type ToastListener = (toasts: ReadonlyArray<ToastEntry>) => void;

/** @internal Reads a phase's content as a partial options object — a string is a title. */
function normalizeContent(content: ToastContent): Partial<ToastOptions> {
  return typeof content === 'string' ? { title: content } : content;
}

/** Reports whether a toast carries an absolute deadline, which no hover, focus or pin can hold. */
export function hasDeadline<T extends ToastOptions>(t: T): t is T & { expiresAtMs: number } {
  return t.expiresAtMs !== undefined && Number.isFinite(t.expiresAtMs);
}

/** Reports whether a toast shows a running operation, which holds it on screen with no clock. */
export function isRunning(t: ToastOptions): boolean {
  return typeof t.progress === 'object' && t.progress !== null;
}

/** Orders the higher priority first; an unclassified toast counts as Normal. Equal priorities return 0. */
export function comparePriority(a: ToastOptions, b: ToastOptions): number {
  return (
    NoticePriorityRank[b.priority ?? NoticePriority.Normal] - NoticePriorityRank[a.priority ?? NoticePriority.Normal]
  );
}

/** Orders by priority, then by delivery. */
export function compareOrder(a: ToastEntry, b: ToastEntry): number {
  return comparePriority(a, b) || a.sequence - b.sequence;
}

/** Holds the live toasts every mounted `ToastHost` renders. */
export class ToastHostStore {
  private items: ReadonlyArray<ToastEntry> = [];
  private listeners = new Set<ToastListener>();
  private idSeq = 0;

  /** Shows a toast and returns its id; a `key` already showing updates that toast in place and returns its id. */
  toast(opts: ToastOptions): string {
    if (opts.key !== undefined) {
      const existing = this.items.find((t) => t.key === opts.key);
      if (existing) {
        this.update(existing.id, opts);
        return existing.id;
      }
    }
    const sequence = ++this.idSeq;
    const id = `t_${sequence}`;
    this.items = [...this.items, { ...opts, id, sequence, nonce: 0, createdAtMs: Date.now() }];
    this.emit();
    return id;
  }

  /** Merges a patch into an existing toast (content + severity + duration), refreshing its timer. */
  update(id: string, patch: Partial<ToastOptions>): void {
    this.items = this.items.map((t) => (t.id === id ? { ...t, ...patch, nonce: t.nonce + 1 } : t));
    this.emit();
  }

  /** Shows a sticky loading toast; returns the full content-update and promise settlement chain. */
  promise<T>(promise: Promise<T>, opts: ToastPromiseOptions<T>): Promise<T> {
    const id = this.toast({ ...normalizeContent(opts.loading), severity: Severity.Info, duration: Infinity });
    const settle = (content: ToastContent, severity: ToastSeverity) =>
      this.update(id, { ...normalizeContent(content), severity, duration: opts.duration });
    return promise.then(
      (value) => {
        settle(typeof opts.success === 'function' ? opts.success(value) : opts.success, Severity.Success);
        return value;
      },
      (err: unknown) => {
        settle(typeof opts.error === 'function' ? opts.error(err) : opts.error, Severity.Danger);
        throw err;
      },
    );
  }

  /** Removes a toast and fires its `onDismiss`; an unknown id removes nothing. */
  dismiss(id: string): void {
    const entry = this.items.find((t) => t.id === id);
    this.items = this.items.filter((t) => t.id !== id);
    try {
      entry?.onDismiss?.();
    } finally {
      this.emit();
    }
  }

  /** Removes every toast and fires each `onDismiss`. */
  dismissAll(): void {
    const gone = this.items;
    this.items = [];
    try {
      for (const t of gone) t.onDismiss?.();
    } finally {
      this.emit();
    }
  }

  /** Subscribes to the live toast list, receiving the current list at once; returns an unsubscribe. */
  subscribe(fn: ToastListener): () => void {
    this.listeners.add(fn);
    fn(this.items);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn(this.items);
  }
}

/** The app-wide store every `ToastHost` renders; its imperative API is `useToastHost()`. */
export const toastHost = new ToastHostStore();
