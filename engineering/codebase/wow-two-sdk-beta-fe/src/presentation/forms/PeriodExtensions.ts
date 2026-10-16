import { Temporal } from 'temporal-polyfill';

/** Names the period a month or year grid pages through. */
export const PeriodKind = {
  /** Months, one year per page. */
  Month: 'month',
  /** Years, one decade per page. */
  Year: 'year',
} as const;
export type PeriodKind = (typeof PeriodKind)[keyof typeof PeriodKind];

/** Returns how far one page of the grid moves — twelve months or ten years. */
export function periodPageSpan(kind: PeriodKind): number {
  return kind === PeriodKind.Month ? 12 : 10;
}

/** Maps a year-month to its month index — `year × 12 + month − 1`, so consecutive months differ by one. */
export function monthIndexOf(month: Temporal.PlainYearMonth): number {
  return month.year * 12 + month.month - 1;
}

/** Maps a month index back to its year-month. */
export function yearMonthAt(index: number): Temporal.PlainYearMonth {
  const year = Math.floor(index / 12);
  return Temporal.PlainYearMonth.from({ year, month: index - year * 12 + 1 });
}

/**
 * Returns the first day of an index's period. A `PlainYearMonth` formats only in its own calendar, which
 * throws under a locale's default calendar; a `PlainDate` formats in any.
 */
export function periodStartDate(kind: PeriodKind, index: number): Temporal.PlainDate {
  if (kind === PeriodKind.Year) return Temporal.PlainDate.from({ year: index, month: 1, day: 1 });
  const month = yearMonthAt(index);
  return Temporal.PlainDate.from({ year: month.year, month: month.month, day: 1 });
}

/** Returns the index of the current month or year. */
export function currentPeriodIndex(kind: PeriodKind): number {
  const now = Temporal.Now.plainDateISO();
  return kind === PeriodKind.Month ? now.year * 12 + now.month - 1 : now.year;
}
