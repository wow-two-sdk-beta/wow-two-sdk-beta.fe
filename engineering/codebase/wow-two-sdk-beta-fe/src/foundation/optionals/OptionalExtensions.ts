/** Optional value extensions — call as `OptionalExtensions.x(...)`. */

/**
 * Construct an optional from a `(condition, value)` pair: returns `value` when
 * `condition` is truthy, otherwise `undefined`. Use to keep DOM attributes
 * absent when their default/false meaning is what we want (e.g. `aria-busy`,
 * `tabIndex`, `disabled`).
 */
function from<T>(condition: unknown, value: T): T | undefined {
  return condition ? value : undefined;
}

export const OptionalExtensions = {
  from,
} as const;
