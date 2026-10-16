// SetOps — the four set relations, expressed over ARRAYS rather than `Set`s.
//
// WHY ARRAYS IN AND ARRAYS OUT. A `Set` is the right internal index and the wrong public type here: `v-for`
// renders lists, `key` bindings need a stable order, and a `Set` has no index. Every caller that reached for
// `new Set([...a].filter(...))` had to spread it straight back to an array anyway, losing order on the way.
// These take arrays, index with a `Set` internally, and hand back arrays.
//
// ORDER IS DEFINED, NOT INCIDENTAL. Results follow the FIRST argument's order, then (for `union` and
// `symmetricDifference`) the second's. Set theory says these are unordered; a rendered list disagrees, and
// an undefined order would reshuffle rows on every recompute.
//
// SET SEMANTICS MEAN DE-DUPLICATION. All four collapse duplicates within the inputs — `union([a, a], [])`
// is `[a]`. Use `foundation/collections`' `Arrays` helpers when you want a bag, not a set.
//
// The optional `keyFn` is what makes these usable on entities: two fetches return equal-but-not-identical
// row objects, so `difference(next, previous, (row) => row.id)` is the real-world call, not the identity one.

/** Indexes a list by its comparison key — the shared internal step of every relation below. */
function toKeySet<T, TKey>(items: ReadonlyArray<T>, keyFn?: (item: T) => TKey): Set<TKey | T> {
  const keys = new Set<TKey | T>();
  for (const item of items) keys.add(keyFn ? keyFn(item) : item);
  return keys;
}

/**
 * Everything in either list, de-duplicated by key.
 *
 * Order is all of `first` followed by the members of `second` not already present. When two items share a
 * key, the one from `first` is the one kept — the left list wins, which is what an "apply these updates on
 * top of what I have" call expects.
 *
 * @param first The list whose items and order take precedence.
 * @param second The list contributing anything new.
 * @param keyFn Optional key extractor; defaults to the item itself (SameValueZero).
 * @returns A new array; neither input is mutated.
 */
export function union<T, TKey = T>(first: ReadonlyArray<T>, second: ReadonlyArray<T>, keyFn?: (item: T) => TKey): T[] {
  const seen = new Set<TKey | T>();
  const result: T[] = [];
  for (const item of first) {
    const key = keyFn ? keyFn(item) : item;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  for (const item of second) {
    const key = keyFn ? keyFn(item) : item;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * Only the items whose key appears in BOTH lists, de-duplicated, in `first`'s order and holding `first`'s
 * item instances.
 *
 * @param first The list supplying the result's items and order.
 * @param second The list acting as the membership test.
 * @param keyFn Optional key extractor; defaults to the item itself (SameValueZero).
 * @returns A new array; neither input is mutated.
 */
export function intersection<T, TKey = T>(
  first: ReadonlyArray<T>,
  second: ReadonlyArray<T>,
  keyFn?: (item: T) => TKey,
): T[] {
  const other = toKeySet(second, keyFn);
  const seen = new Set<TKey | T>();
  const result: T[] = [];
  for (const item of first) {
    const key = keyFn ? keyFn(item) : item;
    if (!other.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * The items of `first` whose key does NOT appear in `second`, de-duplicated, in `first`'s order.
 *
 * Asymmetric by definition: `difference(a, b)` answers "what did I gain", `difference(b, a)` answers "what
 * did I lose".
 *
 * @param first The list to subtract from.
 * @param second The list to subtract.
 * @param keyFn Optional key extractor; defaults to the item itself (SameValueZero).
 * @returns A new array; neither input is mutated.
 */
export function difference<T, TKey = T>(
  first: ReadonlyArray<T>,
  second: ReadonlyArray<T>,
  keyFn?: (item: T) => TKey,
): T[] {
  const other = toKeySet(second, keyFn);
  const seen = new Set<TKey | T>();
  const result: T[] = [];
  for (const item of first) {
    const key = keyFn ? keyFn(item) : item;
    if (other.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * Everything present in exactly one of the two lists — the "what changed" relation, `first`-only entries
 * followed by `second`-only entries.
 *
 * @param first The left list.
 * @param second The right list.
 * @param keyFn Optional key extractor; defaults to the item itself (SameValueZero).
 * @returns A new array; neither input is mutated.
 */
export function symmetricDifference<T, TKey = T>(
  first: ReadonlyArray<T>,
  second: ReadonlyArray<T>,
  keyFn?: (item: T) => TKey,
): T[] {
  return [...difference(first, second, keyFn), ...difference(second, first, keyFn)];
}
