// Filter — predicate composition over a small, CLOSED operator set. Seven operators, no `or`, no nesting,
// no expression tree: this is deliberately not a query language. A filter bar, a column filter menu, and a
// faceted sidebar all reduce to "field, operator, value, AND-ed together", and every product that has
// needed more has needed a *server* query, not a richer client model. Growing this into a DSL would put a
// second, weaker query engine in the client and invite it to drift from the backend's.
//
// Operator semantics, all of which are choices rather than derivations:
//   - `equals`      — no cross-type coercion; `'2'` does not equal `2`. Strings compare case-folded.
//   - `contains`    — substring of the value's text form.
//   - `startsWith`  — prefix of the value's text form.
//   - `gt` / `lt`   — strict, via the sort model's `compareValues` (numbers, dates, Temporal, text).
//   - `between`     — INCLUSIVE on both bounds; reversed bounds are normalised rather than matching nothing.
//   - `in`          — membership, entry-wise `equals`.
//
// Text operators are CASE-INSENSITIVE by default (`isCaseSensitive: true` opts out) because a filter box is
// a human typing, not a key lookup.
//
// Case folding here uses `toLocaleLowerCase`, not the collator that `Sort` uses. That split is intentional:
// `contains`/`startsWith` need substring semantics, which a collator cannot express, and having `equals`
// silently follow collator rules would make `'2'` match `'02'` under numeric collation. Ordering is a
// collator's job; matching is not.
//
// An absent field value (`null` / `undefined` / `NaN`) matches ONLY a nullish `equals` (or an `in` list
// containing one). Every other operator rejects it — there is no ordering or substring of an absence.

import { ExactNumber } from '../../numbers';
import { Temporal } from 'temporal-polyfill';

import { isNullish, readField, toText, type FieldAccessors, type LocaleOptions } from './Field';
import { compareValues } from './Sort';

/** Defines the closed set of comparisons a filter may express. */
export const FilterOperator = {
  /** Refers to exact equality — case-folded for strings, no cross-type coercion. */
  Equals: 'equals',
  /** Refers to a substring match on the value's text form. */
  Contains: 'contains',
  /** Refers to a prefix match on the value's text form. */
  StartsWith: 'startsWith',
  /** Refers to a strictly-greater-than comparison. */
  GreaterThan: 'gt',
  /** Refers to a strictly-less-than comparison. */
  LessThan: 'lt',
  /** Refers to an inclusive range check between two bounds. */
  Between: 'between',
  /** Refers to membership in a fixed list of values. */
  In: 'in',
} as const;

export type FilterOperator = (typeof FilterOperator)[keyof typeof FilterOperator];

/** The fields every filter carries, whatever its operator. */
interface FilterBase<TField extends string> {
  /** The field name, resolved through the accessor registry or read as a plain property. */
  readonly field: TField;
  /** The case sensitivity of string comparison. Defaults to `false` — text operators fold case. */
  readonly isCaseSensitive?: boolean;
}

/** Represents a filter whose operator takes a single comparison value. */
export interface ValueFilter<TField extends string = string> extends FilterBase<TField> {
  /** The comparison applied to the field. */
  readonly op: 'equals' | 'contains' | 'startsWith' | 'gt' | 'lt';
  /** The value compared against the field. */
  readonly value: unknown;
}

/** Represents an inclusive range filter. Bounds may be given in either order. */
export interface BetweenFilter<TField extends string = string> extends FilterBase<TField> {
  /** The comparison applied to the field. */
  readonly op: 'between';
  /** The inclusive `[low, high]` bounds — normalised when reversed. */
  readonly value: readonly [unknown, unknown];
}

/** Represents a membership filter over a fixed candidate list. */
export interface InFilter<TField extends string = string> extends FilterBase<TField> {
  /** The comparison applied to the field. */
  readonly op: 'in';
  /** The candidate values; the field matches when it equals any of them. */
  readonly value: ReadonlyArray<unknown>;
}

/**
 * Represents one filter clause. A discriminated union rather than `{ field, op, value: unknown }` so the
 * value shape each operator requires — a 2-tuple for `between`, an array for `in` — is checked at the call
 * site instead of failing at match time.
 */
export type FilterDescriptor<TField extends string = string> =
  ValueFilter<TField> | BetweenFilter<TField> | InFilter<TField>;

/** Reports whether a value is a date-like instance, which compares by value rather than identity. */
function isDateLike(value: unknown): boolean {
  return (
    value instanceof Date ||
    value instanceof Temporal.PlainDate ||
    value instanceof Temporal.PlainTime ||
    value instanceof Temporal.PlainDateTime ||
    value instanceof Temporal.ZonedDateTime ||
    value instanceof Temporal.Instant
  );
}

/** Folds a value to its comparable text form, lower-casing unless the filter asked for case sensitivity. */
function foldText(value: unknown, isCaseSensitive: boolean, locale?: string): string {
  const text = toText(value);
  return isCaseSensitive ? text : text.toLocaleLowerCase(locale);
}

/** The equality behind `equals` and `in` — case-folded for strings, by value for dates, else identity. */
function valuesEqual(a: unknown, b: unknown, isCaseSensitive: boolean, locale: string | undefined): boolean {
  if (isNullish(a) || isNullish(b)) return isNullish(a) && isNullish(b);
  if (typeof a === 'string' && typeof b === 'string') {
    return foldText(a, isCaseSensitive, locale) === foldText(b, isCaseSensitive, locale);
  }
  if (Object.is(a, b)) return true;
  if (ExactNumber.isExactNumber(a) && ExactNumber.isExactNumber(b)) return compareValues(a, b, { locale }) === 0;
  if (isDateLike(a) && isDateLike(b)) return compareValues(a, b, { locale }) === 0;
  return false;
}

/**
 * Reports whether one item satisfies one filter clause. Exported for the surfaces that test a single row —
 * an optimistic insert deciding whether the new row belongs in the current view, for instance.
 */
export function matchesFilter<T, TField extends string = string>(
  item: T,
  filter: FilterDescriptor<TField>,
  accessors?: FieldAccessors<T, TField>,
  options: LocaleOptions = {},
): boolean {
  const locale = options.locale;
  const isCaseSensitive = filter.isCaseSensitive ?? false;
  const fieldValue = readField(item, filter.field, accessors);

  switch (filter.op) {
    case FilterOperator.Equals:
      return valuesEqual(fieldValue, filter.value, isCaseSensitive, locale);

    case FilterOperator.In:
      return filter.value.some((candidate) => valuesEqual(fieldValue, candidate, isCaseSensitive, locale));

    case FilterOperator.Contains: {
      if (isNullish(fieldValue) || isNullish(filter.value)) return false;
      return foldText(fieldValue, isCaseSensitive, locale).includes(foldText(filter.value, isCaseSensitive, locale));
    }

    case FilterOperator.StartsWith: {
      if (isNullish(fieldValue) || isNullish(filter.value)) return false;
      return foldText(fieldValue, isCaseSensitive, locale).startsWith(foldText(filter.value, isCaseSensitive, locale));
    }

    case FilterOperator.GreaterThan: {
      if (isNullish(fieldValue) || isNullish(filter.value)) return false;
      return compareValues(fieldValue, filter.value, { locale }) > 0;
    }

    case FilterOperator.LessThan: {
      if (isNullish(fieldValue) || isNullish(filter.value)) return false;
      return compareValues(fieldValue, filter.value, { locale }) < 0;
    }

    case FilterOperator.Between: {
      const [first, second] = filter.value;
      if (isNullish(fieldValue) || isNullish(first) || isNullish(second)) return false;
      // Normalise reversed bounds: a two-ended range input can be filled in either order, and silently
      // matching nothing reads as a broken filter rather than a swapped one.
      const isReversed = compareValues(first, second, { locale }) > 0;
      const low = isReversed ? second : first;
      const high = isReversed ? first : second;
      return compareValues(fieldValue, low, { locale }) >= 0 && compareValues(fieldValue, high, { locale }) <= 0;
    }
  }

  return false;
}

/**
 * Builds the AND-ed predicate a filter list describes — exported so a virtualised or streaming surface can
 * test rows as they arrive instead of materialising a filtered array.
 */
export function filterPredicate<T, TField extends string = string>(
  filters: ReadonlyArray<FilterDescriptor<TField>>,
  accessors?: FieldAccessors<T, TField>,
  options: LocaleOptions = {},
): (item: T) => boolean {
  return (item) => filters.every((filter) => matchesFilter(item, filter, accessors, options));
}

/**
 * Keeps the items matching every filter. Clauses combine with AND — two clauses on the same field narrow
 * each other (the `between` of a `gt` and an `lt`), they do not union.
 *
 * Returns the input array itself when there is nothing to filter, so an unfiltered render costs no copy.
 */
export function applyFilters<T, TField extends string = string>(
  items: ReadonlyArray<T>,
  filters: ReadonlyArray<FilterDescriptor<TField>>,
  accessors?: FieldAccessors<T, TField>,
  options: LocaleOptions = {},
): ReadonlyArray<T> {
  if (filters.length === 0) return items;
  return items.filter(filterPredicate(filters, accessors, options));
}
