// Records — the keyed-collection half of the slice: turning a list into a lookup, and reshaping the
// lookup without mutating it.
//
// MAP FOR DERIVED LOOKUPS, RECORD FOR DECLARED SHAPES. `keyBy` returns a `Map` because the key comes from
// the data at runtime and may be any type — a plain object would stringify a numeric id and reorder
// integer-like keys ahead of string ones. `pickKeys` / `omitKeys` / `invertRecord` take records because
// their keys are part of the caller's declared type, and the return type is derived from it (`Pick` /
// `Omit`), which is the whole reason to prefer them over hand-written destructuring.
//
// `mapValues` straddles the two on purpose: it is overloaded so `groupBy(...)` → `mapValues(groups, (rows)
// => rows.length)` keeps its `Map`, while a config record stays a record. One name, because the intent is
// identical and a caller should not have to remember which container they are holding.
//
// STRING KEYS ONLY on the record helpers. They walk `Object.keys`, so own enumerable STRING keys are
// visited: symbol keys are skipped, and a numeric key comes back as its string form (JavaScript's rule,
// not this slice's). Prototype-inherited properties are never copied.

/**
 * Indexes a list by an extracted key. The LAST item wins on a duplicate key, matching the "latest write
 * of this id" reading a lookup usually wants — use {@link groupBy} instead when duplicates are meaningful.
 *
 * @param items The source list; never mutated.
 * @param keyFn Extracts an item's key from the item and its index.
 * @returns A new `Map` in first-seen key order.
 * @see groupBy — the same shape when a key can legitimately hold several items.
 */
export function keyBy<T, TKey>(items: ReadonlyArray<T>, keyFn: (item: T, index: number) => TKey): Map<TKey, T> {
  const result = new Map<TKey, T>();
  items.forEach((item, index) => {
    result.set(keyFn(item, index), item);
  });
  return result;
}

/**
 * Transforms every value, keeping the keys and their order. Overloaded on the container: a `Map` in gives
 * a `Map` out, a record in gives a record out.
 *
 * @param source The `Map` whose values should be transformed; never mutated.
 * @param mapFn Produces the replacement value from the current value and its key.
 * @returns A new `Map` with the same keys in the same order.
 */
export function mapValues<TKey, TValue, TResult>(
  source: ReadonlyMap<TKey, TValue>,
  mapFn: (value: TValue, key: TKey) => TResult,
): Map<TKey, TResult>;
/**
 * Transforms every value, keeping the keys and their order.
 *
 * @param source The record whose values should be transformed; never mutated.
 * @param mapFn Produces the replacement value from the current value and its key.
 * @returns A new record with the same own enumerable string keys.
 */
export function mapValues<TKey extends PropertyKey, TValue, TResult>(
  source: Readonly<Record<TKey, TValue>>,
  mapFn: (value: TValue, key: TKey) => TResult,
): Record<TKey, TResult>;
export function mapValues(
  source: ReadonlyMap<unknown, unknown> | object,
  mapFn: (value: never, key: never) => unknown,
): Map<unknown, unknown> | Record<string, unknown> {
  if (source instanceof Map) {
    const mapped = new Map<unknown, unknown>();
    for (const [key, value] of source.entries()) {
      mapped.set(key, mapFn(value as never, key as never));
    }
    return mapped;
  }
  const record = source as Record<string, unknown>;
  const mapped: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    defineEntry(mapped, key, mapFn(record[key] as never, key as never));
  }
  return mapped;
}

/**
 * Copies only the named keys into a new object.
 *
 * A key the source does not actually own is SKIPPED rather than copied as `undefined` — otherwise
 * `pickKeys(partial, ['a', 'b'])` would fabricate a `b` property that fails a `'b' in result` check and
 * serialises as an explicit null in a request body.
 *
 * @param source The object to read from; never mutated.
 * @param keys The keys to keep.
 * @returns A new object holding only the present named keys.
 */
export function pickKeys<T extends object, TKey extends keyof T>(source: T, keys: ReadonlyArray<TKey>): Pick<T, TKey> {
  const result = {} as Pick<T, TKey>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) defineEntry(result, key, source[key]);
  }
  return result;
}

/**
 * Copies every own enumerable string key EXCEPT the named ones into a new object — the immutable spelling
 * of `delete`, and the typed one (the result type loses the removed keys).
 *
 * @param source The object to read from; never mutated.
 * @param keys The keys to drop.
 * @returns A new object without the named keys.
 */
export function omitKeys<T extends object, TKey extends keyof T>(source: T, keys: ReadonlyArray<TKey>): Omit<T, TKey> {
  const omitted = new Set<PropertyKey>(keys.map((key) => (typeof key === 'number' ? String(key) : key)));
  const record = source as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (!omitted.has(key)) defineEntry(result, key, record[key]);
  }
  return result as Omit<T, TKey>;
}

/**
 * Collects key/value pairs into a record. Accepts any iterable, so a `Map`, a `URLSearchParams`, or the
 * output of {@link recordToEntries} all feed it directly. The LAST pair wins on a duplicate key.
 *
 * @param entries The pairs to collect.
 * @returns A new record.
 */
export function entriesToRecord<TKey extends PropertyKey, TValue>(
  entries: Iterable<readonly [TKey, TValue]>,
): Record<TKey, TValue> {
  const result = {} as Record<TKey, TValue>;
  for (const [key, value] of entries) defineEntry(result, key, value);
  return result;
}

/**
 * Lists a record's own enumerable string keys with their values, in `Object.keys` order — the typed
 * counterpart to `Object.entries`, which widens every key to `string`.
 *
 * @param record The record to read; never mutated.
 * @returns A new array of `[key, value]` tuples.
 */
export function recordToEntries<TKey extends PropertyKey, TValue>(
  record: Readonly<Record<TKey, TValue>>,
): Array<[TKey, TValue]> {
  const keys = Object.keys(record) as Array<TKey & string>;
  return keys.map((key) => [key, record[key]]);
}

/**
 * Swaps keys and values. The LAST key wins when two keys share a value, so inverting a non-injective
 * record is lossy by design — the alternative (an array of keys per value) is {@link groupBy}'s job.
 *
 * @param record The record to invert; never mutated.
 * @returns A new record mapping each value back to a key.
 */
export function invertRecord<TKey extends PropertyKey, TValue extends PropertyKey>(
  record: Readonly<Record<TKey, TValue>>,
): Record<TValue, TKey> {
  const result = {} as Record<TValue, TKey>;
  for (const [key, value] of recordToEntries(record)) defineEntry(result, value, key);
  return result;
}

/** Defines data without invoking Object.prototype's legacy __proto__ setter. */
function defineEntry(target: object, key: PropertyKey, value: unknown): void {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
}
