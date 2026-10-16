// datetime — foundation seam. Local-time `Date` ARITHMETIC, COMPARISON, and RANGE math: the operations a
// calendar grid, a date-range picker, and a scheduling view need before anything is rendered.
//
// Scope boundary — this slice does NOT format for humans:
//  - Locale-aware display (`date`, `time`, `relativeTime`) belongs to `foundation/i18n` (`Intl`-backed).
//  - Compact elapsed-time humanizing (`3m 20s`) belongs to `foundation/formatters` (`formatDuration`).
//  - Wire fields use explicit TemporalCodecs. The older Date helpers remain local-calendar utilities.
//
// Date utility contracts (TemporalCodecs has its separate adjacent wire specification):
//  - IMMUTABLE — every op returns a new `Date`; no input is ever mutated.
//  - LOCAL — boundaries, day math, and ISO date-only serialization use local wall-clock fields, never
//    UTC. `toISOString().slice(0, 10)` shifts the day for most of the planet; `toIsoDateString` doesn't.
//  - INJECTABLE NOW — every now-dependent predicate (`isToday`/`isPast`/`isFuture`) takes `now` as its
//    last parameter, defaulting in the signature. No hidden clock read.
//  - REVERSED RANGE = EMPTY — `isBetween`/`isWithinInterval`/`overlaps` return `false` and
//    `eachDayOfInterval` returns `[]`. Bounds are never silently swapped.
//  - INVALID DATE = FALSE / `NaN` / `[]` — predicates never throw. `toIsoDateString` is the one
//    exception and throws a `RangeError`, because an unrepresentable output has no safe fallback.
//  - `(from, to)` argument order on every `differenceIn*`, positive when `to` is later — matching the
//    existing `daysBetween` helper, and the reverse of `date-fns`.

export {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  addHours,
  subHours,
  addMinutes,
  subMinutes,
  addSeconds,
  subSeconds,
} from './Arithmetic';

export {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  type WeekStartsOn,
} from './Boundaries';

export {
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  isBefore,
  isAfter,
  isBetween,
  isToday,
  isPast,
  isFuture,
  minDate,
  maxDate,
  clampDate,
  type BetweenOptions,
} from './Comparison';

export {
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from './Difference';

export { eachDayOfInterval, isWithinInterval, overlaps, type DateInterval, type OverlapOptions } from './Interval';

export { isValidDate, parseIsoDate, toIsoDateString } from './IsoDate';

export { TemporalCodecs, type TemporalFieldCodec } from './TemporalCodecs';
