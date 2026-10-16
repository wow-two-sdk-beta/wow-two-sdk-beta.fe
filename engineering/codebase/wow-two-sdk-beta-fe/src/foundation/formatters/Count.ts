// Count humanizers — English pluralization and ordinals. Deliberately English-only helpers, distinct from the
// i18n `plural` formatter (which returns the locale's LDML plural *category*, not a word). Compose these with the
// i18n number formatter for the count itself: `` `${fmt.number(n)} ${pluralize(n, 'item')}` ``.

/**
 * Returns the correct English word form for `count` — `singular` when the count is exactly 1 (or -1), else
 * `plural` (defaulting to `singular + 's'`). Word only, so it composes with any number rendering.
 * `pluralize(2, 'item')` → `"items"`; `pluralize(1, 'child', 'children')` → `"child"`.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return Math.abs(count) === 1 ? singular : (plural ?? `${singular}s`);
}

/** Returns the English ordinal suffix for an integer — `"st"`, `"nd"`, `"rd"`, or `"th"` (11–13 are always `"th"`). */
export function ordinalSuffix(value: number): string {
  const abs = Math.abs(Math.trunc(value));
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  switch (abs % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** Renders an integer with its English ordinal suffix — `ordinal(1)` → `"1st"`, `ordinal(22)` → `"22nd"`. */
export function ordinal(value: number): string {
  return `${Math.trunc(value)}${ordinalSuffix(value)}`;
}
