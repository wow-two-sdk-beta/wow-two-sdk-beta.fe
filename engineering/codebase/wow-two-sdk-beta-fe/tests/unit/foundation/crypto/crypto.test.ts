import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToBase64Url,
  bytesToHex,
  bytesToUtf8,
  hashObject,
  hexToBytes,
  isCryptoAvailable,
  isSubtleAvailable,
  randomBytes,
  randomString,
  sha256Hex,
  stableStringify,
  timingSafeEqual,
  utf8ToBytes,
  UrlSafeAlphabet,
} from '@src/foundation/crypto';

/*
 * Smoke depth, `unit` project (node — WebCrypto is ambient on the supported runtimes).
 * Encoding is asserted by round-trip; the digest by a published SHA-256 vector, which is the
 * only assertion that catches a byte-order or encoding slip rather than merely a self-consistent
 * one.
 */

describe('capability probes', () => {
  it('reports the ambient crypto that node supplies', () => {
    expect(isCryptoAvailable()).toBe(true);
    expect(isSubtleAvailable()).toBe(true);
  });
});

describe('encoding round-trips', () => {
  const bytes = new Uint8Array([0, 1, 127, 128, 255]);

  it('hex', () => {
    expect(bytesToHex(bytes)).toBe('00017f80ff');
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it('base64', () => {
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('base64url carries no padding or url-unsafe characters', () => {
    const encoded = bytesToBase64Url(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('utf-8, including a multi-byte glyph', () => {
    expect(bytesToUtf8(utf8ToBytes('héllo \u{1F600}'))).toBe('héllo \u{1F600}');
  });
});

describe('digest', () => {
  it('matches the published SHA-256 vector for "abc"', async () => {
    await expect(sha256Hex('abc')).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('randomness', () => {
  it('returns the requested length and draws only from the alphabet', () => {
    expect(randomBytes(16)).toHaveLength(16);

    const value = randomString(32);
    expect(value).toHaveLength(32);
    for (const character of value) {
      expect(UrlSafeAlphabet).toContain(character);
    }
  });
});

describe('timingSafeEqual', () => {
  it('compares by value, and rejects a length mismatch', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe('object hashing', () => {
  /* Key ORDER must not change the hash — the whole reason a stable stringifier sits under it,
     and the failure mode is a cache key that misses for a semantically identical object. */
  it('is insensitive to key order', async () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
    await expect(hashObject({ b: 2, a: 1 })).resolves.toBe(await hashObject({ a: 1, b: 2 }));
  });
});
