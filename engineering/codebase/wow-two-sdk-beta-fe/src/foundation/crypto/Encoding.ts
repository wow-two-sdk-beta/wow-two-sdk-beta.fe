// Byte <-> text codecs: hex, base64, base64url, UTF-8. Pure and synchronous, touching no Web Crypto at
// all — so every helper here runs under SSR, in a worker, and on an insecure origin, unlike the digest and
// random helpers. This is the slice's floor: a digest returns bytes, and bytes are unreadable until one of
// these renders them (ETag header, cache key, checksum shown to a user).
//
// Decisions worth stating:
//  - Decoders are STRICT — malformed input throws a `TypeError`, never a best-effort result. A digest that
//    silently mis-decodes compares unequal forever and the bug surfaces far from its cause; a throw is
//    found on the first run. Both `hexToBytes` and `base64ToBytes` validate the full string shape BEFORE
//    any conversion, so a partial result is never produced.
//  - base64url is a first-class pair, not a `.replace()` applied to base64 output at each call site. JWT
//    segments, URL query values, and filename-safe keys all need `-_` and no `=`, and the padding handling
//    is exactly where the hand-rolled version goes wrong.
//  - `btoa`/`atob` do the base64 work rather than a hand-rolled table: both are present in every runtime we
//    target (browsers, Node 16+, workers, Deno/Bun) and are far faster than a JS loop. Their leniency is
//    what the validation above wraps — by the time they are called the input is known-good.
//  - `bytesToBase64` chunks its input. `String.fromCharCode(...bytes)` on a multi-MB array overflows the
//    argument stack (`RangeError: Maximum call stack size exceeded`) — a bug that only appears on large
//    files, i.e. in production.
//  - `bytesToUtf8` is LENIENT: invalid sequences become U+FFFD, `TextDecoder`'s default. That matches what
//    a caller rendering a payload expects. It also makes UTF-8 a lossy round-trip for arbitrary binary by
//    definition — hash bytes must go through hex or base64, never through this.

/**
 * Precomputed byte -> 2-char lowercase hex, so `bytesToHex` is a table lookup rather than a per-byte
 * `toString(16).padStart`.
 */
const HexByByte = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

/** Matches an even-length run of hex digits (either case), including the empty string. */
const HexString = /^(?:[0-9a-fA-F]{2})*$/;

/**
 * Matches canonical standard base64: whole 4-char groups, then an optional 2- or 3-char tail with correct
 * padding. Rejects a lone trailing char (`{4}n+1` is not a reachable length), over-padding (`YQ===`), and
 * any character outside the standard alphabet — including whitespace and the base64url `-_`.
 */
const Base64String = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/;

/** The base64url counterpart of {@link Base64String} — `-_` for `+/`. Padding tolerated on input, never emitted. */
const Base64UrlString = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}(?:==)?|[A-Za-z0-9_-]{3}=?)?$/;

/** Largest slice fed to `String.fromCharCode(...)` at once — keeps the spread under the engine argument limit. */
const FromCharCodeChunk = 0x8000;

/**
 * Shared UTF-8 encoder. `TextEncoder` is part of the Encoding standard, present in every target runtime
 * (including SSR), so module-scope construction is safe.
 */
const Utf8Encoder = new TextEncoder();

/** Shared UTF-8 decoder, lenient by default — see the file header on why `fatal` is not set. */
const Utf8Decoder = new TextDecoder();

/**
 * Renders bytes as a lowercase hex string (2 chars per byte, no separator) — the canonical way to show a
 * digest, an ETag, or a checksum. Inverse of {@link hexToBytes}.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += HexByByte[byte]!;
  return hex;
}

/**
 * Parses a hex string into bytes, accepting either case. **Throws a `TypeError`** when the input has an odd
 * length or contains a non-hex character — a half-parsed digest is never returned. Inverse of
 * {@link bytesToHex}.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (HexString.exec(hex)?.[0] !== hex) {
    throw new TypeError(
      `hexToBytes: expected an even-length string of hex digits, got "${hex}" (length ${hex.length}).`,
    );
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Encodes bytes as standard, padded base64 (`+`, `/`, `=`). Safe for arbitrarily large inputs — the source
 * is walked in chunks. Inverse of {@link base64ToBytes}; for URL or JWT contexts use
 * {@link bytesToBase64Url}.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += FromCharCodeChunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + FromCharCodeChunk));
  }

  return btoa(binary);
}

/**
 * Decodes standard base64 into bytes. Padding may be present or omitted, but the string must otherwise be
 * canonical: **throws a `TypeError`** on any character outside `A-Za-z0-9+/=` (whitespace and the base64url
 * `-_` included), on over-padding, and on an impossible length. Inverse of {@link bytesToBase64}.
 */
export function base64ToBytes(base64: string): Uint8Array {
  if (Base64String.exec(base64)?.[0] !== base64) {
    throw new TypeError(
      `base64ToBytes: expected a canonical standard-base64 string (alphabet A-Za-z0-9+/ with optional ` +
        `= padding), got "${base64}".`,
    );
  }

  const binary = atob(base64);
  if (btoa(binary).replace(/=+$/, '') !== base64.replace(/=+$/, '')) {
    throw new TypeError('base64ToBytes: non-zero padding bits are not canonical.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

/**
 * Encodes bytes as **unpadded** base64url (RFC 4648 §5) — `-_` in place of `+/`, no `=`. This is the form a
 * JWT segment, a URL query value, and a filename-safe cache key all require. Inverse of
 * {@link base64UrlToBytes}.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes base64url into bytes, tolerating the padding that {@link bytesToBase64Url} never emits (some
 * producers add it). **Throws a `TypeError`** on any character outside `A-Za-z0-9-_=` — notably on the
 * standard-base64 `+` and `/`, which signal that {@link base64ToBytes} was the intended decoder.
 */
export function base64UrlToBytes(base64Url: string): Uint8Array {
  if (Base64UrlString.exec(base64Url)?.[0] !== base64Url) {
    throw new TypeError(
      `base64UrlToBytes: expected a base64url string (alphabet A-Za-z0-9-_ with optional = padding), got ` +
        `"${base64Url}".`,
    );
  }

  const standard = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  // Re-pad to a 4-char boundary: `atob` accepts unpadded input, but re-padding keeps this on the exact
  // path `base64ToBytes` validates rather than relying on that leniency.
  const padding = standard.length % 4 === 0 ? '' : '='.repeat(4 - (standard.length % 4));

  return base64ToBytes(standard + padding);
}

/**
 * Encodes a string to its UTF-8 bytes — the normalization every digest of a string goes through.
 * Inverse of {@link bytesToUtf8}.
 */
export function utf8ToBytes(text: string): Uint8Array {
  return Utf8Encoder.encode(text);
}

/**
 * Decodes UTF-8 bytes back to a string. **Lenient**: an invalid sequence becomes U+FFFD rather than
 * throwing, so this is lossy for arbitrary binary — render digest bytes with {@link bytesToHex} or
 * {@link bytesToBase64} instead. Inverse of {@link utf8ToBytes} for any real text.
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  return Utf8Decoder.decode(bytes);
}
