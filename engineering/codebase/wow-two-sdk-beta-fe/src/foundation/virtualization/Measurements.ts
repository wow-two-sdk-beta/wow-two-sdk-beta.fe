// The item-geometry model the windowing math runs on: a prefix-sum array of cumulative start offsets, plus the
// binary search that turns a scroll offset back into an item index.
//
// WHY A PREFIX SUM AND NOT AN ARRAY OF SIZES — this is the whole reason the file exists. A virtual list answers
// exactly one question on every scroll frame: "which item is at pixel X?". Held as per-item sizes that question
// is a running total, i.e. a linear scan: O(n) per frame, and at 100k rows it is precisely the cost
// virtualization was introduced to remove. Held as CUMULATIVE offsets the array is sorted by construction, so
// the same question is a binary search over it: O(log n) — ~17 comparisons at 100k items, and flat as the list
// grows. Every read below is written against that invariant; nothing here may scan.
//
// LAYOUT: `offsets` has length `count + 1`. `offsets[i]` is item `i`'s start edge, and the extra tail entry
// `offsets[count]` is the total size. That tail is not padding — it is what makes `size(i)` = `offsets[i + 1] -
// offsets[i]` and `paddingEnd` = `total - offsets[endIndex + 1]` index-safe with no special case for the last
// item, which is where off-by-one bugs in this kind of code normally live.
//
// IMMUTABILITY: every update returns a NEW `Measurements`, and returns the SAME object when nothing actually
// changed. Consumers key work off that identity, and the no-op case is what stops a
// measure -> render -> measure feedback loop from spinning.
//
// KNOWN COST: `withMeasuredSize` shifts every later offset, so recording one measured size is O(n). That is a
// deliberate trade — measurements are rare (an item resizes) while searches are per-frame, so the cheap side is
// the one that had to be O(log n). A Fenwick/BIT would make updates O(log n) too; it is the documented upgrade
// path if a list ever re-measures thousands of rows per frame.

/** A non-finite or negative size would break the array's monotonicity, so it is floored to 0 at the boundary. */
function normalizeSize(size: number): number {
  return Number.isFinite(size) && size > 0 ? size : 0;
}

/** Cumulative item geometry for a list of a known length. Treat as immutable — build a new one to change it. */
export interface Measurements {
  /**
   * Cumulative start offsets, length `count + 1` and non-decreasing. `offsets[i]` is item `i`'s start edge;
   * `offsets[count]` is the list's total size.
   */
  readonly offsets: ReadonlyArray<number>;

  /** The number of items described. Always a non-negative integer. */
  readonly count: number;
}

/** The zero-item measurements — a shared, identity-stable empty value. */
export const EmptyMeasurements: Measurements = { offsets: [0], count: 0 };

/**
 * Builds cumulative offsets by running `sizeAt` once per item. O(n), and the only O(n) pass in a steady-state
 * list: it runs on mount and when `count` changes, never per scroll frame.
 *
 * @param count How many items the list has. Non-integer or negative values are floored to a safe count.
 * @param sizeAt Size of the item at an index — a real measurement if one exists, otherwise an estimate.
 * @returns Measurements whose `offsets` are non-decreasing and whose tail entry is the total size.
 */
export function buildMeasurements(count: number, sizeAt: (index: number) => number): Measurements {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (safeCount === 0) return EmptyMeasurements;

  const offsets = new Array<number>(safeCount + 1);
  offsets[0] = 0;
  let running = 0;
  for (let index = 0; index < safeCount; index += 1) {
    running += normalizeSize(sizeAt(index));
    offsets[index + 1] = running;
  }
  return { offsets, count: safeCount };
}

/**
 * The start edge of the item at `index`. Reading `count` returns the total size (the tail entry); indices
 * outside `[0, count]` clamp rather than throw, so a stale index from a shrinking list degrades quietly.
 *
 * @param measurements The geometry to read.
 * @param index The item index, or `count` for the list's end edge.
 * @returns The cumulative offset in pixels.
 */
export function itemOffset(measurements: Measurements, index: number): number {
  const clamped = Math.min(Math.max(Math.floor(index), 0), measurements.count);
  // `offsets` always holds `count + 1` entries and `clamped` is inside that range, so the `?? 0` only exists to
  // satisfy `noUncheckedIndexedAccess` — it cannot mask a real out-of-bounds read.
  return measurements.offsets[clamped] ?? 0;
}

/**
 * The size of the item at `index`, derived from its own start edge and the next one.
 *
 * @param measurements The geometry to read.
 * @param index The item index.
 * @returns The item's size in pixels, or 0 when the index is out of range.
 */
export function itemSize(measurements: Measurements, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= measurements.count) return 0;
  return itemOffset(measurements, index + 1) - itemOffset(measurements, index);
}

/**
 * The list's total size — the tail entry of the prefix sum.
 *
 * @param measurements The geometry to read.
 * @returns The summed size of every item in pixels.
 */
export function measurementsTotalSize(measurements: Measurements): number {
  return itemOffset(measurements, measurements.count);
}

/**
 * Binary-searches a non-decreasing offset accessor for the last index whose start edge is at or before `offset`
 * — i.e. the item occupying that pixel. The accessor form (rather than an array) lets the fixed-size path search
 * a computed `index * itemSize` without materializing anything.
 *
 * Zero-size items share a start edge; the search resolves such a tie to the LAST of them, which keeps it
 * consistent with the fixed-size arithmetic path in `Windowing`.
 *
 * @param offsetAt Non-decreasing accessor returning the start edge of an index.
 * @param count How many items are searchable (indices `0 .. count - 1`).
 * @param offset The pixel offset to locate. Negative values are treated as 0.
 * @returns The item index at that offset, or `-1` when there are no items.
 */
export function findIndexByOffsetAccessor(offsetAt: (index: number) => number, count: number, offset: number): number {
  if (count <= 0) return -1;
  const target = Number.isFinite(offset) ? Math.max(0, offset) : 0;

  let low = 0;
  let high = count - 1;
  // Item 0 starts at 0 and `target >= 0`, so index 0 always satisfies the predicate — the seed is never wrong.
  let best = 0;
  while (low <= high) {
    const mid = Math.floor(low + (high - low) / 2);
    if (offsetAt(mid) <= target) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

/**
 * Locates the item occupying `offset` in O(log n).
 *
 * @param measurements The geometry to search.
 * @param offset The pixel offset to locate. Negative values are treated as 0.
 * @returns The item index at that offset, or `-1` for an empty list.
 */
export function findIndexAtOffset(measurements: Measurements, offset: number): number {
  return findIndexByOffsetAccessor((index) => itemOffset(measurements, index), measurements.count, offset);
}

/**
 * Records a real measured size for one item, shifting every later offset by the difference.
 *
 * Returns the SAME object when the size is unchanged or the index is out of range — consumers rely on that
 * identity to skip work, and it is what breaks the measure -> render -> measure cycle.
 *
 * @param measurements The geometry to update.
 * @param index The item that was measured.
 * @param size Its real size in pixels. Non-finite or negative values are floored to 0.
 * @returns New measurements, or the original when nothing changed.
 */
export function withMeasuredSize(measurements: Measurements, index: number, size: number): Measurements {
  if (!Number.isInteger(index) || index < 0 || index >= measurements.count) return measurements;

  const next = normalizeSize(size);
  const delta = next - itemSize(measurements, index);
  if (delta === 0) return measurements;

  const offsets = measurements.offsets.slice();
  for (let cursor = index + 1; cursor <= measurements.count; cursor += 1) {
    offsets[cursor] = (offsets[cursor] ?? 0) + delta;
  }
  return { offsets, count: measurements.count };
}
