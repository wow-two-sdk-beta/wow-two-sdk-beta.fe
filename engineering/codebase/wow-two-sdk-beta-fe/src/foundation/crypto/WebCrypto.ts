// Web Crypto resolution + capability probes — the single place this slice reads the ambient
// `globalThis.crypto`. Isolated for two reasons.
//
// 1. The two capabilities fail INDEPENDENTLY, so they must be probed separately. `crypto.getRandomValues`
//    is available in every modern runtime, secure context or not; `crypto.subtle` is available ONLY in a
//    secure context (https, localhost, or a file/extension origin) and is `undefined` on a plain `http://`
//    page served from a LAN IP — a setup that looks fine in dev and breaks on a staging box. Collapsing
//    both into one "crypto available" flag would report random-byte generation as broken whenever digests
//    are, and vice versa.
// 2. The global is read at CALL time, never cached at module scope. Caching would freeze an `undefined`
//    captured during SSR/hydration into the module for the page's lifetime, and would block a test from
//    stubbing `globalThis.crypto` to exercise a failure path.
//
// SSR contract for the whole slice, stated once here and echoed on each consumer: the pure helpers
// (`Encoding`, `timingSafeEqual`) never touch this file and run anywhere — SSR, workers, insecure origins.
// The digest and random helpers THROW at the call site when their capability is missing, rather than
// returning a sentinel: a silently unhashed value or a non-random "random" byte is a security defect that
// a fallback would hide, so failing loudly is the only safe default. Callers that must branch instead of
// catch use `isCryptoAvailable()` / `isSubtleAvailable()`.

/** Reads the ambient Web Crypto object, or `undefined` when the runtime has none (older SSR hosts, sandboxes). */
function resolveCrypto(): Crypto | undefined {
  // Widened through an optional-property view: `globalThis.crypto` is typed non-optional by lib.dom, so a
  // direct `=== undefined` check would be a TS2367 "no overlap" error even though it is exactly the case
  // this function exists to handle.
  return (globalThis as { crypto?: Crypto }).crypto;
}

/** Reads the ambient `SubtleCrypto`, or `undefined` when absent — no Web Crypto at all, or an insecure context. */
function resolveSubtle(): SubtleCrypto | undefined {
  const source = resolveCrypto();
  if (source === undefined) return undefined;

  // Same widening rationale as `resolveCrypto`: `Crypto.subtle` is typed non-optional but is genuinely
  // absent outside a secure context.
  return (source as { subtle?: SubtleCrypto }).subtle;
}

/**
 * Reports whether `crypto.getRandomValues` can be called — i.e. whether {@link randomBytes} and
 * {@link randomString} will succeed. True in every browser and in Node 19+, including insecure contexts.
 */
export function isCryptoAvailable(): boolean {
  return typeof resolveCrypto()?.getRandomValues === 'function';
}

/**
 * Reports whether `crypto.subtle` can be called — i.e. whether the digest helpers will succeed. False
 * outside a **secure context** (plain `http://` on a non-localhost host) even when {@link isCryptoAvailable}
 * is true. Probe this before offering a hash-dependent feature rather than catching the throw.
 */
export function isSubtleAvailable(): boolean {
  return typeof resolveSubtle()?.digest === 'function';
}

/** Returns the ambient `Crypto`, throwing a diagnostic `Error` when unavailable. Internal — not barrelled. */
export function requireCrypto(): Crypto {
  const source = resolveCrypto();
  if (source === undefined || typeof source.getRandomValues !== 'function') {
    throw new Error(
      'Web Crypto is unavailable: `globalThis.crypto.getRandomValues` is not a function. This runtime ' +
        'cannot produce cryptographically secure bytes — guard the call with `isCryptoAvailable()`.',
    );
  }

  return source;
}

/** Returns the ambient `SubtleCrypto`, throwing a diagnostic `Error` when unavailable. Internal — not barrelled. */
export function requireSubtle(): SubtleCrypto {
  const subtle = resolveSubtle();
  if (subtle === undefined || typeof subtle.digest !== 'function') {
    throw new Error(
      'Web Crypto `subtle` is unavailable: `globalThis.crypto.subtle` is undefined. `crypto.subtle` is ' +
        'exposed only in a secure context (https, localhost, or a file/extension origin) — an `http://` ' +
        'page on a LAN host has `crypto.getRandomValues` but no `subtle`. Guard with `isSubtleAvailable()`.',
    );
  }

  return subtle;
}
