// Comparison — structural equality for memo boundaries: `v-memo`, `computed` guards, "is this form
// dirty", "did the server actually send something new".
//
// THREE FUNCTIONS, THREE COSTS, PICK DELIBERATELY. `arrayShallowEqual` is O(n) reference checks and is
// what a list-prop memo wants. `shallowEqual` is the same one level deep on either arrays or objects.
// `deepEqual` walks the whole structure — correct, and the one you must not put on a hot path over a large
// payload without meaning to.
//
// `shallowEqual` DELEGATES its plain-object case to `foundation/collections`' `Equality.shallowEquals` rather
// than re-deriving it; this file only adds the array dispatch and the deep walk, which that helper
// deliberately does not do.
//
// WHY A DEEP VARIANT LIVES HERE AT ALL. `forms-engine` already carries a local `deepEqual`, scoped to form
// values (primitives, plain objects, arrays, `Date`, `File`/`Blob`) and reachable only from that layer —
// `foundation` may not import upward. This one is the general one: it additionally handles `Map`, `Set`,
// `RegExp`, `ArrayBuffer` and typed arrays, and it terminates on circular structures.
//
// CIRCULARITY IS CO-INDUCTIVE. A pair already being compared higher in the stack is ASSUMED equal, so two
// structures that loop the same way compare equal instead of recursing forever — the standard rule, and
// the only one that terminates. The in-progress pair is dropped again when a comparison fails, because the
// `Map`/`Set` matchers below probe candidate pairs whose failure must not be remembered as a success.
//
// TYPED ARRAYS COMPARE BYTE-WISE (same constructor, same byte length, same bytes). One consequence worth
// knowing: `+0` and `-0` differ in bits, so they compare UNEQUAL inside a `Float64Array` while comparing
// equal as plain numbers. Bit-equality is the right reading for a buffer.

import { Equality } from './Equality';
import { ExactNumber } from '../numbers';

/**
 * Compares two arrays element-by-element with `Object.is` — no recursion, no allocation.
 *
 * The cheapest correct check for a list prop rebuilt each render from stable item references (a `.map()`
 * over cached rows, a `computed` dependency). `NaN` equals `NaN`; two structurally identical but distinct
 * objects do not.
 *
 * @param first The left array.
 * @param second The right array.
 * @returns `true` when both have the same length and every index holds the same value.
 */
export function arrayShallowEqual<T>(first: ReadonlyArray<T>, second: ReadonlyArray<T>): boolean {
  if (first === second) return true;
  if (first.length !== second.length) return false;
  for (let index = 0; index < first.length; index++) {
    if (!Object.is(first[index], second[index])) return false;
  }
  return true;
}

/**
 * Compares two values one level deep.
 *
 * Dispatches on shape: identical values short-circuit, two arrays go to {@link arrayShallowEqual}, two
 * objects compare their own enumerable keys with `Object.is`, and anything else (a primitive pair that was
 * not already identical, or a mismatched pair such as array vs object) is unequal.
 *
 * @param first The left value.
 * @param second The right value.
 * @returns `true` when the two are equal at one level of depth.
 */
export function shallowEqual(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) return true;
  if (first === null || second === null) return false;
  if (typeof first !== 'object' || typeof second !== 'object') return false;
  if (Array.isArray(first) || Array.isArray(second)) {
    return Array.isArray(first) && Array.isArray(second) && arrayShallowEqual(first, second);
  }
  return Equality.shallowEquals(first as Record<string, unknown>, second as Record<string, unknown>);
}

/**
 * Compares two values structurally, all the way down.
 *
 * Understands `Date` (by timestamp), `RegExp` (source + flags), `Array`, `Map`, `Set`, `ArrayBuffer` and
 * every typed array / `DataView` (byte-wise), and plain objects (own enumerable string keys). `NaN` equals
 * `NaN`. Anything else falls back to `Object.is`: opaque objects and distinct class instances compare unequal.
 * Their internal state is not inspected.
 *
 * Terminates on circular structures: a pair already under comparison is treated as equal.
 *
 * @param first The left value.
 * @param second The right value.
 * @returns `true` when the two are structurally equal.
 */
export function deepEqual(first: unknown, second: unknown): boolean {
  return deepEqualWithin(first, second, new Map<object, Set<object>>());
}

/** Runs one comparison against the set of pairs already under comparison on this walk. */
function deepEqualWithin(first: unknown, second: unknown, seen: Map<object, Set<object>>): boolean {
  if (Object.is(first, second)) return true;
  if (first === null || second === null) return false;
  if (typeof first !== 'object' || typeof second !== 'object') return false;
  if (ExactNumber.isExactNumber(first) || ExactNumber.isExactNumber(second)) {
    return Equality.shallowEquals(first as Record<string, unknown>, second as Record<string, unknown>);
  }

  const partners = seen.get(first);
  if (partners?.has(second)) return true;
  if (partners) partners.add(second);
  else seen.set(first, new Set<object>([second]));

  try {
    return compareObjects(first, second, seen);
  } finally {
    // Track active assumptions only: a successful child may depend on a parent that later fails.
    seen.get(first)?.delete(second);
  }
}

/** Dispatches two non-null objects to the branch that matches their built-in type. */
function compareObjects(first: object, second: object, seen: Map<object, Set<object>>): boolean {
  if (first instanceof Date || second instanceof Date) {
    return first instanceof Date && second instanceof Date && Object.is(first.getTime(), second.getTime());
  }
  if (first instanceof RegExp || second instanceof RegExp) {
    return (
      first instanceof RegExp &&
      second instanceof RegExp &&
      first.source === second.source &&
      first.flags === second.flags
    );
  }
  if (ArrayBuffer.isView(first) || ArrayBuffer.isView(second)) {
    if (!ArrayBuffer.isView(first) || !ArrayBuffer.isView(second)) return false;
    if (first.constructor !== second.constructor) return false;
    return bytesEqual(
      new Uint8Array(first.buffer, first.byteOffset, first.byteLength),
      new Uint8Array(second.buffer, second.byteOffset, second.byteLength),
    );
  }
  if (first instanceof ArrayBuffer || second instanceof ArrayBuffer) {
    if (!(first instanceof ArrayBuffer) || !(second instanceof ArrayBuffer)) return false;
    return bytesEqual(new Uint8Array(first), new Uint8Array(second));
  }
  if (Array.isArray(first) || Array.isArray(second)) {
    if (!Array.isArray(first) || !Array.isArray(second)) return false;
    if (first.length !== second.length) return false;
    for (let index = 0; index < first.length; index++) {
      if (!deepEqualWithin(first[index], second[index], seen)) return false;
    }
    return true;
  }
  if (first instanceof Map || second instanceof Map) {
    if (!(first instanceof Map) || !(second instanceof Map)) return false;
    if (first.size !== second.size) return false;
    return mapsEqual(first, second, seen);
  }
  if (first instanceof Set || second instanceof Set) {
    if (!(first instanceof Set) || !(second instanceof Set)) return false;
    if (first.size !== second.size) return false;
    return setsEqual(first, second, seen);
  }

  const leftPrototype: unknown = Object.getPrototypeOf(first);
  const rightPrototype: unknown = Object.getPrototypeOf(second);
  if (
    (leftPrototype !== null && leftPrototype !== Object.prototype) ||
    (rightPrototype !== null && rightPrototype !== Object.prototype)
  )
    return false;
  const leftKeys = Object.keys(first);
  const rightKeys = Object.keys(second);
  if (leftKeys.length !== rightKeys.length) return false;
  const left = first as Record<string, unknown>;
  const right = second as Record<string, unknown>;
  return leftKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(second, key) && deepEqualWithin(left[key], right[key], seen),
  );
}

/** Compares two byte views of equal-or-different length. */
function bytesEqual(first: Uint8Array, second: Uint8Array): boolean {
  if (first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return false;
  }
  return true;
}

/**
 * Compares two equally-sized maps. Takes the direct route when every key of `first` is a key of `second`
 * (the string/number-key case, O(n)); otherwise falls back to matching each entry against an unclaimed
 * entry of `second`, which is the only correct answer when keys are themselves objects.
 */
function mapsEqual(
  first: ReadonlyMap<unknown, unknown>,
  second: ReadonlyMap<unknown, unknown>,
  seen: Map<object, Set<object>>,
): boolean {
  let hasEveryKey = true;
  for (const key of first.keys()) {
    if (!second.has(key)) {
      hasEveryKey = false;
      break;
    }
  }
  if (hasEveryKey) {
    for (const [key, value] of first) {
      if (!deepEqualWithin(value, second.get(key), seen)) return false;
    }
    return true;
  }

  const unclaimed = [...second.entries()];
  for (const [key, value] of first) {
    const index = unclaimed.findIndex(
      (entry) => deepEqualWithin(key, entry[0], seen) && deepEqualWithin(value, entry[1], seen),
    );
    if (index === -1) return false;
    unclaimed.splice(index, 1);
  }
  return true;
}

/**
 * Compares two equally-sized sets. Members present in both by identity are settled first and cost nothing;
 * only the structural leftovers are matched pairwise.
 */
function setsEqual(first: ReadonlySet<unknown>, second: ReadonlySet<unknown>, seen: Map<object, Set<object>>): boolean {
  const unmatched: unknown[] = [];
  for (const member of first) {
    if (!second.has(member)) unmatched.push(member);
  }
  if (unmatched.length === 0) return true;

  const candidates = [...second].filter((member) => !first.has(member));
  if (candidates.length !== unmatched.length) return false;
  for (const member of unmatched) {
    const index = candidates.findIndex((candidate) => deepEqualWithin(member, candidate, seen));
    if (index === -1) return false;
    candidates.splice(index, 1);
  }
  return true;
}
