import { LosslessJson } from '../json';
import { sha256Hex } from './Digest';

/**
 * Produces strict lossless JSON with sorted object keys and stable array order.
 * ExactNumber token spelling is preserved; scale/exponent spelling remains part of the cache key.
 * Unsupported values throw rather than colliding through omission or empty-object coercion.
 * Encode Date/custom values explicitly and use ExactNumber for native fractions or unsafe integers.
 */
export function stableStringify(value: unknown): string {
  const encoded = LosslessJson.stringify(value, { sortKeys: true });
  if (!encoded.ok) throw new TypeError(encoded.failure.message);
  return encoded.value;
}

/** Hashes the sorted lossless representation; requires Web Crypto in a secure context. */
export function hashObject(value: unknown): Promise<string> {
  return sha256Hex(stableStringify(value));
}
