import { Temporal } from 'temporal-polyfill';
import { AppErrorFactory, ResultExtensions, type Result } from '../results';

/** Decodes one declared wire field and encodes its corresponding Temporal value. */
export interface TemporalFieldCodec<T> {
  readonly decode: (value: unknown) => Result<T>;
  readonly encode: (value: T) => Result<string>;
}

const IsoDatePattern = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const IsoTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?$/;
const IsoInstantPattern =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const IsoDurationPattern =
  /^-?P(?=\d|T\d)(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?=\d)(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/;
const TimeSpanPattern = /^(-)?(?:(0|[1-9]\d{0,7})\.)?([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,7}))?$/;
const TicksPerSecond = 10_000_000n;
const TicksPerDay = 86400n * TicksPerSecond;
const MinTicks = -9223372036854775808n;
const MaxTicks = 9223372036854775807n;

function invalid<T>(): Result<T> {
  return ResultExtensions.fail(AppErrorFactory.validation());
}

function codec<T>(pattern: RegExp, parse: (text: string) => T, format: (value: T) => string): TemporalFieldCodec<T> {
  return {
    decode: (value) => {
      if (typeof value !== 'string' || pattern.exec(value)?.[0] !== value) return invalid();
      try {
        const decoded = parse(value);
        const text = format(decoded);
        if (pattern.exec(text)?.[0] !== text) return invalid();
        return ResultExtensions.ok(decoded);
      } catch {
        return invalid();
      }
    },
    encode: (value) => {
      try {
        const text = format(value);
        if (pattern.exec(text)?.[0] !== text) return invalid();
        return ResultExtensions.ok(text);
      } catch {
        return invalid();
      }
    },
  };
}

function decodeTimeSpan(value: unknown): Result<Temporal.Duration> {
  if (typeof value !== 'string') return invalid();
  const match = TimeSpanPattern.exec(value);
  if (!match || match[0] !== value) return invalid();
  const sign = match[1] ? -1 : 1;
  const days = BigInt(match[2] ?? '0');
  const hours = Number(match[3]);
  const minutes = Number(match[4]);
  const seconds = Number(match[5]);
  const fraction = BigInt((match[6] ?? '').padEnd(7, '0'));
  const ticks =
    BigInt(sign) * (days * TicksPerDay + BigInt(hours * 3600 + minutes * 60 + seconds) * TicksPerSecond + fraction);
  if (ticks < MinTicks || ticks > MaxTicks) return invalid();
  return ResultExtensions.ok(
    Temporal.Duration.from({
      days: sign * Number(days),
      hours: sign * hours,
      minutes: sign * minutes,
      seconds: sign * seconds,
      milliseconds: sign * Number(fraction / 10000n),
      microseconds: sign * Number((fraction % 10000n) / 10n),
      nanoseconds: sign * Number(fraction % 10n) * 100,
    }),
  );
}

function encodeTimeSpan(value: Temporal.Duration): Result<string> {
  try {
    if (value.years !== 0 || value.months !== 0) return invalid();
    const fields = [
      value.weeks,
      value.days,
      value.hours,
      value.minutes,
      value.seconds,
      value.milliseconds,
      value.microseconds,
      value.nanoseconds,
    ];
    if (fields.some((field) => !Number.isSafeInteger(field)) || value.nanoseconds % 100 !== 0) return invalid();
    const ticks =
      (BigInt(value.weeks) * 7n + BigInt(value.days)) * TicksPerDay +
      BigInt(value.hours) * 3600n * TicksPerSecond +
      BigInt(value.minutes) * 60n * TicksPerSecond +
      BigInt(value.seconds) * TicksPerSecond +
      BigInt(value.milliseconds) * 10000n +
      BigInt(value.microseconds) * 10n +
      BigInt(value.nanoseconds) / 100n;
    if (ticks < MinTicks || ticks > MaxTicks) return invalid();
    const absolute = ticks < 0n ? -ticks : ticks;
    const days = absolute / TicksPerDay;
    const seconds = absolute / TicksPerSecond;
    const pad = (part: bigint): string => String(part).padStart(2, '0');
    const fraction = absolute % TicksPerSecond;
    const text = `${ticks < 0n ? '-' : ''}${days === 0n ? '' : `${days}.`}${pad((seconds / 3600n) % 24n)}:${pad((seconds / 60n) % 60n)}:${pad(seconds % 60n)}${fraction === 0n ? '' : `.${String(fraction).padStart(7, '0')}`}`;
    return ResultExtensions.ok(text);
  } catch {
    return invalid();
  }
}

/** Explicit, field-scoped Temporal wire encodings. Ordinary JSON strings are never inspected globally. */
export const TemporalCodecs = {
  /** An ISO instant with seconds and an explicit UTC offset; emits canonical UTC. */
  instant: codec(
    IsoInstantPattern,
    (value) => Temporal.Instant.from(value),
    (value: Temporal.Instant) => value.toString(),
  ),
  /** An ISO-calendar date without a timezone or time-of-day. */
  plainDate: codec(
    IsoDatePattern,
    (value) => Temporal.PlainDate.from(value),
    (value: Temporal.PlainDate) => {
      if (value.calendarId !== 'iso8601') throw new RangeError('Expected ISO calendar');
      return value.toString();
    },
  ),
  /** A clock time without a timezone, retaining up to nanosecond precision. */
  plainTime: codec(
    IsoTimePattern,
    (value) => Temporal.PlainTime.from(value),
    (value: Temporal.PlainTime) => value.toString(),
  ),
  /** An ISO duration; calendar years and months retain their calendar meaning. */
  isoDuration: codec(
    IsoDurationPattern,
    (value) => Temporal.Duration.from(value),
    (value: Temporal.Duration) => value.toString(),
  ),
  /** CLR constant TimeSpan encoding, exact signed 64-bit ticks at 100 ns; days mean 24 elapsed hours. */
  clrTimeSpan: { decode: decodeTimeSpan, encode: encodeTimeSpan } satisfies TemporalFieldCodec<Temporal.Duration>,
} as const;
