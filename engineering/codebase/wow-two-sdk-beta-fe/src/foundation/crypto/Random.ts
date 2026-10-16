// Cryptographically secure randomness over `crypto.getRandomValues`. Available in insecure contexts too, so
// this works where the digest helpers do not — see `WebCrypto.ts` for the split.
//
// The one non-obvious thing in this file is **modulo-bias rejection sampling**, and it is the reason
// `randomString` exists at all rather than being a two-line snippet at each call site. The naive form
//
//     alphabet[randomByte % alphabet.length]
//
// is skewed. A byte is uniform over 0..255 — 256 values. With a 62-char alphabet, 256 = 4x62 + 8, so the
// residues 0..7 are each reachable from 5 bytes while residues 8..61 are reachable from only 4. The first
// 8 characters of the alphabet come up ~25% more often than the rest. That is invisible in a smoke test and
// measurable by an attacker over enough samples, which is precisely the wrong failure shape for a token.
//
// The fix: discard every byte at or above the largest multiple of the alphabet size that fits in 256
// (`rejectionLimit`), and only then take the modulo. For 62 that limit is 248, so bytes 248..255 are thrown
// away and the remaining 248 map 4-to-1 onto 62 characters — exactly uniform. The cost is a re-draw for
// ~3% of bytes, which is why the generator over-draws and loops instead of asking for exactly `length`.
//
// `randomStringFrom` takes its byte source as a parameter so the rejection path is testable with a
// deterministic stream. It is exported from the file but deliberately absent from the barrel — the
// "internal" signal in this repo is absence from `index.ts`, not a naming prefix.
//
// Note the scope boundary: this slice does NOT generate identifiers. `foundation/identifiers` owns UUID
// generation (`Guid.createV4` / `Guid.createV7`) and should be used for entity ids — `randomString` is for
// opaque tokens, nonces, and suffixes where a UUID's structure would be meaningless.

import { requireCrypto } from './WebCrypto';

/**
 * Default alphabet: URL-safe base62 (`A-Z`, `a-z`, `0-9`). No `+/=~`, so a generated string is safe in a
 * path segment, a query value, a filename, and an HTML attribute without escaping.
 */
export const UrlSafeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** `getRandomValues` rejects a view longer than 65536 bytes, so larger requests are filled in passes. */
const MaxBytesPerCall = 65_536;

/**
 * Returns the exclusive upper bound for an unbiased byte: the largest multiple of `size` that fits in 256.
 * Bytes at or above it must be discarded — see the file header. Internal — not exported from the barrel.
 */
export function rejectionLimit(size: number): number {
  return 256 - (256 % size);
}

/**
 * Fills `length` cryptographically secure random bytes. Requests above the platform's 65536-byte per-call
 * ceiling are filled in successive passes. **Throws** a `RangeError` on a negative or non-integer length,
 * and an `Error` when Web Crypto is unavailable — never falls back to `Math.random`.
 */
export function randomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`randomBytes: length must be a non-negative integer, got ${length}.`);
  }

  const source = requireCrypto();
  const bytes = new Uint8Array(length);

  for (let offset = 0; offset < length; offset += MaxBytesPerCall) {
    // `subarray` is a view over the same buffer, so each pass fills `bytes` in place.
    source.getRandomValues(bytes.subarray(offset, Math.min(offset + MaxBytesPerCall, length)));
  }

  return bytes;
}

/**
 * Builds a random string of `length` characters from `chars` using the byte stream `nextBytes`, discarding
 * biased bytes (see the file header). The injected source is what makes rejection testable. Internal — not
 * exported from the barrel; call {@link randomString} instead.
 */
export function randomStringFrom(
  length: number,
  chars: ReadonlyArray<string>,
  nextBytes: (count: number) => Uint8Array,
): string {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`randomStringFrom: length must be a non-negative integer, got ${length}.`);
  }

  if (chars.length === 0 || chars.length > 256) {
    throw new RangeError(
      `randomStringFrom: alphabet must hold 1..256 characters, got ${chars.length}. A larger alphabet ` +
        `cannot be sampled unbiasedly from a single byte.`,
    );
  }

  if (length === 0) return '';

  const size = chars.length;
  const limit = rejectionLimit(size);
  const picked: string[] = [];

  while (picked.length < length) {
    const needed = length - picked.length;

    // Over-draw by the expected rejection rate plus a floor, so the common case is a single draw.
    const bytes = nextBytes(needed + Math.ceil(needed / 4) + 8);
    if (bytes.length === 0) {
      throw new RangeError('randomStringFrom: the byte source returned no bytes.');
    }

    for (const byte of bytes) {
      if (byte >= limit) continue; // Biased residue — discard rather than fold it in.
      picked.push(chars[byte % size]!);
      if (picked.length === length) break;
    }
  }

  return picked.join('');
}

/**
 * Generates a random string of `length` characters, drawn uniformly from `alphabet` (default
 * {@link UrlSafeAlphabet}) with rejection sampling — no modulo bias. Use it for opaque tokens, nonces, and
 * collision-resistant suffixes; use `Guid` from `foundation/identifiers` for entity identifiers.
 *
 * The alphabet is split by code point, so an emoji or astral-plane character counts as one character and is
 * never torn into surrogate halves. It must hold 1..256 code points; duplicated characters skew the result
 * proportionally and are the caller's responsibility.
 */
export function randomString(length: number, alphabet: string = UrlSafeAlphabet): string {
  return randomStringFrom(length, [...alphabet], randomBytes);
}
