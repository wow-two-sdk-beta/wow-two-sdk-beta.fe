// Sort — the canonical descriptor list + comparator behind every sortable surface. A list of
// `SortDescriptor`s rather than one `{ field, direction }` because multi-field sort is the same model with
// more entries: precedence IS array order, so a header click that appends a field reads the same as one
// that replaces it.
//
// Two rules are load-bearing and neither is guessable from the types, so they are stated here and tested:
//
//   1. NULLISH SORTS LAST IN BOTH DIRECTIONS. The direction flip is applied to the value comparison only,
//      never to the nullish check. A blank cell is an absence, not a smallest-value — flipping to `desc`
//      to see the biggest revenue must not float every revenue-less row to the top. (This is where the
//      model deliberately differs from the ad-hoc comparator in `presentation` DataTable, which negates
//      the whole result and therefore floats nullish to the top on `desc`.)
//   2. THE CYCLE IS `asc → desc → none`. A third click clears the field rather than returning to `asc`, so
//      "unsorted" stays reachable by clicking — otherwise a user who sorts a table can never get back to
//      the server's natural order.
//
// String comparison goes through `foundation/i18n`' `compareStrings` — the SDK's one cached, numeric-aware
// `Intl.Collator`. There is no second collator in this slice, deliberately: text ordering must not differ
// between a DataTable header and a headless `applySort` call.

import { ExactNumber } from '../../numbers';
import { Temporal } from 'temporal-polyfill';

import { compareStrings } from '../../i18n/Compare';
import { isNullish, readField, type FieldAccessors, type LocaleOptions } from './Field';

/** Defines the ordering applied to a sorted field. */
export const SortDirection = {
  /** Refers to ascending order — smallest/earliest/`false` first. */
  Asc: 'asc',
  /** Refers to descending order — largest/latest/`true` first. */
  Desc: 'desc',
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

/** Represents one field of an ordering. A list of these is the whole sort state; array order is precedence. */
export interface SortDescriptor<TField extends string = string> {
  /** The field name, resolved through the accessor registry or read as a plain property. */
  readonly field: TField;
  /** The direction applied to this field. */
  readonly direction: SortDirection;
}

/** Options accepted by {@link toggleSort}. */
export interface ToggleSortOptions {
  /**
   * The multi-field behaviour. `false` (default) keeps at most one sorted field — a click on a new field
   * replaces the ordering. `true` appends the new field after the existing ones, so precedence follows
   * click order (the shift-click-a-second-header behaviour).
   */
  isMulti?: boolean;
}

/**
 * Compares two non-nullish values with the SDK's default ordering, direction-agnostic (callers negate).
 * Handles, in order: numbers, bigints, booleans (`false` before `true`), the `Temporal` types, native
 * `Date`, strings, and finally anything else via its text form.
 *
 * Nullish handling is deliberately NOT here — {@link applySort} applies it outside the direction flip so
 * absent values sort last in both directions. Calling this with a nullish value falls through to the text
 * comparison, which is not the documented ordering.
 */
export function compareValues(a: unknown, b: unknown, options: LocaleOptions = {}): number {
  if (Object.is(a, b)) return 0;
  if (ExactNumber.isExactNumber(a) && ExactNumber.isExactNumber(b)) {
    const comparison = a.compare(b);
    if (comparison.ok) return comparison.value;
    throw new TypeError('Exact numeric values could not be compared');
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  if (a instanceof Temporal.PlainDate && b instanceof Temporal.PlainDate) return Temporal.PlainDate.compare(a, b);
  if (a instanceof Temporal.PlainTime && b instanceof Temporal.PlainTime) return Temporal.PlainTime.compare(a, b);
  if (a instanceof Temporal.PlainDateTime && b instanceof Temporal.PlainDateTime)
    return Temporal.PlainDateTime.compare(a, b);
  if (a instanceof Temporal.ZonedDateTime && b instanceof Temporal.ZonedDateTime)
    return Temporal.ZonedDateTime.compare(a, b);
  if (a instanceof Temporal.Instant && b instanceof Temporal.Instant) return Temporal.Instant.compare(a, b);
  // Native `Date` stays supported: a consumer's row data is arbitrary, and a `Date` in a column must not
  // silently degrade to a string comparison of its locale form.
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'string' && typeof b === 'string') return compareStrings(a, b, options.locale);
  return compareStrings(String(a), String(b), options.locale);
}

/** The direction currently applied to a field, or `null` when the field is unsorted. */
export function sortDirectionFor<TField extends string>(
  descriptors: ReadonlyArray<SortDescriptor<TField>>,
  field: TField,
): SortDirection | null {
  return descriptors.find((descriptor) => descriptor.field === field)?.direction ?? null;
}

/**
 * The 0-based precedence of a field in the ordering, or `-1` when unsorted — the number a multi-sort header
 * renders as its "1 / 2 / 3" badge (add one for display).
 */
export function sortIndexFor<TField extends string>(
  descriptors: ReadonlyArray<SortDescriptor<TField>>,
  field: TField,
): number {
  return descriptors.findIndex((descriptor) => descriptor.field === field);
}

/**
 * Advances one field through the `asc → desc → none` cycle and returns the next descriptor list.
 *
 * Single-field (default): the result is `[{ field, 'asc' }]`, `[{ field, 'desc' }]`, or `[]`. Clicking a
 * different field restarts that field's cycle at `asc` and drops the previous one.
 *
 * Multi-field (`{ isMulti: true }`): the field keeps its position while cycling `asc → desc`, and the third
 * click removes it, leaving the other fields' precedence intact. A field not yet in the list is appended.
 */
export function toggleSort<TField extends string>(
  descriptors: ReadonlyArray<SortDescriptor<TField>>,
  field: TField,
  options: ToggleSortOptions = {},
): ReadonlyArray<SortDescriptor<TField>> {
  const current = sortDirectionFor(descriptors, field);
  const isMulti = options.isMulti ?? false;

  if (!isMulti) {
    if (current === SortDirection.Asc) return [{ field, direction: SortDirection.Desc }];
    if (current === SortDirection.Desc) return [];
    return [{ field, direction: SortDirection.Asc }];
  }

  if (current === null) return [...descriptors, { field, direction: SortDirection.Asc }];
  if (current === SortDirection.Desc) {
    return descriptors.filter((descriptor) => descriptor.field !== field);
  }
  return descriptors.map((descriptor) =>
    descriptor.field === field ? { field, direction: SortDirection.Desc } : descriptor,
  );
}

/**
 * Builds the comparator an ordering describes — exported so a virtualised or server-side surface can feed
 * it to its own machinery instead of materialising a sorted array.
 *
 * Fields are consulted in array order and the first non-zero result wins. Within each field: absent values
 * (`null` / `undefined` / `NaN`) sort last regardless of direction, then {@link compareValues} decides and
 * the direction is applied to that result only.
 */
export function sortComparator<T, TField extends string = string>(
  descriptors: ReadonlyArray<SortDescriptor<TField>>,
  accessors?: FieldAccessors<T, TField>,
  options: LocaleOptions = {},
): (a: T, b: T) => number {
  return (a, b) => {
    for (const descriptor of descriptors) {
      const left = readField(a, descriptor.field, accessors);
      const right = readField(b, descriptor.field, accessors);

      const isLeftNullish = isNullish(left);
      const isRightNullish = isNullish(right);
      if (isLeftNullish || isRightNullish) {
        if (isLeftNullish && isRightNullish) continue;
        return isLeftNullish ? 1 : -1;
      }

      const result = compareValues(left, right, options);
      if (result !== 0) return descriptor.direction === SortDirection.Desc ? -result : result;
    }
    return 0;
  };
}

/**
 * Sorts a list by an ordering, without mutating the input. Returns the input array itself when there is
 * nothing to order, so an unsorted render costs no copy.
 *
 * The sort is stable (`Array.prototype.sort` has been stable since ES2019), which is what makes multi-field
 * ordering composable: equal rows keep the order the previous field — or the server — put them in.
 */
export function applySort<T, TField extends string = string>(
  items: ReadonlyArray<T>,
  descriptors: ReadonlyArray<SortDescriptor<TField>>,
  accessors?: FieldAccessors<T, TField>,
  options: LocaleOptions = {},
): ReadonlyArray<T> {
  if (descriptors.length === 0) return items;
  return [...items].sort(sortComparator(descriptors, accessors, options));
}
