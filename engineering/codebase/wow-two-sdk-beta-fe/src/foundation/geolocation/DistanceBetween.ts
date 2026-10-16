import type { LatLng } from './models/Coordinates';

/** IUGG mean Earth radius (R₁), in metres. The sphere the haversine result is measured on. */
export const EarthRadiusMetres = 6_371_008.8;

/** Degrees → radians. */
const DegreesToRadians = Math.PI / 180;

/** Whether all four coordinate components are real numbers this can compute on. */
function isMeasurable(a: LatLng, b: LatLng): boolean {
  return (
    Number.isFinite(a.latitude) &&
    Number.isFinite(a.longitude) &&
    Number.isFinite(b.latitude) &&
    Number.isFinite(b.longitude)
  );
}

/**
 * Great-circle ("as the crow flies") distance between two points, in metres.
 *
 * Pure and symmetric — `distanceBetween(a, b) === distanceBetween(b, a)` — and exactly `0` for identical
 * points. Correct across the antimeridian and the poles without any special-casing by the caller. Accepts
 * anything with `latitude` / `longitude`, so a {@link Position} from this slice can be passed directly.
 *
 * Not road distance and not ellipsoidal: ~0.5% worst case against a geodesic solution, dominated by the
 * spherical-Earth assumption rather than by the formula. Fine for proximity, sorting, and radius filters; not
 * for surveying.
 *
 * Never throws. Returns `NaN` if any component is `NaN`, `Infinity`, or otherwise not a finite number.
 *
 * @param a One endpoint.
 * @param b The other endpoint.
 * @returns Metres along the great circle, or `NaN` for unmeasurable input.
 */
export function distanceBetween(a: LatLng, b: LatLng): number {
  if (!isMeasurable(a, b)) return Number.NaN;

  const latitudeA = a.latitude * DegreesToRadians;
  const latitudeB = b.latitude * DegreesToRadians;
  const halfLatitudeDelta = ((b.latitude - a.latitude) * DegreesToRadians) / 2;
  const halfLongitudeDelta = ((b.longitude - a.longitude) * DegreesToRadians) / 2;

  const chord =
    Math.sin(halfLatitudeDelta) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(halfLongitudeDelta) ** 2;

  const clamped = Math.min(1, Math.max(0, chord));
  return 2 * EarthRadiusMetres * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
}
