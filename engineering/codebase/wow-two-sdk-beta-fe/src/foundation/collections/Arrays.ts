// Arrays — the immutable list operations every list-shaped surface re-derives: dedupe, group, split,
// reorder, and the four positional edits (insert / remove / replace / toggle).
//
// WHY A SLICE AND NOT A DEPENDENCY. `lodash` / `remeda` cover most of this, but the SDK ships as a
// peer-light package: one utility import must not pull a second collection library into every product
// bundle. Each function here is a handful of lines and the behaviour is pinned by one test file.
//
// EVERY FUNCTION RETURNS A NEW ARRAY — including the no-op cases (`move(items, 2, 2)`,
// `removeAt(items, 99)`). A conditional identity return is the classic reactivity footgun: a caller relying on
// referential change to re-render would silently stop updating for exactly the inputs that look harmless.
// The copy is O(n) and n here is a rendered list. (`selection`'s `applySort` deliberately makes the other
// choice — it returns the input for an empty descriptor list — because an unsorted render is its hot path.)
//
// POSITIONAL EDITS CLAMP, THEY DO NOT THROW. Drag-and-drop, keyboard reorder, and server-echoed indices
// all produce out-of-range values under normal operation; a thrown `RangeError` in a render path turns a
// cosmetic bug into a blank screen. `chunk` and `range` are the exceptions and DO throw, because a zero or
// negative step is a programmer error with no sane fallback — and would loop forever.

import { Equality, type EqualityComparer } from './Equality';

/**
 * Removes duplicates, keeping the FIRST occurrence of each key and the input's order.
 *
 * Without `keyFn` the item itself is the key, compared with `Set` semantics (SameValueZero — so `NaN`
 * de-duplicates against `NaN`, and `+0` against `-0`). With `keyFn`, the extracted key decides, which is
 * how you de-duplicate rows by `id` while keeping the first-seen row object.
 *
 * @param items The source list; never mutated.
 * @param keyFn Optional key extractor receiving the item and its index.
 * @returns A new array holding the first item per distinct key.
 */
export function unique<T, TKey = T>(items: ReadonlyArray<T>, keyFn?: (item: T, index: number) => TKey): T[] {
  const seen = new Set<TKey | T>();
  const result: T[] = [];
  items.forEach((item, index) => {
    const key = keyFn ? keyFn(item, index) : item;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

/**
 * Buckets items by an extracted key into a `Map`.
 *
 * A `Map` rather than a plain object for two reasons: keys stay their real type (a numeric or object key
 * is not stringified), and iteration order is the order keys were FIRST seen — a plain object reorders
 * integer-like keys ahead of string ones, which silently rearranges rendered group headings.
 *
 * @param items The source list; never mutated.
 * @param keyFn Extracts the group key from an item and its index.
 * @returns A new `Map` of key to a new array of that key's items, both in first-seen order.
 */
export function groupBy<T, TKey>(items: ReadonlyArray<T>, keyFn: (item: T, index: number) => TKey): Map<TKey, T[]> {
  const groups = new Map<TKey, T[]>();
  items.forEach((item, index) => {
    const key = keyFn(item, index);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  });
  return groups;
}

/**
 * Splits a list in two by a predicate, in one pass, preserving order in both halves.
 *
 * @param items The source list; never mutated.
 * @param predicate Decides whether an item belongs to the first half.
 * @returns A `[matched, rest]` tuple of two new arrays.
 */
export function partition<T>(items: ReadonlyArray<T>, predicate: (item: T, index: number) => boolean): [T[], T[]] {
  const matched: T[] = [];
  const rest: T[] = [];
  items.forEach((item, index) => {
    (predicate(item, index) ? matched : rest).push(item);
  });
  return [matched, rest];
}

/**
 * Slices a list into consecutive groups of at most `size`. The final group is short when the length is
 * not a multiple of `size`.
 *
 * @param items The source list; never mutated.
 * @param size The maximum group length; must be a positive integer.
 * @returns A new array of new arrays. An empty input yields `[]`, never `[[]]`.
 * @throws {RangeError} When `size` is not a positive integer — a zero or negative size has no meaningful
 * result and would loop forever.
 */
export function chunk<T>(items: ReadonlyArray<T>, size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`chunk: size must be a positive integer, received ${String(size)}`);
  }
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

/**
 * Reorders one item, using drag-and-drop semantics: the item is REMOVED first, then re-inserted at `to`
 * measured in the shortened list. This is the behaviour a pointer drag implies — dropping item 0 onto
 * slot 2 of `[a, b, c, d]` yields `[b, c, a, d]`, i.e. the dragged item lands where the cursor is, not one
 * slot past it. Pairs with `foundation/gestures`' `useDrag`.
 *
 * Both indices are truncated and clamped into range, so an over-drag past either end parks the item at
 * that end instead of throwing or dropping it.
 *
 * @param items The source list; never mutated.
 * @param from The index of the item to move.
 * @param to The index it should occupy afterwards.
 * @returns A new array with the item relocated; a new copy when `from` and `to` resolve to the same slot.
 */
export function move<T>(items: ReadonlyArray<T>, from: number, to: number): T[] {
  const result = [...items];
  if (result.length === 0) return result;
  const lastIndex = result.length - 1;
  const fromIndex = Math.min(Math.max(Math.trunc(from), 0), lastIndex);
  const toIndex = Math.min(Math.max(Math.trunc(to), 0), lastIndex);
  if (fromIndex === toIndex) return result;
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved as T);
  return result;
}

/**
 * Inserts one value at an index. The index is clamped to `[0, length]`, so `length` appends and a
 * negative index prepends.
 *
 * @param items The source list; never mutated.
 * @param index Where the new value should land.
 * @param value The value to insert.
 * @returns A new array one longer than the input.
 */
export function insertAt<T>(items: ReadonlyArray<T>, index: number, value: T): T[] {
  const result = [...items];
  const at = Math.min(Math.max(Math.trunc(index), 0), result.length);
  result.splice(at, 0, value);
  return result;
}

/**
 * Removes the item at an index. An out-of-range index removes nothing and still returns a fresh copy.
 *
 * @param items The source list; never mutated.
 * @param index The index to drop.
 * @returns A new array, one shorter when the index was in range.
 */
export function removeAt<T>(items: ReadonlyArray<T>, index: number): T[] {
  const result = [...items];
  const at = Math.trunc(index);
  if (!Number.isFinite(at) || at < 0 || at >= result.length) return result;
  result.splice(at, 1);
  return result;
}

/**
 * Replaces the item at an index. An out-of-range index replaces nothing and still returns a fresh copy —
 * it never grows the array or punches an `undefined` hole in it.
 *
 * @param items The source list; never mutated.
 * @param index The index to overwrite.
 * @param value The replacement value.
 * @returns A new array of the same length as the input.
 */
export function replaceAt<T>(items: ReadonlyArray<T>, index: number, value: T): T[] {
  const result = [...items];
  const at = Math.trunc(index);
  if (!Number.isFinite(at) || at < 0 || at >= result.length) return result;
  result[at] = value;
  return result;
}

/**
 * Adds an item when absent, removes it when present — the checkbox/chip/multi-select primitive.
 *
 * Equality defaults to `foundation/collections`' `Equality.strictEquals` (`Object.is`), which is reference
 * equality for objects; pass `Equality.byKey((row) => row.id)` (or any comparer) when the toggled value is
 * a fresh object each render. EVERY match is removed, so a list that already held duplicates toggles all of
 * them off at once. An added item is appended at the end.
 *
 * @param items The source list; never mutated.
 * @param item The value to toggle.
 * @param equalsFn Decides whether a list entry IS the toggled item.
 * @returns A new array with the item removed or appended.
 */
export function toggleItem<T>(
  items: ReadonlyArray<T>,
  item: T,
  equalsFn: EqualityComparer<T> = Equality.strictEquals,
): T[] {
  const remaining = items.filter((candidate) => !equalsFn(candidate, item));
  return remaining.length === items.length ? [...items, item] : remaining;
}

/**
 * Pairs two lists positionally, stopping at the SHORTER one — the extra tail is dropped rather than
 * padded with `undefined`, so the result type has no holes to narrow away at every call site.
 *
 * @param first The list supplying each pair's first slot.
 * @param second The list supplying each pair's second slot.
 * @returns A new array of `[first, second]` tuples, `min(first.length, second.length)` long.
 */
export function zip<TFirst, TSecond>(
  first: ReadonlyArray<TFirst>,
  second: ReadonlyArray<TSecond>,
): Array<[TFirst, TSecond]> {
  const length = Math.min(first.length, second.length);
  const result: Array<[TFirst, TSecond]> = [];
  for (let index = 0; index < length; index += 1) {
    result.push([first[index] as TFirst, second[index] as TSecond]);
  }
  return result;
}

/**
 * Splits a list of pairs back into two lists — the inverse of {@link zip}.
 *
 * @param pairs The tuples to split.
 * @returns A `[firsts, seconds]` tuple of two new arrays, each as long as `pairs`.
 */
export function unzip<TFirst, TSecond>(pairs: readonly (readonly [TFirst, TSecond])[]): [TFirst[], TSecond[]] {
  const first: TFirst[] = [];
  const second: TSecond[] = [];
  for (const pair of pairs) {
    first.push(pair[0]);
    second.push(pair[1]);
  }
  return [first, second];
}

/**
 * Builds a numeric sequence over the HALF-OPEN interval `[start, end)` — `end` is excluded, so
 * `range(0, items.length)` indexes a list exactly and `range(a, b).length === b - a`.
 *
 * A negative `step` counts down. When the step points away from `end` (`range(0, 5, -1)`) the result is
 * empty rather than infinite.
 *
 * @param start The first value, always included when the range is non-empty.
 * @param end The exclusive bound.
 * @param step The increment; defaults to `1`.
 * @returns A new array of numbers.
 * @throws {RangeError} When `step` is zero or any argument is non-finite — each would loop forever.
 */
export function range(start: number, end: number, step = 1): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new RangeError(`range: start and end must be finite, received ${String(start)}..${String(end)}`);
  }
  if (step === 0 || !Number.isFinite(step)) {
    throw new RangeError(`range: step must be a non-zero finite number, received ${String(step)}`);
  }
  const result: number[] = [];
  for (let value = start; step > 0 ? value < end : value > end;) {
    result.push(value);
    const next = value + step;
    if (next === value) throw new RangeError('range: step cannot advance at this magnitude.');
    value = next;
  }
  return result;
}
