// Duration humanizing — compact elapsed-time rendering `Intl` doesn't cover. `formatDuration(200_000)` → `3m 20s`.
// Shows the N most-significant non-zero segments (default 2) across d/h/m/s(/ms), sign-preserving. Locale-free:
// for a localized "3 minutes ago" phrasing use the i18n `relativeTime` formatter instead — this is the terse form.

/** Tunes duration formatting. */
export interface FormatDurationOptions {
  /** Maximum number of unit segments to show, most-significant first. Defaults to `2` (`1h 3m`). */
  readonly units?: number;

  /** Include a millisecond segment even for durations ≥ 1s. Defaults to `false` (ms only shows sub-second). */
  readonly ms?: boolean;
}

const MsPer = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 } as const;

/**
 * Formats a millisecond duration as a compact string (`1d 2h`, `3m 20s`, `500ms`, `0s`). Emits at most `units`
 * non-zero segments in descending order; a sub-second duration renders as `ms`. Sign is preserved. Throws a
 * `RangeError` on a non-finite input.
 */
export function formatDuration(milliseconds: number, options?: FormatDurationOptions): string {
  if (!Number.isFinite(milliseconds)) {
    throw new RangeError(`formatDuration: expected a finite number, got ${milliseconds}`);
  }

  const maxUnits = Math.max(1, options?.units ?? 2);
  const sign = milliseconds < 0 ? '-' : '';
  let remaining = Math.abs(milliseconds);

  const segments: string[] = [];
  for (const [unit, size] of Object.entries(MsPer) as [keyof typeof MsPer, number][]) {
    const amount = Math.floor(remaining / size);
    if (amount > 0) {
      segments.push(`${amount}${unit}`);
      remaining -= amount * size;
    }
  }

  const millis = Math.floor(remaining);
  // Sub-second total (no d/h/m/s segments) always shows ms; `ms: true` appends it to longer durations too.
  if ((segments.length === 0 || options?.ms === true) && millis > 0) segments.push(`${millis}ms`);

  if (segments.length === 0) return '0s';
  return `${sign}${segments.slice(0, maxUnits).join(' ')}`;
}
