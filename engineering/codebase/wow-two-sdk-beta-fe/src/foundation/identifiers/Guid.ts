import type { Temporal } from 'temporal-polyfill';

/**
 * Defines a branded alias for a raw RFC-9562 GUID string (`0197c8f4-3e2a-7c1d-8f9a-1b2c3d4e5f60`) —
 * wire-identical to a .NET `System.Guid`.
 */
export type Guid = string & { readonly __brand: 'Guid' };

const HyphenD = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HexByte = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

/** Formats 16 bytes as a lowercase hyphenated `D`-string. */
function format(b: Uint8Array): string {
  const h = (i: number): string => HexByte[b[i]!]!;
  return `${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-${h(8)}${h(9)}-${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}`;
}

/**
 * Creates a time-ordered **UUIDv7** (RFC 9562 §5.7) — the default factory, mirroring .NET's
 * `Guid.CreateVersion7()`. Non-monotonic within a millisecond (matches .NET). `timestamp`
 * defaults to now; pass a number (epoch ms) or `Temporal.Instant` to backdate.
 */
function createV7(timestamp?: number | Temporal.Instant): Guid {
  const ms =
    timestamp === undefined ? Date.now() : typeof timestamp === 'number' ? timestamp : timestamp.epochMilliseconds;

  if (!Number.isSafeInteger(ms) || ms < 0 || ms >= 2 ** 48) {
    throw new RangeError('Guid.createV7: timestamp must fit the unsigned 48-bit millisecond wire field.');
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);

  b[0] = (ms / 2 ** 40) & 0xff; // 48-bit big-endian unix_ts_ms
  b[1] = (ms / 2 ** 32) & 0xff;
  b[2] = (ms / 2 ** 24) & 0xff;
  b[3] = (ms / 2 ** 16) & 0xff;
  b[4] = (ms / 2 ** 8) & 0xff;
  b[5] = ms & 0xff;
  b[6] = (b[6]! & 0x0f) | 0x70; // version 7
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 0b10

  return format(b) as Guid;
}

/** Creates a random **UUIDv4** (RFC 9562 §4.4) — the .NET `Guid.NewGuid()` parallel (no `CreateVersion4`). */
function createV4(): Guid {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 0b10
  return format(b) as Guid;
}

/** The nil GUID (`00000000-0000-0000-0000-000000000000`) — the `Guid.Empty` parallel. */
const empty = '00000000-0000-0000-0000-000000000000' as Guid;

/** Narrows a `string` to `Guid` when it is a legal hyphenated GUID (any version — permissive, like `Guid.Parse`). */
function isGuid(s: string): s is Guid {
  return typeof s === 'string' && HyphenD.exec(s)?.[0] === s;
}

/** Validates + brands (lowercased); **throws** on a non-GUID string — the `Guid.Parse` parallel. */
function parse(s: string): Guid {
  if (!(typeof s === 'string' && HyphenD.exec(s)?.[0] === s)) throw new TypeError(`Invalid GUID: "${s}"`);
  return s.toLowerCase() as Guid;
}

/** Validates + brands (lowercased); returns `undefined` on failure — the `Guid.TryParse` parallel. */
function tryParse(s: string): Guid | undefined {
  return typeof s === 'string' && HyphenD.exec(s)?.[0] === s ? (s.toLowerCase() as Guid) : undefined;
}

/** Case-insensitive value equality — the `Guid.Equals` parallel. */
function equals(a: Guid, b: Guid): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Lexical compare of the lowercased strings; for v7 values, creation-time order — the `Guid.CompareTo` parallel. */
function compare(a: Guid, b: Guid): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Reads the version nibble (`7`, `4`, …); `undefined` if not a GUID — the `Guid.Version` parallel. */
function version(s: string): number | undefined {
  return typeof s === 'string' && HyphenD.exec(s)?.[0] === s ? parseInt(s[14]!, 16) : undefined;
}

/** Identity — a `Guid` already is its `D`-string; kept for .NET `ToString("D")` symmetry. */
function toString(g: Guid): string {
  return g;
}

/** Static factory + helper surface for {@link Guid}, mirroring .NET's `System.Guid` statics. */
export const Guid = {
  createV7,
  createV4,
  empty,
  parse,
  tryParse,
  isGuid,
  equals,
  compare,
  version,
  toString,
} as const;
