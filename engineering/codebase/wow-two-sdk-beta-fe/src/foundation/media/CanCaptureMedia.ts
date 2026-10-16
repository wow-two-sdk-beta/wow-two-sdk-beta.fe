/**
 * Why media capture is (un)available here.
 *
 * - `supported` — `navigator.mediaDevices.getUserMedia` is present and callable.
 * - `insecure-context` — the API is absent *and* the page is known to be a non-secure context. Actionable:
 *   serve over HTTPS (or `localhost`). Distinguished from `unsupported` because the fix is completely different.
 * - `unsupported` — no API and no evidence the context is the reason: SSR, a worker, an older browser.
 */
export const MediaSupport = {
  /** `navigator.mediaDevices.getUserMedia` is present and callable. */
  Supported: 'supported',

  /** The API is absent and the page is a known non-secure context — serve over HTTPS or `localhost`. */
  InsecureContext: 'insecure-context',

  /** No API and no evidence the context is the reason: SSR, a worker, an older browser. */
  Unsupported: 'unsupported',
} as const;

/** Why media capture is (un)available here. */
export type MediaSupport = (typeof MediaSupport)[keyof typeof MediaSupport];

/**
 * Reads `navigator.mediaDevices` when it exists and carries `member` as a callable.
 *
 * Two members are asked for separately because they fail separately: a browser can expose `enumerateDevices`
 * (device *existence*, no permission needed) while `getUserMedia` is missing or blocked. Guarded end-to-end;
 * returns `undefined` under SSR. Internal to the slice — used by the sibling modules, absent from the barrel.
 *
 * @param member The method the caller is about to invoke.
 * @returns The `MediaDevices` object, or `undefined` when it or `member` is unusable.
 */
export function mediaDevicesWith(member: 'getUserMedia' | 'enumerateDevices'): MediaDevices | undefined {
  try {
    if (typeof navigator === 'undefined') return undefined;

    const devices: unknown = navigator.mediaDevices;
    if (typeof devices !== 'object' || devices === null) return undefined;

    const api = devices as MediaDevices;
    if (typeof api[member] !== 'function') return undefined;
    return api;
  } catch {
    // A throwing `navigator` / `mediaDevices` getter (a partial polyfill) reads as absent — same posture as
    // `foundation/errors`' guarded reads and `foundation/share`'s `hasNativeShare`.
    return undefined;
  }
}

/**
 * Whether the page is *known* to be a non-secure context.
 *
 * Only an explicit `false` counts. `undefined` — Node, a stripped global, an engine predating the flag — means
 * the question could not be answered, and answering "insecure" there would blame HTTP for an absent API in an
 * environment that has no HTTP at all.
 */
function isKnownInsecureContext(): boolean {
  try {
    // Read through an `unknown` cast rather than the DOM lib's `declare var isSecureContext: boolean`: outside a
    // browser the global is genuinely missing, so the typed view is a lie this module must not act on.
    const secure: unknown = (globalThis as { isSecureContext?: unknown }).isSecureContext;
    return secure === false;
  } catch {
    return false;
  }
}

/**
 * Reports whether media capture is available here, and when it is not, why.
 *
 * The `insecure-context` answer is the one worth rendering differently: it is the only reason a consumer can
 * actually act on ("this page must be served over HTTPS"), where `unsupported` is terminal for that visit.
 *
 * Never throws. Returns `unsupported` under SSR.
 */
export function getMediaSupport(): MediaSupport {
  if (mediaDevicesWith('getUserMedia') !== undefined) return MediaSupport.Supported;
  return isKnownInsecureContext() ? MediaSupport.InsecureContext : MediaSupport.Unsupported;
}

/**
 * Reports whether `requestMediaStream` and friends can reach a real `getUserMedia`.
 *
 * The boolean form of {@link getMediaSupport} — for a plain "hide the camera button" check that does not care
 * *why*. Never throws. Returns `false` under SSR.
 */
export function canCaptureMedia(): boolean {
  return getMediaSupport() === MediaSupport.Supported;
}
