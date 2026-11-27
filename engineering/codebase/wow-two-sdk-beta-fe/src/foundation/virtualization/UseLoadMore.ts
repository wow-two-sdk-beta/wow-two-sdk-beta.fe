/* Loads a long collection page by page: the first page, a `Show more` gate, then pages by scroll speed. */

import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  nextTick,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComponentPublicInstance,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { useOnlineStatus, useReducedMotion } from '../device';
import { resolveElement } from '../dom';
import type { ApiFailure } from '../http';
import {
  LoadMoreState,
  type DataRegionBinding,
  type LoadMorePage,
  type LoadMorePhase,
  type LoadMoreRow,
  type LoadMoreSnapshot,
  type LoadMoreSource,
  type LoadMoreWindow,
  type PageSizeBounds,
} from './LoadMoreModels';
import { clampPageSizes } from './LoadMorePaging';
import { useAdaptiveWindow } from './UseAdaptiveWindow';

/** The page-size bounds when none are given — the be SDK `PagingConstants`. */
export const DefaultPageSizes: PageSizeBounds = { minimum: 20, maximum: 100 };

const IndexAttribute = 'data-load-more-index';
const Focusable =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Configures `useLoadMore`. */
export interface UseLoadMoreOptions<TItem, TCursor, TMeta, TFailure> {
  readonly source: LoadMoreSource<TItem, TCursor, TMeta, TFailure>;
  /** Stable identity: de-duplication, upsert, live inserts, focus, row keys. */
  readonly key: (item: TItem) => string | number;
  /** The element (or component) whose direct children are the items. Resolved with `resolveElement`. */
  readonly list: MaybeRefOrGetter<Element | ComponentPublicInstance | null | undefined>;
  /** Everything that selects the collection (filters, sort, debounced search, parent id). A change resets. */
  readonly query?: MaybeRefOrGetter<unknown>;
  /** Default `{ minimum: 20, maximum: 100 }`; read at each request. */
  readonly pageSizes?: MaybeRefOrGetter<PageSizeBounds>;
  /** Default `pageSizes.minimum`. */
  readonly firstPageSize?: MaybeRefOrGetter<number>;
  /** Default `'list'`. */
  readonly layout?: MaybeRefOrGetter<'list' | 'grid'>;
  /** List estimate, px; default 48. */
  readonly estimatedRowHeight?: number;
  /** Grid estimate, width / height; default 1. */
  readonly cardAspectRatio?: number;
  /** Default true; DOM windowing in automatic mode. */
  readonly isWindowed?: MaybeRefOrGetter<boolean>;
  /** Default true; false holds every request. */
  readonly isEnabled?: MaybeRefOrGetter<boolean>;
  /** `true` keeps the current object on upsert (no re-render). Default: always replace. */
  readonly isSameItem?: (current: TItem, next: TItem) => boolean;
  /** Where focus lands inside an item element. Default: its first focusable descendant, else the element. */
  readonly focusTarget?: (element: HTMLElement) => HTMLElement | null;
  /** Called once per failure episode and phase; route it to the app toast host. Never for a cancellation. */
  readonly onFailure?: (failure: TFailure, phase: LoadMorePhase) => void;
  /** Default: `failure.code === 'cancelled'` (ApiFailure). An aborted signal is ignored regardless. */
  readonly isCancellation?: (failure: TFailure) => boolean;
  /** Default true: `refreshHead()` when the document becomes visible again (heals a dropped live event). */
  readonly refreshesOnFocus?: boolean;
  /** Restores a view; ignored unless `initial.queryKey` equals the current query key. */
  readonly initial?: LoadMoreSnapshot<TItem, TCursor, TMeta>;
}

/** The handle `useLoadMore` returns. */
export interface LoadMore<TItem, TCursor = unknown, TMeta = undefined> {
  /** Every loaded item, replaced never mutated. */
  readonly items: Readonly<Ref<ReadonlyArray<TItem>>>;
  /** Render this: the window slice plus stand-ins. */
  readonly rows: ComputedRef<ReadonlyArray<LoadMoreRow<TItem>>>;
  readonly window: ComputedRef<LoadMoreWindow>;
  readonly state: Readonly<Ref<LoadMoreState>>;
  readonly isLoadingNext: Readonly<Ref<boolean>>;
  readonly isRefreshingHead: Readonly<Ref<boolean>>;
  /** The last head read failed. */
  readonly isStale: Readonly<Ref<boolean>>;
  readonly total: Readonly<Ref<number | undefined>>;
  readonly meta: Readonly<Ref<TMeta | undefined>>;
  /** Live items held behind `NewItemsButton`. */
  readonly pendingCount: Readonly<Ref<number>>;
  /** Items the last landed page appended. */
  readonly lastAdded: Readonly<Ref<number>>;
  /** `v-bind` on `DataRegion`. */
  readonly region: ComputedRef<DataRegionBinding>;
  /** `v-bind` on the list element: `aria-busy` and the window padding style. */
  readonly listAttrs: ComputedRef<{ 'aria-busy': 'true' | undefined; style: Record<string, string> }>;
  itemAttrs(index: number): { 'data-load-more-index': number };
  showMore(): Promise<void>;
  refresh(): Promise<void>;
  refreshHead(): Promise<void>;
  reset(): void;
  insertAtStart(items: ReadonlyArray<TItem>): void;
  upsert(item: TItem): void;
  remove(key: string | number): void;
  showPending(): Promise<void>;
  snapshot(): LoadMoreSnapshot<TItem, TCursor, TMeta>;
}

/** Serialises a query with sorted object keys, so equal selections compare equal. */
export function loadMoreQueryKey(query: unknown): string {
  return JSON.stringify(query ?? null, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : value,
  );
}

type ReadOutcome<TItem, TCursor, TMeta, TFailure> =
  { readonly page: LoadMorePage<TItem, TCursor, TMeta> } | { readonly failure: TFailure } | undefined;

/** Loads a long collection: first page, `Show more`, then pages sized and timed by the reader's scroll speed. */
export function useLoadMore<TItem, TCursor = string, TMeta = undefined, TFailure = ApiFailure>(
  options: UseLoadMoreOptions<TItem, TCursor, TMeta, TFailure>,
): LoadMore<TItem, TCursor, TMeta> {
  const keyOf = options.key;
  const pageSizes = () => clampPageSizes(toValue(options.pageSizes) ?? DefaultPageSizes);
  const firstPageSize = () => Math.max(1, Math.floor(toValue(options.firstPageSize) ?? pageSizes().minimum));
  const isGrid = () => toValue(options.layout) === 'grid';
  const isEnabled = () => toValue(options.isEnabled) ?? true;
  const isCancellation =
    options.isCancellation ?? ((failure: TFailure) => (failure as { code?: unknown } | null)?.code === 'cancelled');
  const queryKey = () => loadMoreQueryKey(toValue(options.query));
  const online = useOnlineStatus();
  const reducedMotion = useReducedMotion();
  const motion = (): ScrollBehavior => (reducedMotion.value ? 'auto' : 'smooth');

  const items = shallowRef<ReadonlyArray<TItem>>([]);
  const state = shallowRef<LoadMoreState>(LoadMoreState.FirstLoad);
  const isLoadingNext = shallowRef(false);
  const isRefreshingHead = shallowRef(false);
  const isStale = shallowRef(false);
  const total = shallowRef<number | undefined>();
  const meta = shallowRef<TMeta | undefined>();
  const pending = shallowRef<ReadonlyArray<TItem>>([]);
  const lastAdded = shallowRef(0);
  const firstFailure = shallowRef<TFailure | null>(null);
  const standIns = shallowRef(firstPageSize());
  const focusedIndex = shallowRef<number | undefined>();
  let cursor: TCursor | null = null;
  let hasMore = false;
  let gap = false;
  let pressed = false;
  let generation = 0;
  let firstInFlight = false;
  const controllers = new Set<AbortController>();
  const episodes = new Set<LoadMorePhase>();

  const listElement = computed(() => resolveElement(toValue(options.list)));
  const view = useAdaptiveWindow(listElement, {
    count: () => items.value.length,
    grid: isGrid,
    isWindowed: () => (toValue(options.isWindowed) ?? true) && state.value === LoadMoreState.Automatic,
    canLoad: () =>
      state.value === LoadMoreState.Automatic && hasMore && online.value && isEnabled() && !isLoadingNext.value,
    pageSizes,
    load: (limit) => loadNext(limit),
    rowIndex: (element) => {
      const value = element.getAttribute(IndexAttribute);
      return value === null ? undefined : Number(value);
    },
    keepIndex: () => focusedIndex.value,
    estimatedRowHeight: options.estimatedRowHeight ?? 48,
    cardAspectRatio: options.cardAspectRatio ?? 1,
  });
  const keyAt = (index: number) => {
    const item = items.value[index];
    return item === undefined ? undefined : keyOf(item);
  };

  function notify(failure: TFailure, phase: LoadMorePhase) {
    if (episodes.has(phase)) return;
    episodes.add(phase);
    options.onFailure?.(failure, phase);
  }

  function dedupe(list: ReadonlyArray<TItem>, known = new Set<string | number>()): TItem[] {
    const result: TItem[] = [];
    for (const item of list) {
      const key = keyOf(item);
      if (known.has(key)) continue;
      known.add(key);
      result.push(item);
    }
    return result;
  }

  async function read(
    cursorValue: TCursor | null,
    limit: number,
  ): Promise<ReadOutcome<TItem, TCursor, TMeta, TFailure>> {
    const own = generation;
    const controller = new AbortController();
    controllers.add(controller);
    try {
      const result = await options.source.read({ cursor: cursorValue, limit, signal: controller.signal });
      if (own !== generation || controller.signal.aborted) return undefined;
      if (result.ok) return { page: result.value };
      return isCancellation(result.failure) ? undefined : { failure: result.failure };
    } catch (error) {
      if (own !== generation || controller.signal.aborted) return undefined;
      throw error;
    } finally {
      controllers.delete(controller);
    }
  }

  function applyPageData(page: LoadMorePage<TItem, TCursor, TMeta>) {
    if (page.total !== undefined) total.value = page.total;
    if (page.meta !== undefined) meta.value = page.meta;
  }

  function settle(next: TCursor | null) {
    cursor = next;
    hasMore = next !== null;
    if (!hasMore) state.value = LoadMoreState.End;
  }

  async function loadFirst(): Promise<void> {
    if (!isEnabled() || typeof document === 'undefined') return;
    firstInFlight = true;
    const outcome = await read(null, firstPageSize());
    if (outcome) firstInFlight = false;
    if (!outcome) return;
    if ('failure' in outcome) {
      if (items.value.length === 0) {
        firstFailure.value = outcome.failure;
        state.value = LoadMoreState.Unavailable;
      } else isStale.value = true;
      notify(outcome.failure, 'first');
      return;
    }
    episodes.delete('first');
    firstFailure.value = null;
    isStale.value = false;
    const page = outcome.page;
    items.value = dedupe(page.items);
    lastAdded.value = 0;
    total.value = page.total;
    meta.value = page.meta;
    state.value = pressed ? LoadMoreState.Automatic : LoadMoreState.Gated;
    settle(page.next);
  }

  async function loadNext(limit: number): Promise<boolean> {
    if (!hasMore || isLoadingNext.value || !isEnabled()) return false;
    const own = generation;
    isLoadingNext.value = true;
    try {
      const outcome = await read(cursor, limit);
      if (!outcome) return false;
      if ('failure' in outcome) {
        state.value = LoadMoreState.Gated;
        notify(outcome.failure, 'next');
        return false;
      }
      episodes.delete('next');
      const added = dedupe(outcome.page.items, new Set(items.value.map(keyOf)));
      items.value = [...items.value, ...added];
      lastAdded.value = added.length;
      applyPageData(outcome.page);
      settle(outcome.page.next);
      return true;
    } finally {
      if (own === generation) isLoadingNext.value = false;
    }
  }

  function abortAll() {
    generation++;
    for (const controller of controllers) controller.abort();
    controllers.clear();
    isLoadingNext.value = false;
    isRefreshingHead.value = false;
    firstInFlight = false;
  }

  function scrollTopIntoView() {
    const element = listElement.value;
    const top = view.scroller.value?.getBoundingClientRect().top ?? 0;
    if (element && element.getBoundingClientRect().top < top) view.scrollListTo(0, motion());
  }

  function reset() {
    const previous = items.value.length;
    abortAll();
    scrollTopIntoView();
    items.value = [];
    pending.value = [];
    gap = false;
    cursor = null;
    hasMore = false;
    total.value = undefined;
    meta.value = undefined;
    firstFailure.value = null;
    isStale.value = false;
    lastAdded.value = 0;
    episodes.clear();
    standIns.value = Math.min(firstPageSize(), previous || firstPageSize());
    state.value = LoadMoreState.FirstLoad;
    void loadFirst();
  }

  async function refresh(): Promise<void> {
    if (state.value === LoadMoreState.FirstLoad || state.value === LoadMoreState.Unavailable) {
      if (state.value === LoadMoreState.Unavailable) state.value = LoadMoreState.FirstLoad;
      abortAll();
      firstFailure.value = null;
      await loadFirst();
      return;
    }
    abortAll();
    scrollTopIntoView();
    pending.value = [];
    gap = false;
    await loadFirst();
  }

  function focusItem(index: number) {
    const element = listElement.value?.querySelector<HTMLElement>(`[${IndexAttribute}="${index}"]`);
    if (!element) return;
    const target =
      options.focusTarget?.(element) ??
      (element.matches(Focusable) ? element : element.querySelector<HTMLElement>(Focusable));
    const focusable = target ?? element;
    if (!target && !focusable.hasAttribute('tabindex')) focusable.setAttribute('tabindex', '-1');
    focusable.focus({ preventScroll: true });
  }

  async function showMore(): Promise<void> {
    if (state.value !== LoadMoreState.Gated && state.value !== LoadMoreState.Automatic) return;
    if (isLoadingNext.value || !online.value) return;
    pressed = true;
    const first = items.value.length;
    const loaded = await loadNext(pageSizes().minimum);
    if (!loaded) return;
    if (state.value === LoadMoreState.Gated) state.value = LoadMoreState.Automatic;
    if (items.value.length > first) {
      await nextTick();
      focusItem(first);
    }
  }

  function isAtStart(): boolean {
    const element = listElement.value;
    if (!element) return true;
    const scroller = view.scroller.value;
    const bottom = scroller
      ? scroller.getBoundingClientRect().bottom
      : (element.ownerDocument.defaultView?.innerHeight ?? 0);
    const rowSize = options.estimatedRowHeight ?? 48;
    return element.getBoundingClientRect().top < bottom && view.viewport.value.offset <= rowSize;
  }

  /* Every mutation above the reader runs inside an anchor so the first visible item keeps its on-screen top. */
  function mutate(change: () => void) {
    const restore = view.anchor(keyAt);
    change();
    void restore();
  }

  function prepend(arrivals: ReadonlyArray<TItem>) {
    const fresh = dedupe(arrivals, new Set(items.value.map(keyOf)));
    if (!fresh.length) return;
    mutate(() => {
      items.value = [...fresh, ...items.value];
      cursor = options.source.shift(cursor, fresh.length);
    });
  }

  function arrive(arrivals: ReadonlyArray<TItem>) {
    if (!arrivals.length) return;
    if (pending.value.length === 0 && isAtStart()) prepend(arrivals);
    else pending.value = dedupe([...arrivals, ...pending.value], new Set(items.value.map(keyOf)));
  }

  function merge(incoming: ReadonlyArray<TItem>, detectsGap: boolean) {
    const result = [...items.value];
    const position = new Map(result.map((item, index) => [keyOf(item), index] as const));
    const arrivals: TItem[] = [];
    let neighbour: number | undefined;
    let inserted = 0;
    let changed = false;
    for (const item of incoming) {
      const key = keyOf(item);
      const index = position.get(key);
      if (index !== undefined) {
        const current = result[index]!;
        if (!options.isSameItem?.(current, item) && current !== item) {
          result[index] = item;
          changed = true;
        }
        neighbour = index;
      } else if (neighbour === undefined) arrivals.push(item);
      else {
        neighbour++;
        result.splice(neighbour, 0, item);
        for (const [other, at] of position) if (at >= neighbour) position.set(other, at + 1);
        position.set(key, neighbour);
        inserted++;
        changed = true;
      }
    }
    if (detectsGap && neighbour === undefined && incoming.length && items.value.length) {
      gap = true;
      pending.value = [...incoming];
      return;
    }
    if (changed)
      mutate(() => {
        items.value = result;
        if (inserted) cursor = options.source.shift(cursor, inserted);
      });
    arrive(arrivals);
  }

  async function refreshHead(): Promise<void> {
    if (!online.value || !isEnabled() || isRefreshingHead.value) return;
    if (state.value === LoadMoreState.FirstLoad || state.value === LoadMoreState.Unavailable) return;
    isRefreshingHead.value = true;
    const own = generation;
    try {
      const outcome = await read(null, firstPageSize());
      if (!outcome) return;
      if ('failure' in outcome) {
        isStale.value = true;
        notify(outcome.failure, 'head');
        return;
      }
      episodes.delete('head');
      isStale.value = false;
      total.value = outcome.page.total;
      meta.value = outcome.page.meta;
      merge(outcome.page.items, true);
    } finally {
      if (own === generation) isRefreshingHead.value = false;
    }
  }

  function upsert(item: TItem) {
    merge([item], false);
  }

  function remove(key: string | number) {
    pending.value = pending.value.filter((item) => keyOf(item) !== key);
    if (!items.value.some((item) => keyOf(item) === key)) return;
    mutate(() => {
      items.value = items.value.filter((item) => keyOf(item) !== key);
      cursor = options.source.shift(cursor, -1);
    });
  }

  async function showPending(): Promise<void> {
    if (gap) {
      reset();
      return;
    }
    if (!pending.value.length) return;
    const held = pending.value;
    pending.value = [];
    view.scrollListTo(0, motion());
    const fresh = dedupe(held, new Set(items.value.map(keyOf)));
    items.value = [...fresh, ...items.value];
    cursor = options.source.shift(cursor, fresh.length);
    await nextTick();
    focusItem(0);
  }

  function snapshot(): LoadMoreSnapshot<TItem, TCursor, TMeta> {
    return {
      queryKey: queryKey(),
      items: items.value,
      cursor,
      hasMore,
      ...(total.value === undefined ? {} : { total: total.value }),
      ...(meta.value === undefined ? {} : { meta: meta.value }),
      state: state.value,
      scrollOffset: view.viewport.value.offset,
    };
  }

  const rows = computed<ReadonlyArray<LoadMoreRow<TItem>>>(() => {
    const standIn = (index: number): LoadMoreRow<TItem> => ({ item: undefined, index, key: `stand-in-${index}` });
    if (state.value === LoadMoreState.FirstLoad)
      return Array.from({ length: standIns.value }, (_, index) => standIn(index));
    const { start, end } = view.range.value;
    const list = items.value;
    const result: LoadMoreRow<TItem>[] = [];
    for (let index = start; index < Math.min(end, list.length); index++)
      result.push({ item: list[index], index, key: keyOf(list[index]!) });
    if (end >= list.length && isLoadingNext.value) {
      const tail = isGrid() ? view.columns.value : 3;
      for (let offset = 0; offset < tail; offset++) result.push(standIn(list.length + offset));
    }
    return result;
  });

  const windowed = computed(() => (toValue(options.isWindowed) ?? true) && state.value === LoadMoreState.Automatic);
  const region = computed<DataRegionBinding>(() => ({
    isFirstLoad: state.value === LoadMoreState.FirstLoad,
    isRefreshing: isRefreshingHead.value,
    error:
      state.value === LoadMoreState.Unavailable && firstFailure.value !== null
        ? describeFailure(firstFailure.value)
        : null,
    hasData: items.value.length > 0,
    isEmpty: state.value === LoadMoreState.End && items.value.length === 0,
  }));
  const listAttrs = computed(() => {
    const { paddingStart, paddingEnd } = view.range.value;
    return {
      'aria-busy': isLoadingNext.value ? ('true' as const) : undefined,
      style: {
        overflowAnchor: 'none',
        ...(windowed.value ? { paddingBlockStart: `${paddingStart}px`, paddingBlockEnd: `${paddingEnd}px` } : {}),
      },
    };
  });

  /* Query changes reset synchronously, so the request in flight is aborted before anything else runs. */
  let lastKey = queryKey();
  watch(
    queryKey,
    (key) => {
      if (key === lastKey) return;
      lastKey = key;
      reset();
    },
    { flush: 'sync' },
  );

  /* The reader scrolling back to the start merges what waited behind the pill. */
  watch(
    () => view.viewport.value.offset,
    () => {
      if (!gap && pending.value.length && isAtStart()) {
        const held = pending.value;
        pending.value = [];
        prepend(held);
      }
    },
  );

  /* A focused item stays mounted; past the window's cap the list element takes focus instead. */
  watch(listElement, (element, _previous, onCleanup) => {
    if (!element) return;
    const onFocusIn = (event: Event) => {
      const owner = (event.target as Element | null)?.closest?.(`[${IndexAttribute}]`);
      const index = owner?.getAttribute(IndexAttribute);
      focusedIndex.value = index == null ? undefined : Number(index);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!element.contains(event.relatedTarget as Node | null)) focusedIndex.value = undefined;
    };
    element.addEventListener('focusin', onFocusIn);
    element.addEventListener('focusout', onFocusOut);
    onCleanup(() => {
      element.removeEventListener('focusin', onFocusIn);
      element.removeEventListener('focusout', onFocusOut);
    });
  });
  watch(
    () => view.range.value,
    (range) => {
      const index = focusedIndex.value;
      const element = listElement.value;
      if (index === undefined || !element || (index >= range.start && index < range.end)) return;
      if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
      focusedIndex.value = undefined;
      element.focus({ preventScroll: true });
    },
    { flush: 'pre' },
  );

  watch(isEnabled, (enabled) => {
    if (enabled && state.value === LoadMoreState.FirstLoad && !firstInFlight) void loadFirst();
  });

  function start() {
    const initial = options.initial;
    if (initial && initial.queryKey === queryKey()) {
      items.value = initial.items;
      cursor = initial.cursor;
      hasMore = initial.hasMore;
      total.value = initial.total;
      meta.value = initial.meta;
      state.value = initial.state;
      pressed = initial.state === LoadMoreState.Automatic;
      void nextTick(() => view.scrollListTo(initial.scrollOffset, 'auto'));
      return;
    }
    void loadFirst();
  }

  if (typeof document !== 'undefined') {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && (options.refreshesOnFocus ?? true)) void refreshHead();
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (getCurrentScope())
      onScopeDispose(() => {
        document.removeEventListener('visibilitychange', onVisibility);
        abortAll();
      });
    if (getCurrentInstance()) onMounted(start);
    else start();
  }

  return {
    items,
    rows,
    window: computed(() => view.range.value),
    state,
    isLoadingNext,
    isRefreshingHead,
    isStale,
    total,
    meta,
    pendingCount: computed(() => pending.value.length),
    lastAdded,
    region,
    listAttrs,
    itemAttrs: (index) => ({ [IndexAttribute]: index }) as { 'data-load-more-index': number },
    showMore,
    refresh,
    refreshHead,
    reset,
    insertAtStart: (arrivals) => merge(arrivals, false),
    upsert,
    remove,
    showPending,
    snapshot,
  };
}

/** Turns a failure into `DataRegion`'s error shape: its `message` when it has one, else a generic line. */
function describeFailure(failure: unknown): string | { readonly message: string } {
  const message = (failure as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? { message } : 'The collection could not be loaded.';
}
