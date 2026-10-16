/** The minimum a point needs to be positioned on a sphere — the input {@link distanceBetween} accepts. */
export interface LatLng {
  /** Degrees north of the equator, negative for south. */
  readonly latitude: number;

  /** Degrees east of the prime meridian, negative for west. */
  readonly longitude: number;
}

/** One fix's spatial data, flattened out of the platform's `GeolocationCoordinates`. */
export interface Coordinates extends LatLng {
  /** Radius of the 95%-confidence circle around the position, in metres. Always present; never negative. */
  readonly accuracy: number;

  /** Metres above the WGS-84 ellipsoid, or `null` where the device cannot measure altitude. */
  readonly altitude: number | null;

  /** Confidence interval on {@link Coordinates.altitude}, in metres, or `null` when altitude is `null`. */
  readonly altitudeAccuracy: number | null;

  /** Direction of travel in degrees clockwise from true north, or `null` when stationary or unmeasurable. */
  readonly heading: number | null;

  /** Ground speed in metres per second, or `null` where the device cannot measure it. */
  readonly speed: number | null;
}

/** A complete fix: where the device was, and when. The value every entry point in this slice hands back. */
export interface Position extends Coordinates {
  /** Milliseconds since the epoch at which the fix was taken — same base as `Date.now()`. */
  readonly timestamp: number;
}

/**
 * Reads one numeric field off an object of unknown provenance. Returns `null` for a missing field, a
 * non-numeric one, `NaN`/`Infinity`, or an accessor that throws — all of which mean the same thing to the
 * caller: no usable number here.
 */
function readFiniteNumber(source: object, key: string): number | null {
  try {
    const value: unknown = (source as Record<string, unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Reads a nested object field, guarded the same way. Returns `null` when it is absent or not an object. */
function readObject(source: object, key: string): object | null {
  try {
    const value: unknown = (source as Record<string, unknown>)[key];
    return typeof value === 'object' && value !== null ? value : null;
  } catch {
    return null;
  }
}

/**
 * Converts the platform's position object into a plain {@link Position}, or `null` when it carries no usable
 * fix. Exported for the sibling modules that own the platform callbacks; absent from the barrel, where a
 * consumer only ever meets the converted form.
 *
 * `latitude`, `longitude` and `accuracy` are load-bearing: without all three there is no position to report, so
 * an unreadable one collapses the whole reading to `null`. The optional channels degrade individually to
 * `null`. A missing or unreadable `timestamp` falls back to `Date.now()` — the read is happening now, and a fix
 * without a time is harder to use than one with an approximate one.
 *
 * Never throws.
 *
 * @param raw The value handed to a `getCurrentPosition` / `watchPosition` success callback.
 * @returns The plain snapshot, or `null` if no fix could be read out of it.
 */
export function toPosition(raw: unknown): Position | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const coords = readObject(raw, 'coords');
  if (coords === null) return null;

  const latitude = readFiniteNumber(coords, 'latitude');
  const longitude = readFiniteNumber(coords, 'longitude');
  const accuracy = readFiniteNumber(coords, 'accuracy');
  if (latitude === null || longitude === null || accuracy === null) return null;

  return {
    latitude,
    longitude,
    accuracy,
    altitude: readFiniteNumber(coords, 'altitude'),
    altitudeAccuracy: readFiniteNumber(coords, 'altitudeAccuracy'),
    heading: readFiniteNumber(coords, 'heading'),
    speed: readFiniteNumber(coords, 'speed'),
    timestamp: readFiniteNumber(raw, 'timestamp') ?? Date.now(),
  };
}
