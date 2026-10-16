// The scheduler — the headless core of the uploads vector. Owns admission (validate), ordering, a bounded
// concurrency pool, retry, cancellation, and progress aggregation. Framework-free (no Vue import) so it can be
// created at module scope, inside a provider, or in a plain node test; `UseUploadQueue.ts` is the Vue seam on
// top, exactly as `commands` splits `CommandRegistry` from `useCommandRegistry`.
//
// THE CONTRACT: NOTHING HERE THROWS AT THE CALLER. A transport that rejects, a transport that throws
// synchronously, a cancelled attempt, and a file rejected up front are all NORMAL OUTCOMES that land on an item's
// `status` and leave the pool running. A queue whose `add` could throw would force a try/catch around a drop
// handler, and one failing file would take down the other nine.
//
// Non-obvious decisions:
// - RETRY MATH IS NOT WRITTEN HERE. `shouldRetry` decides, `computeRetryDelay` sizes the wait, both from
//   `foundation/resilience` — the same primitives `foundation/http`'s client and `/query` use, so an upload backs
//   off identically to every other request in the app. The only timing code below is a plain abortable
//   `setTimeout`, which schedules the delay it is handed; it never computes one.
// - `shouldRetry` is status-driven, so a transport failure is read for a numeric `status`
//   (`readUploadErrorStatus`). No status ⇒ `0` ⇒ transient under the default policy: a dropped connection retries,
//   a `413` does not. That is the correct default for uploads, where the payload is unchanged by a retry.
// - A CANCELLED UPLOAD IS NEVER RETRIED. `isAbortError` (plus a direct `signal.aborted` check, for a transport
//   that rejects with something else) short-circuits before the retry decision. Retrying a cancel would make the
//   button lie.
// - An item stays `uploading` THROUGH its backoff wait, holding its concurrency slot. Freeing the slot would let
//   a queue of failing files spawn unbounded parallel waiters and defeat the cap.
// - Progress is normalized on the RATIO the transport reports, not its raw `loaded`: a multipart body is bigger
//   than the file (boundary + headers), so `loaded` alone would overshoot `file.size`.
// - `version()` exists for the subscribing composable: `items()` builds a fresh array per call, so it can never
//   be the tracked value (identity changes on every read). The monotonic counter is the stable cursor; items
//   themselves are swapped immutably so a row can key on item identity.
// - Every mutation notifies, including each progress event. A chatty transport therefore means frequent
//   listeners; throttle in YOUR listener if that matters — the queue will not silently drop state changes.
// - `patch` is a no-op for an unknown id. An in-flight upload whose item was `remove`d or `clear`ed keeps running
//   until its abort lands, and its late writes must not resurrect a deleted row.

import { isAbortError, toError } from '../errors';
import { fileExtension, matchesAccept, safeFileName } from '../files';
import { formatBytes } from '../formatters';
import { Guid } from '../identifiers';
import { DefaultRetryPolicy, computeRetryDelay, shouldRetry, type RetryPolicy } from '../resilience';

import { UploadRejectionReason, UploadStatus, isUploadTerminal, type UploadItem } from './UploadItem';
import { readUploadErrorStatus, type UploadTransport } from './UploadTransport';

/** The default number of uploads in flight — enough to saturate a connection without starving the rest of the app. */
export const DefaultUploadConcurrency = 3;

/** Notified after a queue mutation — admission, status change, progress, removal. No payload; re-read the queue. */
export type UploadQueueListener = () => void;

/** Configures a queue at creation. Only `transport` is required. */
export interface UploadQueueOptions<TResult = unknown> {
  /** How a file is actually sent. The queue never assumes `fetch` or `XMLHttpRequest`; see {@link UploadTransport}. */
  readonly transport: UploadTransport<TResult>;

  /** Max uploads in flight. Defaults to {@link DefaultUploadConcurrency}; values below `1` are clamped up. */
  readonly concurrency?: number;

  /** An `accept`-attribute list (`image/*,.pdf`) admitted files must match, via `foundation/files`' `matchesAccept`. */
  readonly accept?: string;

  /** The largest admitted file, in bytes. A larger file is rejected up front rather than queued. */
  readonly maxSize?: number;

  /** The retry policy for failed attempts, or `false` to fail on the first error. Defaults to `DefaultRetryPolicy`. */
  readonly retry?: RetryPolicy | false;
}

/** Describes the queue as a whole — what a summary bar renders without walking the item list. */
export interface UploadQueueState {
  /** How many items the queue holds, in any status. */
  readonly total: number;

  /** How many items sit in each status. A file rejected up front counts under `failed`. */
  readonly counts: Readonly<Record<UploadStatus, number>>;

  /** Aggregate progress `0`–`1`, byte-weighted over in-play items. `0` when nothing is in play. */
  readonly progress: number;

  /** Total bytes uploaded across in-play items. */
  readonly bytesUploaded: number;

  /**
   * Total bytes of in-play items — everything except cancelled items and files rejected up front, whose bytes
   * will never arrive and would otherwise pin `progress` below `1` forever.
   */
  readonly totalBytes: number;

  /** Whether any item is still queued or uploading. */
  readonly isUploading: boolean;
}

/** The headless upload store — admission, scheduling, cancellation, retry, and change notification. */
export interface UploadQueue<TResult = unknown> {
  /**
   * Admits one file or many, returning the new item ids in the order given. Always returns an array, including
   * for a single file. A file failing `accept` / `maxSize` still gets an id — as a `failed` item carrying a
   * `rejection` — so the caller can render why. Never throws.
   */
  readonly add: (input: File | ReadonlyArray<File>) => ReadonlyArray<string>;

  /**
   * Aborts an item. A queued item flips to `cancelled` immediately; an uploading one is aborted through its
   * signal and settles `cancelled` once the transport unwinds (asynchronously). Reports whether anything was
   * cancellable — `false` for an unknown id or an already-terminal item.
   */
  readonly cancel: (id: string) => boolean;

  /** Aborts every queued and uploading item. In-flight ones settle asynchronously, as with {@link cancel}. */
  readonly cancelAll: () => void;

  /**
   * Re-queues a `failed` or `cancelled` item for another run; `attempt` continues from where it stopped.
   * Refuses (`false`) an item rejected up front — re-sending an oversized file cannot change the verdict.
   */
  readonly retry: (id: string) => boolean;

  /** Drops an item, aborting it first when in flight (nothing would be listening for its result). */
  readonly remove: (id: string) => boolean;

  /** Drops every item, cancelling anything still in flight. */
  readonly clear: () => void;

  /** Every item in admission order. Fresh array per call — never track it directly; track `version()` instead. */
  readonly items: () => readonly UploadItem<TResult>[];

  /** Looks up one item — `undefined` when absent. Item identity is stable between changes to that item. */
  readonly get: (id: string) => UploadItem<TResult> | undefined;

  /** The aggregate snapshot — counts, byte totals, overall progress. Fresh object per call. */
  readonly state: () => UploadQueueState;

  /** Subscribes to mutations; returns an unsubscribe. */
  readonly subscribe: (listener: UploadQueueListener) => () => void;

  /** A monotonic counter bumped on every mutation — the stable-identity snapshot the composables subscribe to. */
  readonly version: () => number;
}

/** Waits `ms`, resolving early (never rejecting) if `signal` aborts. The caller re-checks `signal.aborted` after. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    // `finish` closes over `timer` declared below it: legal because it only ever runs after both are initialized
    // (as the timer's own callback, or as an abort listener attached last).
    const finish = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });
}

/**
 * Creates an {@link UploadQueue}. One per upload surface is the norm; create extra ones to isolate a modal's
 * uploads from a background set, or per test.
 */
export function createUploadQueue<TResult = unknown>(options: UploadQueueOptions<TResult>): UploadQueue<TResult> {
  const { transport, accept, maxSize } = options;
  const requestedConcurrency = options.concurrency ?? DefaultUploadConcurrency;
  const concurrency = Number.isFinite(requestedConcurrency)
    ? Math.max(1, Math.floor(requestedConcurrency))
    : DefaultUploadConcurrency;
  const retryPolicy: RetryPolicy | false = options.retry ?? DefaultRetryPolicy;

  const entries = new Map<string, UploadItem<TResult>>();
  /** The in-flight set — one controller per running attempt. Its size IS the concurrency count. */
  const controllers = new Map<string, AbortController>();
  const listeners = new Set<UploadQueueListener>();
  let revision = 0;
  let pumping = false;

  /** Bumps the version then fans out over a copy, so a listener may unsubscribe while being notified. */
  function notify(): void {
    revision += 1;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        /* Observers cannot interrupt the queue lifecycle. */
      }
    }
  }

  /** Replaces an item with a changed copy and notifies. Silently drops writes for an id that is no longer queued. */
  function patch(id: string, changes: Partial<Omit<UploadItem<TResult>, 'id' | 'file'>>): void {
    const current = entries.get(id);
    if (current === undefined) return;
    entries.set(id, { ...current, ...changes });
    notify();
  }

  /** Names a file's type for a rejection message — the MIME type, or the extension when the browser gave none. */
  function describeFileType(file: File): string {
    if (file.type !== '') return file.type;
    const extension = fileExtension(file.name);
    return extension === '' ? 'of an unknown type' : `a ".${extension}" file`;
  }

  /** Applies the admission rules. `undefined` = admitted. */
  function validate(file: File): UploadRejectionReason | undefined {
    if (accept !== undefined && !matchesAccept(file, accept)) return UploadRejectionReason.Type;
    if (maxSize !== undefined && file.size > maxSize) return UploadRejectionReason.Size;
    return undefined;
  }

  /** Builds the user-facing rejection reason. The name is sanitized — attacker-controlled text headed for a UI. */
  function rejectionError(file: File, reason: UploadRejectionReason): Error {
    const name = safeFileName(file.name);
    if (reason === UploadRejectionReason.Size) {
      return new Error(`"${name}" is ${formatBytes(file.size)}, over the ${formatBytes(maxSize ?? 0)} limit.`);
    }
    return new Error(`"${name}" is ${describeFileType(file)}, which does not match "${accept ?? ''}".`);
  }

  /** Records a transport progress report, normalized onto `file.size` (see the ratio note in the header). */
  function recordProgress(id: string, loaded: number, total?: number): void {
    const current = entries.get(id);
    if (current === undefined || current.status !== UploadStatus.Uploading) return;

    const size = current.file.size;
    const denominator = total !== undefined && total > 0 ? total : size;
    const fraction = denominator > 0 ? Math.min(1, Math.max(0, loaded / denominator)) : 0;
    const bytesUploaded = Math.round(fraction * size);

    // Transports re-fire identical events; skipping the no-op keeps a listener from waking for nothing.
    if (fraction === current.progress && bytesUploaded === current.bytesUploaded) return;
    patch(id, { progress: fraction, bytesUploaded });
  }

  /**
   * Runs one item to a terminal state: attempt → retry loop → settle. Never rejects; every exit path is a status.
   * Holds a slot in `controllers` for its whole life, backoff waits included, and pumps the next item on exit.
   */
  async function runItem(id: string): Promise<void> {
    const initial = entries.get(id);
    if (initial === undefined) return;

    // Attempts already spent in earlier run cycles — a manual `retry()` continues the count, never resets it.
    const baseAttempt = initial.attempt;
    const controller = new AbortController();
    controllers.set(id, controller);

    let retries = 0;
    let previousDelayMs = 0;

    try {
      for (;;) {
        const current = entries.get(id);
        if (current === undefined) return;

        patch(id, {
          status: UploadStatus.Uploading,
          attempt: baseAttempt + retries + 1,
          progress: 0,
          bytesUploaded: 0,
          error: undefined,
        });

        try {
          const attempt = baseAttempt + retries + 1;
          const result = await transport.upload(current.file, {
            signal: controller.signal,
            onProgress: (loaded: number, total?: number) => {
              if (
                !controller.signal.aborted &&
                controllers.get(id) === controller &&
                entries.get(id)?.attempt === attempt
              )
                recordProgress(id, loaded, total);
            },
          });
          // A transport that ignores its signal can still resolve after a cancel; the user's intent wins.
          if (controller.signal.aborted) {
            patch(id, { status: UploadStatus.Cancelled });
            return;
          }
          patch(id, {
            status: UploadStatus.Succeeded,
            progress: 1,
            bytesUploaded: current.file.size,
            result,
          });
          return;
        } catch (caught) {
          if (isAbortError(caught) || controller.signal.aborted) {
            patch(id, { status: UploadStatus.Cancelled });
            return;
          }

          const status = readUploadErrorStatus(caught);
          if (retryPolicy !== false && shouldRetry(retryPolicy, retries, status)) {
            const attemptNumber = retries + 1;
            const delayMs = computeRetryDelay(retryPolicy, attemptNumber, previousDelayMs);
            try {
              retryPolicy.onRetry?.({ attempt: attemptNumber, error: caught, status, delayMs });
            } catch (error) {
              patch(id, { status: UploadStatus.Failed, error: toError(error) });
              return;
            }
            await sleep(delayMs, controller.signal);
            if (controller.signal.aborted) {
              patch(id, { status: UploadStatus.Cancelled });
              return;
            }
            previousDelayMs = delayMs;
            retries = attemptNumber;
            continue;
          }

          patch(id, { status: UploadStatus.Failed, error: toError(caught) });
          return;
        }
      }
    } catch (error) {
      patch(id, {
        status: controller.signal.aborted ? UploadStatus.Cancelled : UploadStatus.Failed,
        error: toError(error),
      });
    } finally {
      controllers.delete(id);
      pump();
    }
  }

  /**
   * Starts queued items until the pool is full. Re-entrancy-guarded: `runItem`'s `finally` pumps again, and a
   * transport that throws synchronously would otherwise recurse once per queued item.
   */
  function pump(): void {
    if (pumping) return;
    pumping = true;
    try {
      while (controllers.size < concurrency) {
        let next: UploadItem<TResult> | undefined;
        for (const item of entries.values()) {
          if (item.status === UploadStatus.Queued) {
            next = item;
            break;
          }
        }
        if (next === undefined) return;
        void runItem(next.id);
      }
    } finally {
      pumping = false;
    }
  }

  /** Builds the item an admitted or rejected file starts life as. */
  function createItem(file: File): UploadItem<TResult> {
    const id = Guid.createV7() as string;
    const rejection = validate(file);
    if (rejection !== undefined) {
      return {
        id,
        file,
        status: UploadStatus.Failed,
        progress: 0,
        bytesUploaded: 0,
        attempt: 0,
        rejection,
        error: rejectionError(file, rejection),
      };
    }
    return { id, file, status: UploadStatus.Queued, progress: 0, bytesUploaded: 0, attempt: 0 };
  }

  function cancel(id: string): boolean {
    const item = entries.get(id);
    if (item === undefined || isUploadTerminal(item.status)) return false;

    const controller = controllers.get(id);
    if (controller !== undefined) {
      // The status flips inside `runItem` once the transport unwinds — cancellation is inherently async.
      controller.abort();
      return true;
    }
    patch(id, { status: UploadStatus.Cancelled });
    pump();
    return true;
  }

  /** Hoisted out of the returned object so `clear` can call it without a `this` binding (the API is destructurable). */
  function cancelAll(): void {
    for (const item of [...entries.values()]) {
      if (!isUploadTerminal(item.status)) cancel(item.id);
    }
  }

  return {
    add(input: File | ReadonlyArray<File>): ReadonlyArray<string> {
      const files = input instanceof File ? [input] : input;
      const created = files.map(createItem);
      for (const item of created) entries.set(item.id, item);
      // ONE notification for the whole admission — dropping ten files notifies once, not ten times. The `pump`
      // below then adds one more per item it actually starts, since each of those is a real status change.
      notify();
      pump();
      return created.map((item) => item.id);
    },

    cancel,

    cancelAll,

    retry(id: string): boolean {
      const item = entries.get(id);
      if (item === undefined || item.rejection !== undefined) return false;
      if (item.status !== UploadStatus.Failed && item.status !== UploadStatus.Cancelled) return false;

      patch(id, {
        status: UploadStatus.Queued,
        progress: 0,
        bytesUploaded: 0,
        error: undefined,
        result: undefined,
      });
      pump();
      return true;
    },

    remove(id: string): boolean {
      if (!entries.has(id)) return false;
      controllers.get(id)?.abort();
      entries.delete(id);
      notify();
      pump();
      return true;
    },

    clear(): void {
      entries.clear();
      // A slot belongs to the transport until it settles, even when its item has been removed.
      for (const controller of controllers.values()) controller.abort();
      notify();
    },

    items(): ReadonlyArray<UploadItem<TResult>> {
      return [...entries.values()];
    },

    get(id: string): UploadItem<TResult> | undefined {
      return entries.get(id);
    },

    state(): UploadQueueState {
      const counts: Record<UploadStatus, number> = {
        [UploadStatus.Queued]: 0,
        [UploadStatus.Uploading]: 0,
        [UploadStatus.Succeeded]: 0,
        [UploadStatus.Failed]: 0,
        [UploadStatus.Cancelled]: 0,
      };

      let bytesUploaded = 0;
      let totalBytes = 0;
      for (const item of entries.values()) {
        counts[item.status] += 1;
        // Cancelled + rejected bytes are excluded from both sides — they are never arriving.
        if (item.status === UploadStatus.Cancelled || item.rejection !== undefined) continue;
        bytesUploaded += item.bytesUploaded;
        totalBytes += item.file.size;
      }

      return {
        total: entries.size,
        counts,
        bytesUploaded,
        totalBytes,
        progress: totalBytes > 0 ? Math.min(1, bytesUploaded / totalBytes) : 0,
        isUploading: counts[UploadStatus.Queued] > 0 || counts[UploadStatus.Uploading] > 0,
      };
    },

    subscribe(listener: UploadQueueListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    version(): number {
      return revision;
    },
  };
}
