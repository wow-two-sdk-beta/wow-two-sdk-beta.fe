// crypto — foundation seam. The Web Crypto primitives an app needs below the feature layer: digests
// (`sha256`/`sha1`/`sha384`/`sha512`), secure randomness (`randomBytes`/`randomString`), byte<->text codecs
// (hex, base64, base64url, UTF-8), constant-time comparison, and stable content hashing for cache keys.
// Concretely: cache keys, content hashes, ETags, checksum display, opaque tokens, and comparing a digest
// without leaking a prefix through timing.
//
// SCOPE BOUNDARY — this slice does NOT generate identifiers. `foundation/identifiers` owns that: `Guid`,
// `Guid.createV4`, `Guid.createV7`. Nothing here is re-exported from it and no UUID factory is duplicated.
// The two complement rather than compete: reach for `Guid` for an entity id (structured, RFC 9562, wire-
// identical to a .NET `System.Guid`, time-ordered in v7), and for `randomString` only when the value should
// carry no structure at all — a nonce, an opaque token, a collision-resistant suffix.
//
// AVAILABILITY — not uniform across this slice, and the split matters more than it looks:
//  - Encoding + `timingSafeEqual` are pure. They run under SSR, in workers, and on insecure origins.
//  - Random needs `crypto.getRandomValues` — present in every modern runtime including insecure contexts.
//  - Digests (and therefore `hashObject`) need `crypto.subtle`, which is exposed ONLY in a secure context:
//    `undefined` on a plain `http://` page served from a LAN IP, a case that passes on localhost and fails
//    on a staging box.
// Both capability-dependent groups THROW at the call site when unavailable rather than degrading to a
// fallback — a silently unhashed value or a non-random "random" byte is a security defect a fallback would
// hide. Probe with `isCryptoAvailable()` / `isSubtleAvailable()` to branch without a try/catch.

export { isCryptoAvailable, isSubtleAvailable } from './WebCrypto';

export {
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  bytesToBase64Url,
  base64UrlToBytes,
  utf8ToBytes,
  bytesToUtf8,
} from './Encoding';

export { type BinaryInput, type DigestAlgorithm, digest, sha1, sha256, sha384, sha512, sha256Hex } from './Digest';

export { UrlSafeAlphabet, randomBytes, randomString } from './Random';

export { timingSafeEqual } from './TimingSafeEqual';

export { stableStringify, hashObject } from './HashObject';
