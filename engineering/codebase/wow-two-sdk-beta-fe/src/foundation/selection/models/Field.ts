// The one field-reading seam shared by the sort and filter models. Both answer the same question —
// "given an item and a field name, what value do I compare?" — so the vocabulary lives here rather than
// being defined twice and drifting.
//
// Accessors are OPTIONAL by design: the overwhelmingly common table column sorts on a plain property, so
// `readField` falls back to a direct property read when no accessor is registered for the field. That
// keeps the zero-config call (`applySort(rows, [{ field: 'name', direction: 'asc' }])`) working while
// still letting a computed column (`fullName`, `total`) register a real accessor.
//
// The map is `Partial` on purpose: with `noUncheckedIndexedAccess` a `Partial<Record<TField, F>>` lookup
// is `F | undefined` for BOTH a `string` field type and a literal union, so the guard below type-checks
// identically either way — no cast, no `any`.

/** Represents the value extraction for one field of an item — the unit a comparator or predicate reads. */
export type FieldAccessor<T> = (item: T) => unknown;

/**
 * Represents the field-name → accessor registry handed to {@link readField}, `applySort`, and `applyFilters`.
 * Every entry is optional; a field with no entry falls back to a plain property read.
 */
export type FieldAccessors<T, TField extends string = string> = Partial<Readonly<Record<TField, FieldAccessor<T>>>>;

/**
 * Reads one field off an item: the registered accessor when present, otherwise the item's own property of
 * that name. Returns `undefined` for a non-object item with no accessor — which the sort model treats as
 * nullish (sorts last) and the filter model treats as "matches nothing but a nullish `equals`".
 */
export function readField<T, TField extends string>(
  item: T,
  field: TField,
  accessors?: FieldAccessors<T, TField>,
): unknown {
  const accessor: FieldAccessor<T> | undefined =
    accessors && Object.hasOwn(accessors, field) ? accessors[field] : undefined;
  if (accessor) return accessor(item);
  if (typeof item === 'object' && item !== null) {
    return (item as Record<string, unknown>)[field];
  }
  return undefined;
}

/**
 * Reports whether a value is absent for comparison purposes — `null`, `undefined`, or `NaN`.
 *
 * `NaN` counts as nullish deliberately: it is the one number that makes `a - b` return `NaN`, which would
 * make a comparator non-transitive and leave the sorted order engine-defined. Folding it in with the
 * nullish values gives it a documented home (last) instead.
 */
export function isNullish(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

/** Represents the locale seam shared by the sort and filter entry points. Omit to use the host default. */
export interface LocaleOptions {
  /** The BCP 47 locale driving string collation (sort) and case folding (filter). Defaults to the host locale. */
  locale?: string;
}

/**
 * Coerces any value to text for the filter model's text operators. Symbols are handled explicitly because
 * `String(symbol)` throws, and a filter must never throw on unexpected row data.
 */
export function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'symbol') return value.toString();
  return String(value);
}
