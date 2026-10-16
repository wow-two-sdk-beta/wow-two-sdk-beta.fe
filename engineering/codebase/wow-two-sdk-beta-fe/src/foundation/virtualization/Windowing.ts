// The windowing math: given where the list is scrolled and how big the viewport is, which slice of items must
// actually exist in the DOM, and how much empty space stands in for the rest.
//
// Everything here is a PURE FUNCTION of numbers — no Vue, no DOM, no time. That is deliberate: this is the
// part with the off-by-one edges (boundary-exact scroll positions, overscan clamping, an empty list, a viewport
// larger than the content), so it has to be exhaustively testable in node without a layout engine. The Vue
// composable is a thin shell over these two functions.
//
// TWO PATHS, ONE ANSWER:
//
//  - FIXED SIZE (`estimateSize` is a number, no `getOffset`) — the index at a pixel is a division. O(1), no
//    search, no array. The overwhelmingly common list.
//  - VARIABLE SIZE (`getOffset` supplied) — the index at a pixel is a binary search over cumulative offsets,
//    O(log n) (`Measurements.findIndexByOffsetAccessor`). A linear scan would be O(n) on EVERY scroll frame,
//    which is the exact cost virtualization exists to remove, so it is not an option here.
//
// Both paths are defined to return the same thing: the last item whose start edge is at or before the pixel.
// The tests assert they agree, because a silent divergence between them would only show up as a one-row flicker
// at certain scroll positions.
//
// CLAMPING IS PART OF THE CONTRACT, not defensive noise. Real scroll containers report values this math must
// survive: negative offsets during macOS rubber-band overscroll, offsets past the end during a bounce, a
// viewport taller than the content, `count` dropping to 0 mid-flight. Each is clamped to the nearest sane
// window rather than producing a NaN range that renders nothing.

import { findIndexByOffsetAccessor } from './Measurements';

/** The default number of off-screen items kept mounted on each side — enough to cover a fast flick's first frames. */
export const DefaultOverscan = 3;

/** Where a `scrollToIndex` should land the target item within the viewport. */
export type ScrollAlignment =
  /** Item's top edge at the viewport's top edge. */
  | 'start'
  /** Item centred in the viewport. */
  | 'center'
  /** Item's bottom edge at the viewport's bottom edge. */
  | 'end'
  /** Scroll the shortest distance to bring the item fully into view; do nothing if it already is. */
  | 'auto';

/** The slice of a list that must be rendered, plus the empty space standing in for everything else. */
export interface VirtualRange {
  /** First item index to render, overscan included. `0` when nothing renders. */
  readonly startIndex: number;

  /**
   * Last item index to render, INCLUSIVE and overscan included. `-1` when nothing renders (an empty list), so
   * `endIndex < startIndex` is the emptiness test and `endIndex - startIndex + 1` is always the rendered count.
   */
  readonly endIndex: number;

  /** Pixels of skipped content before `startIndex` — the leading spacer's size. */
  readonly paddingStart: number;

  /** Pixels of skipped content after `endIndex` — the trailing spacer's size. */
  readonly paddingEnd: number;
}

/** The empty-list range: renders nothing, reserves nothing. */
export const EmptyRange: VirtualRange = {
  startIndex: 0,
  endIndex: -1,
  paddingStart: 0,
  paddingEnd: 0,
};

/** Inputs to the windowing math. Supply `estimateSize` for a fixed list, `getOffset` for a variable one. */
export interface ComputeRangeOptions {
  /** Current scroll position of the container along the list's axis, in pixels. Clamped into the scrollable range. */
  readonly scrollOffset: number;

  /** Visible size of the container along the list's axis, in pixels — `clientHeight`, or `clientWidth` horizontal. */
  readonly viewportSize: number;

  /** How many items the list has. Floored to a non-negative integer. */
  readonly itemCount: number;

  /**
   * Item sizing. A NUMBER selects the fixed-size fast path (O(1), no search). A FUNCTION is a per-index
   * estimate and forces an O(n) prefix-sum build here, so pass `getOffset` instead on any hot path — that is
   * exactly what `useVirtualList` does. Omit entirely only alongside `getOffset`.
   */
  readonly estimateSize?: number | ((index: number) => number);

  /**
   * Extra items rendered beyond each edge of the viewport. Defaults to `0`; `useVirtualList` overrides that
   * with {@link DefaultOverscan}.
   */
  readonly overscan?: number;

  /**
   * Cumulative start-offset accessor, defined for `0 .. itemCount` (where `itemCount` yields the total size).
   * Supplying it selects the variable-size path — the binary search. Takes precedence over `estimateSize`.
   */
  readonly getOffset?: (index: number) => number;
}

/** Inputs to {@link computeScrollOffset} — the same geometry, plus which item to reveal and how. */
export interface ComputeScrollOffsetOptions extends ComputeRangeOptions {
  /** The item to bring into view. Clamped into `[0, itemCount - 1]`. */
  readonly index: number;

  /** Where the item should land. Defaults to `'auto'`. */
  readonly align?: ScrollAlignment;
}

/** Replaces NaN/Infinity with 0 so one bad input can never poison the arithmetic downstream. */
function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Constrains `value` to `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolves the options bag to a single non-decreasing offset accessor over `0 .. itemCount`, so the range math
 * below never has to branch on how the list is sized. The `estimateSize`-as-function case materializes a prefix
 * sum (O(n)) — see the `estimateSize` docs for why that path is a convenience, not a hot path.
 */
function resolveOffsetAt(options: ComputeRangeOptions, itemCount: number): (index: number) => number {
  const { getOffset, estimateSize } = options;

  if (getOffset) {
    return (index) => finite(getOffset(clamp(Math.floor(index), 0, itemCount)));
  }

  if (typeof estimateSize === 'number') {
    const size = Math.max(0, finite(estimateSize));
    return (index) => clamp(Math.floor(index), 0, itemCount) * size;
  }

  if (typeof estimateSize === 'function') {
    const offsets = new Array<number>(itemCount + 1);
    offsets[0] = 0;
    let running = 0;
    for (let index = 0; index < itemCount; index += 1) {
      running += Math.max(0, finite(estimateSize(index)));
      offsets[index + 1] = running;
    }
    return (index) => offsets[clamp(Math.floor(index), 0, itemCount)] ?? 0;
  }

  // Neither sizing input given — every item is zero-sized. Degenerate but total, never NaN.
  return () => 0;
}

/**
 * Computes the slice of items overlapping the viewport, widened by `overscan` and clamped to the list.
 *
 * Boundary rule: an item whose start edge sits EXACTLY on the viewport's bottom edge is not visible and is not
 * included (before overscan). Both sizing paths implement that identically.
 *
 * @param options Scroll position, viewport size, item count, and the sizing input.
 * @returns The indices to render plus the leading/trailing spacer sizes. `paddingStart` + the rendered items'
 * combined size + `paddingEnd` always equals the list's total size.
 */
export function computeRange(options: ComputeRangeOptions): VirtualRange {
  const itemCount = Number.isFinite(options.itemCount) ? Math.max(0, Math.floor(options.itemCount)) : 0;
  if (itemCount === 0) return EmptyRange;

  const overscan = Math.max(0, Math.floor(finite(options.overscan ?? 0)));
  const viewportSize = Math.max(0, finite(options.viewportSize));

  const offsetAt = resolveOffsetAt(options, itemCount);
  const totalSize = offsetAt(itemCount);

  // The container cannot scroll past its own content; a bounce or a stale offset lands on the last window
  // rather than on an empty one. This also collapses the "viewport bigger than content" case to offset 0.
  const maxScroll = Math.max(0, totalSize - viewportSize);
  const scrollOffset = clamp(finite(options.scrollOffset), 0, maxScroll);
  const bottomEdge = scrollOffset + viewportSize;

  // The fixed path is arithmetic only when the uniform size is positive; a zero/degenerate size falls through
  // to the search so both paths still agree on the answer.
  const uniformSize =
    !options.getOffset && typeof options.estimateSize === 'number' ? Math.max(0, finite(options.estimateSize)) : 0;

  let firstVisible: number;
  let lastVisible: number;

  if (uniformSize > 0) {
    firstVisible = clamp(Math.floor(scrollOffset / uniformSize), 0, itemCount - 1);
    // `ceil(edge / size) - 1` is the last item STARTING before the bottom edge, which is the boundary rule.
    lastVisible = clamp(Math.ceil(bottomEdge / uniformSize) - 1, 0, itemCount - 1);
    if (lastVisible < firstVisible) lastVisible = firstVisible;
  } else {
    firstVisible = findIndexByOffsetAccessor(offsetAt, itemCount, scrollOffset);
    lastVisible = findIndexByOffsetAccessor(offsetAt, itemCount, bottomEdge);
    // The search is inclusive of `<= bottomEdge`; an item starting exactly ON the edge is off-screen. Only
    // step back when doing so still leaves something rendered.
    if (lastVisible > firstVisible && offsetAt(lastVisible) >= bottomEdge) lastVisible -= 1;
  }

  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(itemCount - 1, lastVisible + overscan);

  return {
    startIndex,
    endIndex,
    paddingStart: Math.max(0, offsetAt(startIndex)),
    paddingEnd: Math.max(0, totalSize - offsetAt(endIndex + 1)),
  };
}

/** The target offset for a given alignment, before clamping into the scrollable range. */
function alignedOffset(
  align: ScrollAlignment,
  start: number,
  end: number,
  viewportSize: number,
  current: number,
): number {
  switch (align) {
    case 'start':
      return start;
    case 'end':
      return end - viewportSize;
    case 'center':
      return start + (end - start) / 2 - viewportSize / 2;
    case 'auto': {
      // Already fully visible, or already covering the whole viewport (an item taller than it) — hold still.
      // Moving here would be the jump `auto` exists to avoid.
      if (start >= current && end <= current + viewportSize) return current;
      if (start <= current && end >= current + viewportSize) return current;
      // An item that cannot fit pins its top edge; otherwise take the shorter of the two edges.
      if (end - start >= viewportSize) return start;
      return start < current ? start : end - viewportSize;
    }
  }
}

/**
 * Computes the scroll offset that brings `index` into view under a given alignment.
 *
 * `'auto'` is a no-op when the item is already fully visible (or already spans the whole viewport), which is
 * what makes it safe to call on every selection change without fighting the user's scrolling.
 *
 * @param options Geometry plus the target `index` and `align`.
 * @returns The offset to assign to the container, clamped to `[0, totalSize - viewportSize]`.
 */
export function computeScrollOffset(options: ComputeScrollOffsetOptions): number {
  const itemCount = Number.isFinite(options.itemCount) ? Math.max(0, Math.floor(options.itemCount)) : 0;
  if (itemCount === 0) return 0;

  const viewportSize = Math.max(0, finite(options.viewportSize));
  const offsetAt = resolveOffsetAt(options, itemCount);
  const totalSize = offsetAt(itemCount);

  const maxScroll = Math.max(0, totalSize - viewportSize);
  const current = clamp(finite(options.scrollOffset), 0, maxScroll);

  const index = clamp(Math.floor(finite(options.index)), 0, itemCount - 1);
  const start = offsetAt(index);
  const end = offsetAt(index + 1);

  return clamp(alignedOffset(options.align ?? 'auto', start, end, viewportSize, current), 0, maxScroll);
}
