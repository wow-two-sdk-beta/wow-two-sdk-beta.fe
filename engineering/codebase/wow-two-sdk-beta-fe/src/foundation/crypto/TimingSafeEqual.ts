// Constant-time byte comparison. Exists because `a === b` on a secret is a side channel: the engine's string
// or array compare returns at the first differing byte, so how long the comparison took reveals how many
// leading bytes matched. An attacker who can submit guesses and time the response recovers a token one byte
// at a time — linear work instead of exponential.
//
// The fix is to look at every byte regardless: XOR each pair, OR the differences together, and decide once
// at the end. No branch depends on the data.
//
// Length is folded into the same accumulator rather than checked up front with an early `return false`. An
// early length check is a second, coarser side channel: it separates "wrong length" from "right length,
// wrong content" by timing. Seeding the accumulator with `a.length ^ b.length` and walking to the longer of
// the two collapses both outcomes onto the same path. (The loop bound still tracks the longer input — an
// input's length is public in essentially every protocol, its *contents* are not.)
//
// HONEST LIMITATION, stated because this is security code: JavaScript cannot guarantee constant time. A JIT
// may deoptimize, bounds checks and `?? 0` are engine-dependent, GC can pause mid-loop, and the runtime is
// free to reorder. This is a best-effort mitigation that removes the *obvious* early-exit leak, not a
// hardware guarantee like a constant-time assembly routine. High-value secrets should be compared
// server-side (Node's `crypto.timingSafeEqual`, .NET's `CryptographicOperations.FixedTimeEquals`), not here.

/**
 * Compares two byte arrays in (best-effort) constant time — no early exit on the first mismatch, and no
 * separate fast path for a length mismatch. Returns true only when both length and every byte match.
 *
 * Use it whenever one side is secret: a digest, an HMAC, a CSRF or session token, a signed URL parameter.
 * For plain non-secret data `===` on the hex form is fine and faster.
 *
 * To compare strings, encode both with `utf8ToBytes` first — a `string` overload is deliberately absent
 * because the encoding step's own timing would need the same care and hiding it here would suggest a
 * guarantee this cannot make. See the file header on what JS can and cannot promise.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // Seeded with the length difference so a wrong-length input takes the same path as a wrong-content one.
  let difference = a.length ^ b.length;

  const span = Math.max(a.length, b.length);
  for (let i = 0; i < span; i++) {
    // `?? 0` covers the tail of the shorter array; under `noUncheckedIndexedAccess` it is also the honest
    // type for an indexed read, so the guard and the type narrowing are the same expression.
    difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return difference === 0;
}
