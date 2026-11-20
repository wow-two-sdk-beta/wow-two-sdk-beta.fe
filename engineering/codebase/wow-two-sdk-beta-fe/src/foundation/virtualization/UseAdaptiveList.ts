// A cursor-paged list that fetches its next page before the reader reaches the end. Headless — it renders nothing and
// owns no network code: the consumer supplies `load(cursor)`, binds `sentinel` to an empty element after the last
// item, and renders `items`.
//
// THE SENTINEL IS THE WHOLE TRIGGER. An `IntersectionObserver` with a bottom `rootMargin` watches the element, so a
// page starts loading while it is still `rootMargin` below the fold. The observer is rebuilt after every page that
// lands: a fresh observer reports the sentinel's CURRENT state, which is what keeps a tall viewport loading until it
// is full and what keeps a stale "still intersecting" answer from fetching a page nobody needs.
//
// A FAILURE STOPS THE LOADING. `error` is set, the observer is dropped, and nothing is retried on its own — a
// sentinel that stays in view would otherwise hammer a failing endpoint. `loadMore()` is the retry.
//
// `reset()` IS A NEW LIST. It aborts the request in flight, ignores its late answer, clears the items and the
// cursor, and loads the first page again — what a changed filter or search wants.
//
// SSR: the effect that observes and the first load run after mount, so a server render holds an empty list.

import {
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toValue,
  watchPostEffect,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

import { observeIntersection } from '../observers';

/** Fires one page below the fold by default — three quarters of the root's height. */
const DefaultRootMargin = '0px 0px 75% 0px';

/** One page of a cursor-paged list. */
export interface AdaptiveListPage<TItem, TCursor = string> {
  /** The items of this page, appended after the loaded ones. */
  readonly items: ReadonlyArray<TItem>;

  /** The cursor of the page after this one, handed to the next `load`. */
  readonly next: TCursor | null;

  /** Whether a page follows this one. `false` ends the loading. */
  readonly hasMore: boolean;
}

/** Defines the options of `useAdaptiveList`. */
export interface UseAdaptiveListOptions<TItem, TCursor = string> {
  /**
   * Loads one page. `cursor` is `null` for the first page, then the previous page's `next`. `signal` aborts when
   * the list resets or its scope ends; pass it to `fetch` to cancel the request.
   */
  readonly load: (cursor: TCursor | null, signal: AbortSignal) => Promise<AdaptiveListPage<TItem, TCursor>>;

  /** The scroll container the sentinel is measured against. Omit, or pass `null`, for the viewport. */
  readonly root?: MaybeRefOrGetter<Element | Document | null | undefined>;

  /** The margin that starts a load before the sentinel is visible. Default `'0px 0px 75% 0px'`. */
  readonly rootMargin?: string;

  /** Suspends loading — the first page included — while `false`. Default `true`. */
  readonly isEnabled?: MaybeRefOrGetter<boolean>;
}

/** The handle `useAdaptiveList` returns. */
export interface AdaptiveList<TItem> {
  /** Every item loaded so far, in load order. Replaced, never mutated. */
  readonly items: Readonly<Ref<ReadonlyArray<TItem>>>;

  /** Whether a page is loading. */
  readonly isLoading: Readonly<Ref<boolean>>;

  /** What the last `load` rejected with, or `null`. Loading stops until `loadMore()` or `reset()`. */
  readonly error: Readonly<Ref<unknown>>;

  /** Whether another page may follow the loaded ones. */
  readonly hasMore: Readonly<Ref<boolean>>;

  /** The element to bind after the last item — `<div ref="sentinel" />` in a `<script setup>` template. */
  readonly sentinel: Ref<HTMLElement | null>;

  /** Loads the next page now. Joins the load in flight; a no-op once `hasMore` is `false`. Clears `error` first. */
  readonly loadMore: () => Promise<void>;

  /** Starts over: aborts the load in flight, clears the items and the cursor, and loads the first page. */
  readonly reset: () => Promise<void>;
}

/** Returns a cursor-paged list that loads its next page before the sentinel after the last item scrolls into view. */
export function useAdaptiveList<TItem, TCursor = string>(
  options: UseAdaptiveListOptions<TItem, TCursor>,
): AdaptiveList<TItem> {
  const items = shallowRef<ReadonlyArray<TItem>>([]);
  const isLoading = shallowRef(false);
  const error = shallowRef<unknown>(null);
  const hasMore = shallowRef(true);
  const sentinel = shallowRef<HTMLElement | null>(null);

  /** Bumped after each page so the observer is rebuilt and reports the sentinel's current state. */
  const rearm = shallowRef(0);

  let cursor: TCursor | null = null;
  let generation = 0;
  let started = false;
  let inflight: { readonly promise: Promise<void>; readonly controller: AbortController } | null = null;

  const isEnabled = (): boolean => toValue(options.isEnabled) !== false;

  function loadMore(): Promise<void> {
    if (inflight) return inflight.promise;
    if (!hasMore.value || !isEnabled()) return Promise.resolve();

    const run = generation;
    const controller = new AbortController();
    error.value = null;
    isLoading.value = true;

    const promise = (async () => {
      try {
        const page = await options.load(cursor, controller.signal);
        if (run !== generation) return;
        items.value = [...items.value, ...page.items];
        cursor = page.next;
        hasMore.value = page.hasMore;
        rearm.value++;
      } catch (failure) {
        if (run !== generation) return;
        error.value = failure ?? new TypeError('load rejected without a reason');
      } finally {
        if (run === generation) {
          inflight = null;
          isLoading.value = false;
        }
      }
    })();

    inflight = { promise, controller };
    return promise;
  }

  function reset(): Promise<void> {
    generation++;
    inflight?.controller.abort();
    inflight = null;
    items.value = [];
    cursor = null;
    hasMore.value = true;
    error.value = null;
    isLoading.value = false;
    rearm.value++;
    started = isEnabled();
    return started ? loadMore() : Promise.resolve();
  }

  watchPostEffect((onCleanup) => {
    void rearm.value;
    if (!isEnabled()) return;

    if (!started) {
      started = true;
      void loadMore();
    }

    const element = sentinel.value;
    if (!element || !hasMore.value || error.value !== null) return;

    const dispose = observeIntersection(
      element,
      (entry) => {
        if (entry.isIntersecting) void loadMore();
      },
      { root: toValue(options.root) ?? null, rootMargin: options.rootMargin ?? DefaultRootMargin },
    );
    onCleanup(dispose);
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      generation++;
      inflight?.controller.abort();
      inflight = null;
    });
  }

  return { items, isLoading, error, hasMore, sentinel, loadMore, reset };
}
