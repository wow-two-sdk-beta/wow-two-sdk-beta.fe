/* Provides reusable equality comparers for selection components and diff checks. */

import { ExactNumber } from '../numbers';

/** Represents a function that decides whether two values are equal. */
export type EqualityComparer<T> = (a: T, b: T) => boolean;

/** Contains the standard equality comparers. */
export const Equality = {
  /** Checks NaN-safe strict equality (Object.is) — fits primitives + reference equality for objects. */
  strictEquals: <T>(a: T, b: T): boolean => Object.is(a, b),

  /** Checks plain `===` equality (NaN !== NaN). */
  referenceEquals: <T>(a: T, b: T): boolean => a === b,

  /** Provides a comparer that compares two objects by an extracted scalar key. */
  byKey:
    <T, K = unknown>(extract: (item: T) => K): EqualityComparer<T> =>
    (a, b) =>
      Object.is(extract(a), extract(b)),

  /** Checks shallow object equality — equal iff every key has identical (Object.is) value. */
  shallowEquals: <T extends Record<string, unknown>>(a: T, b: T): boolean => {
    if (Object.is(a, b)) return true;
    if (a == null || b == null) return false;
    if (ExactNumber.isExactNumber(a) || ExactNumber.isExactNumber(b)) {
      if (!ExactNumber.isExactNumber(a) || !ExactNumber.isExactNumber(b)) return false;
      const equal = a.equals(b);
      return equal.ok && equal.value;
    }
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => Object.prototype.hasOwnProperty.call(b, k) && Object.is(a[k], b[k]));
  },
} as const;
