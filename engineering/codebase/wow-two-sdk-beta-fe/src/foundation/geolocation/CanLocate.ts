/**
 * Returns `navigator.geolocation` when it is present and callable, `undefined` otherwise. Exported for the
 * sibling modules, which need the object itself; absent from the barrel, where {@link canLocate} is the boolean
 * a consumer wants.
 *
 * Never throws.
 */
export function geolocationApi(): Geolocation | undefined {
  try {
    if (typeof navigator === 'undefined') return undefined;

    const geolocation: unknown = navigator.geolocation;
    if (typeof geolocation !== 'object' || geolocation === null) return undefined;
    if (typeof (geolocation as Geolocation).getCurrentPosition !== 'function') return undefined;

    return geolocation as Geolocation;
  } catch {
    return undefined;
  }
}

/**
 * Whether this environment exposes a usable Geolocation API.
 *
 * Use it to decide whether to render a "Use my location" affordance at all. It does NOT predict success: the
 * API can be present and still answer `denied` (user or policy) or `unavailable` (no fix). Treat a `false` as
 * "hide the feature" and the call's own result as "what happened".
 *
 * Never throws. Returns `false` under SSR.
 */
export function canLocate(): boolean {
  return geolocationApi() !== undefined;
}
