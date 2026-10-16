/** A signed distance in the largest unit that keeps it at least one — the pair `Intl.RelativeTimeFormat` takes. */
export interface RelativeTimeParts {
  /** Negative = past, positive = future; rounded to a whole unit. */
  readonly value: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

/* Each unit and how many of it make the next. A month is 4.345 weeks on average. */
const Steps: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.345],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

/* Halves round away from zero, so a past and a future distance of the same size read alike. `+ 0` drops `-0`. */
function roundAway(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value)) + 0;
}

/** Reads a `Date`, epoch milliseconds or ISO-8601 string as epoch milliseconds; `NaN` when unreadable. */
export function toEpochMs(value: Date | number | string): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return Date.parse(value);
}

/**
 * Splits the distance from `now` to `target` into the unit a reader expects — "3 days ago", not "72 hours ago".
 * Rounds before stepping up, so 59.6 seconds reads as one minute. `null` when either instant is unreadable.
 */
export function toRelativeTimeParts(
  target: Date | number | string,
  now: Date | number | string = Date.now(),
): RelativeTimeParts | null {
  const from = toEpochMs(now);
  const to = toEpochMs(target);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  let value = (to - from) / 1000;
  for (const [unit, size] of Steps) {
    if (Math.abs(roundAway(value)) < size) return { value: roundAway(value), unit };
    value /= size;
  }
  return { value: roundAway(value), unit: 'year' };
}
