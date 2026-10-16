import { describe, expect, it } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { TemporalCodecs } from '@src/foundation/datetime';

function value<T>(result: { ok: true; value: T } | { ok: false; failure: unknown }): T {
  if (!result.ok) throw new Error('Expected a successful codec result');
  return result.value;
}

describe('declared Temporal field codecs', () => {
  it.each([
    ['instant', '2026-09-10T12:00:00Z'],
    ['plainDate', '2028-02-29'],
    ['plainTime', '23:59:59.1234567'],
    ['isoDuration', 'PT1S'],
    ['clrTimeSpan', '00:00:01'],
  ] as const)('rejects trailing line terminators in %s', (name, wire) => {
    for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029']) {
      expect(TemporalCodecs[name].decode(wire + suffix).ok).toBe(false);
    }
  });

  it('preserves an instant while canonicalizing its explicit offset to UTC', () => {
    const decoded = value(TemporalCodecs.instant.decode('2026-09-10T12:00:00.123456789+05:00'));
    expect(decoded.epochNanoseconds).toBe(Temporal.Instant.from('2026-09-10T07:00:00.123456789Z').epochNanoseconds);
    expect(value(TemporalCodecs.instant.encode(decoded))).toBe('2026-09-10T07:00:00.123456789Z');
  });

  it('preserves leap-day and fractional clock fields without applying a timezone', () => {
    const date = value(TemporalCodecs.plainDate.decode('2028-02-29'));
    const time = value(TemporalCodecs.plainTime.decode('23:59:59.1234567'));
    expect(value(TemporalCodecs.plainDate.encode(date))).toBe('2028-02-29');
    expect(value(TemporalCodecs.plainTime.encode(time))).toBe('23:59:59.1234567');
  });

  it.each([
    ['instant', '2026-02-30T12:00:00Z'],
    ['instant', '2026-09-10T12:00:00'],
    ['instant', '2026-09-10T23:59:60Z'],
    ['plainDate', '2026-02-29'],
    ['plainDate', '2026-09-10T00:00:00Z'],
    ['plainTime', '24:00:00'],
    ['plainTime', '12:00:00Z'],
    ['plainTime', '12:00:00.1234567890'],
  ] as const)('rejects malformed %s wire values', (name, wire) => {
    expect(TemporalCodecs[name].decode(wire).ok).toBe(false);
  });

  it('does not scan ordinary strings or silently accept omitted/null required fields', () => {
    const raw = JSON.parse('{"label":"2028-02-29","when":"2028-02-29"}') as { label: string; when: string };
    const decoded = value(TemporalCodecs.plainDate.decode(raw.when));
    expect(decoded).toBeInstanceOf(Temporal.PlainDate);
    expect(raw.label).toBe('2028-02-29');
    expect(raw.when).toBe('2028-02-29');
    expect(TemporalCodecs.plainDate.decode(null).ok).toBe(false);
    expect(TemporalCodecs.plainDate.decode(undefined).ok).toBe(false);
    expect(TemporalCodecs.plainDate.decode(20280910).ok).toBe(false);
  });

  it('keeps ISO calendar durations distinct from fixed elapsed TimeSpan', () => {
    const duration = value(TemporalCodecs.isoDuration.decode('P1Y2M3DT4H5M6.123456789S'));
    expect(value(TemporalCodecs.isoDuration.encode(duration))).toBe('P1Y2M3DT4H5M6.123456789S');
    expect(TemporalCodecs.clrTimeSpan.encode(duration).ok).toBe(false);
    expect(TemporalCodecs.isoDuration.decode('2.00:00:01').ok).toBe(false);
    expect(TemporalCodecs.clrTimeSpan.decode('P2DT1S').ok).toBe(false);
  });
});

describe('CLR constant TimeSpan codec', () => {
  // Matches System.Text.Json default output, verified with the isolated net10 fixture probe.
  it.each([
    '00:00:00',
    '2.00:00:01',
    '00:00:00.0000001',
    '-00:00:00.0000001',
    '3.17:25:30.5000000',
    '-10675199.02:48:05.4775808',
    '10675199.02:48:05.4775807',
  ])('round-trips %s without losing a tick', (wire) => {
    const decoded = value(TemporalCodecs.clrTimeSpan.decode(wire));
    expect(value(TemporalCodecs.clrTimeSpan.encode(decoded))).toBe(wire);
  });

  it.each([
    '10675199.02:48:05.4775808',
    '-10675199.02:48:05.4775809',
    '10675200.00:00:00',
    '24:00:00',
    '00:60:00',
    '00:00:60',
    '00:00:00.00000001',
    '00:00',
    '+00:00:01',
    ' 00:00:01',
  ])('rejects overflow or malformed constant %s', (wire) => {
    expect(TemporalCodecs.clrTimeSpan.decode(wire).ok).toBe(false);
  });

  it('refuses precision loss and calendar conversion while allowing exact elapsed weeks', () => {
    expect(TemporalCodecs.clrTimeSpan.encode(Temporal.Duration.from({ nanoseconds: 1 })).ok).toBe(false);
    expect(TemporalCodecs.clrTimeSpan.encode(Temporal.Duration.from({ months: 1 })).ok).toBe(false);
    expect(value(TemporalCodecs.clrTimeSpan.encode(Temporal.Duration.from({ weeks: 1 })))).toBe('7.00:00:00');
  });

  it('normalizes accepted short fractional text to the backend constant output', () => {
    const decoded = value(TemporalCodecs.clrTimeSpan.decode('00:00:01.25'));
    expect(value(TemporalCodecs.clrTimeSpan.encode(decoded))).toBe('00:00:01.2500000');
  });
});
