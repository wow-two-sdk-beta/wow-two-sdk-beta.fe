// The Vue binding for the windowing math: watch a scroll container, and hand back only the items that need to
// exist in the DOM. Headless — it renders nothing and dictates no markup; it returns numbers.
//
// WHAT THE COMPOSABLE ACTUALLY OWNS: three pieces of state (scroll offset, viewport size, a measurement
// version) and the watchers that keep them true. Everything geometric is delegated to
// `Windowing`/`Measurements`, which stay pure and node-testable. If a change is about "which items", it
// belongs there, not here.
//
// THE CONTAINER IS RESOLVED REACTIVELY, which deletes the original's re-resolve-on-every-commit effect. A
// template ref is itself reactive, so a swapped, unmounted, or conditionally rendered container simply
// re-triggers the computed. `getScrollElement` is still supported for a container held outside a ref, but it
// is only re-read when something else in the same computed changes — prefer `target` when the node can move.
//
// SCROLL ANCHORING — the hard part, and the reason this composable is more than 40 lines:
//
//   When an item ABOVE the fold turns out to be taller than its estimate, every pixel below it shifts down by
//   the difference. The user is looking at those pixels, so the list visibly jumps under them — the classic
//   "content leaps while you're reading" bug in every hand-rolled virtual list. The fix is to add the same
//   delta to the scroll position, which cancels the shift exactly: same content, same pixels.
//
//   Two details make it actually work:
//
//   1. WHEN to compensate. Only when the re-measured item ends AT OR ABOVE the viewport's top edge. If it
//      merely straddles that edge, its own top is pinned above the fold and does not move, so the content the
//      user is reading is already stable — compensating there would CAUSE the jump instead of preventing it.
//      Below the fold, nothing visible moves at all.
//
//   2. WHEN to apply it. Not inside `measureItem`: at that moment the container is still its old height, so
//      assigning a larger `scrollTop` gets silently clamped by the browser and the correction is lost. It is
//      staged as an accumulated delta and applied from a `flush: 'post'` WATCHER — after Vue patches the taller
//      spacer, before the browser paints. The applied value is then read back from the DOM, because the browser
//      is the authority on how far the container can actually scroll.
//
//   Deltas accumulate rather than overwrite: several items commonly re-measure in one flush, and each must
//   contribute.
//
// LOOP SAFETY: `measureItem` is a no-op when the size is unchanged. That single guard is what keeps a consumer
// wiring it to a ResizeObserver from spinning measure -> render -> measure forever.
//
// SSR: every DOM read sits behind a resolved-element guard inside a post-flush watcher, and `target` resolves
// to `null` on the server, so nothing here touches `scrollTop`, `clientHeight`, or `ResizeObserver` during a
// server render. The reported window is the one implied by `initialViewportSize`.

import {
  computed,
  shallowRef,
  toValue,
  watch,
  watchPostEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

import { useResizeObserver } from '../observers';

import { buildMeasurements, itemOffset, itemSize, measurementsTotalSize, type Measurements } from './Measurements';
import {
  DefaultOverscan,
  computeRange,
  computeScrollOffset,
  type ScrollAlignment,
  type VirtualRange,
} from './Windowing';

/** One rendered row: where to put it and how big it is. */
export interface VirtualItem {
  /** Index into the consumer's data array. */
  readonly index: number;

  /** Offset of the item's start edge from the list's start, in pixels — the value to position it at. */
  readonly start: number;

  /** The item's current size in pixels: its real measurement if one was recorded, otherwise the estimate. */
  readonly size: number;

  /** Stable key for `v-for` — `getItemKey(index)` when supplied, otherwise the index itself. */
  readonly key: string | number;
}

/** Configures a `useVirtualList` binding. */
export interface UseVirtualListOptions {
  /** How many items the full list has. */
  readonly count: MaybeRefOrGetter<number>;

  /**
   * Estimated size before measurement, in pixels. Reactive values read by this callback invalidate the geometry.
   */
  readonly estimateSize: (index: number) => number;

  /** The scrolling container, as a ref or getter. A `useTemplateRef` drops straight in. */
  readonly target?: MaybeRefOrGetter<HTMLElement | null | undefined>;

  /** Callback form of the same thing, for containers not held in a ref. Takes precedence over `target`. */
  readonly getScrollElement?: () => HTMLElement | null;

  /** Extra items rendered beyond each edge of the viewport. Defaults to {@link DefaultOverscan}. */
  readonly overscan?: MaybeRefOrGetter<number | undefined>;

  /** Whether the list scrolls horizontally (`scrollLeft`/`clientWidth`) instead of vertically. Defaults to `false`. */
  readonly horizontal?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Viewport size assumed before the container is measured — set it to render a sensible first frame under SSR.
   * Defaults to `0`.
   */
  readonly initialViewportSize?: number;

  /** Stable item identity for rendering and retained measurements across reorders. Defaults to the index. */
  readonly getItemKey?: (index: number) => string | number;
}

/** What a virtualized list hands back to its consumer. */
export interface VirtualList {
  /** The items to render right now, in index order, overscan included. Empty when the list is empty. */
  readonly virtualItems: ComputedRef<ReadonlyArray<VirtualItem>>;

  /** Combined size of every item — the size the scrollable spacer must have for the scrollbar to be honest. */
  readonly totalSize: ComputedRef<number>;

  /** The underlying window: rendered index bounds plus leading/trailing spacer sizes, for padding-based layouts. */
  readonly range: ComputedRef<VirtualRange>;

  /** Pixels of content skipped before the first rendered item. Same as `range.paddingStart`. */
  readonly paddingStart: ComputedRef<number>;

  /** Pixels of content skipped after the last rendered item. Same as `range.paddingEnd`. */
  readonly paddingEnd: ComputedRef<number>;

  /** The container's current scroll position along the list's axis, as the composable last observed it. */
  readonly scrollOffset: Readonly<ShallowRef<number>>;

  /** The container's measured viewport size along the list's axis. `0` until the container mounts. */
  readonly viewportSize: Readonly<ShallowRef<number>>;

  /**
   * Scrolls the container so item `index` is in view.
   *
   * @param index Item to reveal; clamped into range.
   * @param align Where it should land. Defaults to `'auto'` — a no-op when the item is already fully visible.
   */
  scrollToIndex(index: number, align?: ScrollAlignment): void;

  /**
   * Records an item's real measured size, replacing its estimate. A no-op when the size is unchanged, so it is
   * safe to call from a ResizeObserver or a post-flush watcher on every update.
   *
   * Preserves the visible content when the item sits above the fold — see this file's header.
   *
   * @param index The item that was measured.
   * @param size Its real size in pixels.
   */
  measureItem(index: number, size: number): void;
}

/**
 * Virtualizes a list: subscribes to a scroll container and reports only the items overlapping its viewport.
 *
 * Headless by design — it produces geometry, never markup. The consumer renders a spacer sized `totalSize` and
 * positions each `virtualItem` at its `start`. See the `foundation/virtualization` barrel for a usage sketch.
 *
 * @param options The item count, size estimator, and the container to watch.
 * @returns The current window, total size, and the `scrollToIndex` / `measureItem` controls.
 */
export function useVirtualList(options: UseVirtualListOptions): VirtualList {
  const horizontal = computed(() => toValue(options.horizontal) ?? false);
  const count = computed(() => toValue(options.count));
  const overscan = computed(() => toValue(options.overscan) ?? DefaultOverscan);

  const scrollOffset = shallowRef(0);
  const viewportSize = shallowRef(Math.max(0, options.initialViewportSize ?? 0));
  const measurementVersion = shallowRef(0);

  const scrollElement = computed<HTMLElement | null>(
    () => options.getScrollElement?.() ?? toValue(options.target) ?? null,
  );

  /** Real sizes reported through `measureItem`, keyed by index; absent entries fall back to the estimate. */
  const measuredSizes = new Map<string | number, number>();

  /** Scroll correction owed to items that grew/shrank above the fold, applied after the next patch. */
  let pendingScrollDelta = 0;

  const measurements = computed<Measurements>(() => {
    // `measurementVersion` is the content key for the measured-size map, which is a plain `Map` and therefore
    // cannot be tracked itself. `estimateSize` is read at build time on purpose: making it reactive would
    // rebuild every offset whenever an inline arrow was re-created.
    void measurementVersion.value;
    return buildMeasurements(count.value, (index) => {
      const measured = measuredSizes.get(options.getItemKey?.(index) ?? index);
      return measured ?? options.estimateSize(index);
    });
  });

  watch(
    horizontal,
    () => {
      measuredSizes.clear();
      pendingScrollDelta = 0;
      measurementVersion.value += 1;
    },
    { flush: 'sync' },
  );

  const totalSize = computed(() => measurementsTotalSize(measurements.value));

  // Track the container's scroll position. `passive` because this listener never calls `preventDefault`, so the
  // browser may keep scrolling on its own thread. Post-flush and element-guarded, so nothing runs on the server.
  watchPostEffect((onCleanup) => {
    const element = scrollElement.value;
    if (!element) return;
    const isHorizontal = horizontal.value;

    const sync = (): void => {
      const next = isHorizontal ? element.scrollLeft : element.scrollTop;
      if (scrollOffset.value !== next) scrollOffset.value = next;
    };

    // Adopt the position the container already has — a restored scroll or a deep link would otherwise render
    // the top of the list until the user's first scroll.
    sync();
    element.addEventListener('scroll', sync, { passive: true });
    onCleanup(() => element.removeEventListener('scroll', sync));
  });

  function readViewportSize(): void {
    const element = scrollElement.value;
    if (!element) return;
    // `clientHeight`/`clientWidth`, not the observer's `contentRect`: the scrollable viewport includes padding
    // and excludes the scrollbar, which is exactly what these report and `contentRect` does not.
    const next = horizontal.value ? element.clientWidth : element.clientHeight;
    if (viewportSize.value !== next) viewportSize.value = next;
  }

  useResizeObserver(scrollElement, readViewportSize, () => scrollElement.value !== null);

  // Seed the size before the first paint. The observer also fires on attach, but that lands a frame later — long
  // enough to paint one frame of an unwindowed (or empty) list.
  watchPostEffect(readViewportSize);

  // Apply the anchoring correction owed from the last `measureItem` batch. Runs AFTER the patch that resized
  // the spacer, so the container can actually reach the new offset, and BEFORE paint, so nothing jumps.
  // Non-immediate: there is nothing to correct on the first pass, and the server has no container.
  watch(
    [measurementVersion, horizontal],
    () => {
      const delta = pendingScrollDelta;
      if (delta === 0) return;
      pendingScrollDelta = 0;

      const element = scrollElement.value;
      if (!element) return;

      const isHorizontal = horizontal.value;
      const currentPosition = isHorizontal ? element.scrollLeft : element.scrollTop;
      const next = Math.max(0, currentPosition + delta);
      if (isHorizontal) element.scrollLeft = next;
      else element.scrollTop = next;

      // Read back rather than trusting the arithmetic — the browser clamps to the container's real scroll range.
      const applied = isHorizontal ? element.scrollLeft : element.scrollTop;
      if (scrollOffset.value !== applied) scrollOffset.value = applied;
    },
    { flush: 'post' },
  );

  const range = computed<VirtualRange>(() =>
    computeRange({
      scrollOffset: scrollOffset.value,
      viewportSize: viewportSize.value,
      itemCount: count.value,
      overscan: overscan.value,
      // Always the variable-size path: measured sizes can make any list non-uniform at any time, and the
      // binary search over the prefix sum is O(log n) either way.
      getOffset: (index) => itemOffset(measurements.value, index),
    }),
  );

  const virtualItems = computed<readonly VirtualItem[]>(() => {
    const window = range.value;
    if (window.endIndex < window.startIndex) return [];

    const { getItemKey } = options;
    const current = measurements.value;
    const items: VirtualItem[] = [];
    for (let index = window.startIndex; index <= window.endIndex; index += 1) {
      items.push({
        index,
        start: itemOffset(current, index),
        size: itemSize(current, index),
        key: getItemKey ? getItemKey(index) : index,
      });
    }
    return items;
  });

  function measureItem(index: number, size: number): void {
    if (!Number.isFinite(size) || size < 0) return;

    const current = measurements.value;
    if (!Number.isInteger(index) || index < 0 || index >= current.count) return;

    const previous = itemSize(current, index);
    // The guard that stops a measure -> render -> measure loop dead. Everything below re-derives.
    if (previous === size) return;

    measuredSizes.set(options.getItemKey?.(index) ?? index, size);

    // Compensate only for an item entirely above the viewport's top edge — see this file's header for why a
    // straddling item must NOT be compensated. Accumulate: a whole batch of items can re-measure in one flush.
    const endsAboveFold = itemOffset(current, index) + previous <= scrollOffset.value;
    if (endsAboveFold) pendingScrollDelta += size - previous;

    measurementVersion.value += 1;
  }

  function scrollToIndex(index: number, align: ScrollAlignment = 'auto'): void {
    const element = scrollElement.value;
    if (!element) return;

    const isHorizontal = horizontal.value;
    const current = measurements.value;
    // Read position and size live off the DOM: `scrollToIndex` is often called right after a mutation, before
    // the composable's state has caught up, and the stale value would land the item in the wrong place.
    const next = computeScrollOffset({
      index,
      align,
      scrollOffset: isHorizontal ? element.scrollLeft : element.scrollTop,
      viewportSize: isHorizontal ? element.clientWidth : element.clientHeight,
      itemCount: current.count,
      getOffset: (target) => itemOffset(current, target),
    });

    if (isHorizontal) element.scrollLeft = next;
    else element.scrollTop = next;

    const applied = isHorizontal ? element.scrollLeft : element.scrollTop;
    if (scrollOffset.value !== applied) scrollOffset.value = applied;
  }

  return {
    virtualItems,
    totalSize,
    range,
    paddingStart: computed(() => range.value.paddingStart),
    paddingEnd: computed(() => range.value.paddingEnd),
    scrollOffset,
    viewportSize,
    scrollToIndex,
    measureItem,
  };
}
