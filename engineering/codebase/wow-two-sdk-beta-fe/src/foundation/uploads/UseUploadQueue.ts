// The Vue subscription seam over a queue — how a component updates as uploads progress. Mirrors `commands`'
// `UseCommandRegistry.ts`: the store is framework-free, this file is the only part that imports Vue.
//
// Non-obvious decisions:
// - These track `queue.version()` as the subscription snapshot, NOT `items()` / `state()`. Both build a fresh
//   value per call, so either as the snapshot would look changed on every read. The monotonic counter is
//   identity-stable between mutations; the arrays and the aggregate derive from it through a `computed`.
// - The subscription is attached in `onMounted` and dropped in `onScopeDispose`, the same shape
//   `foundation/device`' `useMediaQuery` uses. The queue is plain in-memory state with no client-only source, so
//   the SSR pass reads a correct version rather than a placeholder — the mount hook exists for the listener, not
//   for a platform global.
// - `useUploadQueueSnapshot(queue)` takes the queue EXPLICITLY, so an app that owns a module-scope queue (uploads
//   that must survive tearing down the panel) can subscribe without this file creating anything.
// - `useUploadQueue(options)` is the convenience on top and creates its queue ONCE, at setup — the queue holds
//   in-flight work, so rebuilding it on a changed option would strand running uploads. Consequence, stated
//   plainly: `concurrency` / `accept` / `maxSize` / `retry` are read at SETUP and later changes are ignored.
//   Need them dynamic → own the queue and re-create it deliberately.
// - `transport` is the exception: it is delegated through `toValue`, so an inline `{ upload: ... }` closing over
//   current props stays live instead of being frozen at setup. Same trick `provideCommands` uses for `onError`,
//   and it is what makes the common inline call site correct without any memoization by the caller.
// - The action callbacks are the queue's own methods, already referentially stable, so nothing wraps them.

import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

import type { UploadItem } from './UploadItem';
import { createUploadQueue, type UploadQueue, type UploadQueueOptions, type UploadQueueState } from './UploadQueue';

/**
 * Subscribes to a queue's mutations and returns its version counter. The building block behind
 * {@link useUploadQueueSnapshot}; use it directly to derive a custom projection
 * (`computed(() => (version.value, queue.items().filter(failed)))`).
 */
export function useUploadQueueVersion<TResult = unknown>(queue: UploadQueue<TResult>): Readonly<ShallowRef<number>> {
  const version = shallowRef(queue.version());

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    // Re-read first: a mutation between setup and mount would otherwise be missed entirely.
    version.value = queue.version();
    unsubscribe = queue.subscribe(() => {
      version.value = queue.version();
    });
  });

  onScopeDispose(() => {
    unsubscribe?.();
    unsubscribe = undefined;
  });

  return version;
}

/** The item list plus the aggregate state of an explicitly-owned queue, updating the caller on every change. */
export function useUploadQueueSnapshot<TResult = unknown>(
  queue: UploadQueue<TResult>,
): {
  readonly items: ComputedRef<ReadonlyArray<UploadItem<TResult>>>;
  readonly state: ComputedRef<UploadQueueState>;
} {
  const version = useUploadQueueVersion(queue);
  // `version` is the mutation cursor that invalidates both reads — touched, then discarded.
  return {
    items: computed(() => {
      void version.value;
      return queue.items();
    }),
    state: computed(() => {
      void version.value;
      return queue.state();
    }),
  };
}

/** What {@link useUploadQueue} hands a component — live state plus every queue action. */
export interface UseUploadQueueControls<TResult = unknown> {
  /** The underlying queue, for anything the flattened actions don't cover (`get`, `subscribe`, passing it down). */
  readonly queue: UploadQueue<TResult>;

  /** Every item in admission order, refreshed on each change. */
  readonly items: ComputedRef<ReadonlyArray<UploadItem<TResult>>>;

  /** The aggregate snapshot — counts, byte totals, overall progress. */
  readonly state: ComputedRef<UploadQueueState>;

  /** Admits one file or many; returns the new item ids. See `UploadQueue.add`. */
  readonly add: UploadQueue<TResult>['add'];

  /** Aborts one item. See `UploadQueue.cancel`. */
  readonly cancel: UploadQueue<TResult>['cancel'];

  /** Aborts every queued and uploading item. */
  readonly cancelAll: UploadQueue<TResult>['cancelAll'];

  /** Re-queues a failed or cancelled item. */
  readonly retry: UploadQueue<TResult>['retry'];

  /** Drops an item, aborting it first when in flight. */
  readonly remove: UploadQueue<TResult>['remove'];

  /** Drops every item, cancelling anything still in flight. */
  readonly clear: UploadQueue<TResult>['clear'];
}

/**
 * Creates an upload queue scoped to the component and subscribes to it — the one-call entry point for an upload
 * panel or drop zone.
 *
 * The queue is created at setup and kept for the scope's lifetime, so `concurrency` / `accept` / `maxSize` /
 * `retry` are setup-time values (`transport` stays live — see the file header). Disposal clears the queue and cancels
 * in-flight uploads. To retain uploads, hoist `createUploadQueue` and use {@link useUploadQueueSnapshot}.
 *
 * @param options Queue configuration. A ref or getter keeps `transport` live; the rest is read once.
 */
export function useUploadQueue<TResult = unknown>(
  options: MaybeRefOrGetter<UploadQueueOptions<TResult>>,
): UseUploadQueueControls<TResult> {
  const queue = createUploadQueue<TResult>({
    ...toValue(options),
    // Delegated, not captured: the current transport handles every attempt.
    transport: { upload: (file, context) => toValue(options).transport.upload(file, context) },
  });

  onScopeDispose(queue.clear);
  const { items, state } = useUploadQueueSnapshot(queue);

  return {
    queue,
    items,
    state,
    add: queue.add,
    cancel: queue.cancel,
    cancelAll: queue.cancelAll,
    retry: queue.retry,
    remove: queue.remove,
    clear: queue.clear,
  };
}
