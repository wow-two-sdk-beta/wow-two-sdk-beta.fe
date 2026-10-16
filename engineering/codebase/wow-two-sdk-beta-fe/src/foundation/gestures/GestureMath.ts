// The pure core of the gestures slice: every recognition decision — direction, velocity, scale, rotation, and each
// threshold gate — computed from plain numbers, with no DOM, no Vue, and no time source of its own.
//
// WHY THE MATH IS SPLIT OUT AT ALL: gesture bugs are almost never listener bugs, they are ARITHMETIC bugs — a
// diagonal that resolves to the wrong axis, a velocity that divides by a zero interval, a rotation that jumps 350°
// instead of reporting -10°. Those are exactly the cases that are miserable to reach through a synthesized pointer
// stream and trivial to pin as a table of inputs. The composables in this slice are deliberately thin wrappers so that
// the part which can be exhaustively tested, is.
//
// TWO CONVENTIONS TO KNOW BEFORE READING ANY SIGNATURE:
//
//  - VELOCITY IS PX PER MILLISECOND, not px/s. Every duration in this slice arrives as `elapsedMs` (that is what
//    the event timeline hands over), so px/ms keeps the unit chain honest with no hidden ×1000. For calibration:
//    a deliberate flick lands near 0.5–2 px/ms, a slow drag well under 0.1.
//
//  - COORDINATES ARE SCREEN AXES. `y` grows DOWNWARD (the DOM's convention, not the maths class's), so a positive
//    `dy` is a downward move and `pointerAngle` rotates clockwise. Every function here follows the DOM rather than
//    silently flipping a sign, because the inputs come from `clientX`/`clientY` and the outputs go back to CSS.
//
// NOTHING HERE THROWS. A degenerate input — a zero elapsed time, a pinch that starts with both pointers on the
// same pixel, a non-finite coordinate from a synthetic event — returns the identity answer (0 velocity, scale 1,
// no direction) rather than an exception or a `NaN` that poisons a transform downstream. A gesture recognizer
// firing mid-interaction has no caller in a position to catch anything.

import { PressExtensions } from '../dom/PressExtensions';

import { GestureAxis } from './enums/GestureAxis';
import { SwipeDirection } from './enums/SwipeDirection';

/** A point in screen coordinates — `clientX` / `clientY` as reported by a pointer event. */
export interface GesturePoint {
  /** Horizontal position in CSS pixels, growing rightward. */
  readonly x: number;
  /** Vertical position in CSS pixels, growing DOWNWARD. */
  readonly y: number;
}

/** A point plus the moment it was observed — one entry in a gesture's trailing movement history. */
export interface GestureSample extends GesturePoint {
  /** Timestamp in milliseconds, from the source event's `timeStamp`. Only differences are ever used. */
  readonly t: number;
}

/** Radians-per-degree conversion, hoisted so the trig helpers don't recompute it per call. */
const DegreesPerRadian = 180 / Math.PI;

/** Guards a coordinate/delta against `NaN` and `Infinity`, which a synthetic event can carry in. */
function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Speed along one axis, in CSS pixels per millisecond.
 *
 * Returns `0` for a non-positive or non-finite interval — two pointer events can share a timestamp, and a gesture
 * must not report infinite speed because the clock did not tick.
 *
 * @param delta Distance travelled on the axis, in CSS pixels. Sign is preserved, so the result is signed too.
 * @param elapsedMs Time the movement took, in milliseconds.
 * @returns Signed velocity in px/ms; `0` when `elapsedMs <= 0`.
 */
export function gestureVelocity(delta: number, elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return finiteOrZero(delta) / elapsedMs;
}

/**
 * Velocity over the tail of a movement history, which is what "was that a flick" actually asks.
 *
 * Neither naive reading works. Measuring across the WHOLE gesture reports a fast release that followed a long
 * slow drag as slow. Measuring the LAST PAIR of samples is worse: `pointerup` repeats the final `pointermove`
 * coordinates a few milliseconds later, so a genuine flick would end at exactly zero — the single most common
 * way a swipe recognizer silently stops working. Two rules together fix both:
 *
 *  1. A TRAILING RUN OF STATIONARY SAMPLES IS TRIMMED. A sample at the same position as its predecessor carries
 *     no speed information, so measurement ends at the last point the pointer actually moved.
 *  2. UNLESS THE POINTER REALLY STOPPED. If that last moving sample is further back than the window, the trim is
 *     abandoned and the answer is zero: pressing, flicking, HOLDING, then releasing is not a flick, and rule 1
 *     alone would report the stale speed from before the hold.
 *
 * Between those, the base is the oldest sample still inside the window; when everything earlier has aged out, the
 * immediately-preceding sample is used instead, so a slow drag still reports its real (small) speed.
 *
 * @param samples Chronological history, oldest first; the last entry is treated as "now".
 * @param windowMs How far back to reach, in milliseconds.
 * @returns Signed px/ms on each axis; both `0` when fewer than two samples exist or the pointer had come to rest.
 */
export function windowedVelocity(
  samples: ReadonlyArray<GestureSample>,
  windowMs: number,
): { readonly velocityX: number; readonly velocityY: number } {
  const still = { velocityX: 0, velocityY: 0 };
  const last = samples.at(-1);
  if (last === undefined) return still;

  const limit = Number.isFinite(windowMs) ? Math.max(0, windowMs) : 0;

  // Rule 1 — walk back over samples that did not move.
  let tipIndex = samples.length - 1;
  while (tipIndex > 0) {
    const current = samples[tipIndex];
    const previous = samples[tipIndex - 1];
    if (current === undefined || previous === undefined) break;
    if (current.x !== previous.x || current.y !== previous.y) break;
    tipIndex -= 1;
  }
  const tip = samples[tipIndex];
  if (tip === undefined) return still;

  // Rule 2 — the pointer came to rest and stayed there for longer than the window.
  if (last.t - tip.t > limit) return still;

  // Chronological order means the first entry inside the window is also the oldest one inside it.
  let baseIndex = tipIndex;
  for (let index = 0; index <= tipIndex; index += 1) {
    const candidate = samples[index];
    if (candidate === undefined) continue;
    if (tip.t - candidate.t <= limit) {
      baseIndex = index;
      break;
    }
  }
  if (baseIndex === tipIndex) baseIndex -= 1; // everything earlier aged out — fall back to the previous sample

  const base = samples[baseIndex];
  if (base === undefined) return still;

  const elapsed = tip.t - base.t;
  return {
    velocityX: gestureVelocity(tip.x - base.x, elapsed),
    velocityY: gestureVelocity(tip.y - base.y, elapsed),
  };
}

/**
 * Resolves a two-axis displacement to the single direction a swipe reads as.
 *
 * The dominant axis wins. An exact diagonal (`|dx| === |dy|`, both non-zero) is broken toward the HORIZONTAL axis
 * — an arbitrary but fixed choice, made so the answer is deterministic rather than dependent on argument order;
 * a caller that needs the other bias should compare the deltas itself.
 *
 * @param dx Horizontal displacement in CSS pixels; negative is leftward.
 * @param dy Vertical displacement in CSS pixels; negative is upward.
 * @returns The dominant {@link SwipeDirection}, or `null` when there was no movement at all.
 */
export function swipeDirection(dx: number, dy: number): SwipeDirection | null {
  const x = finiteOrZero(dx);
  const y = finiteOrZero(dy);
  if (x === 0 && y === 0) return null;

  // `>=` is what implements the documented horizontal tie-break.
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? SwipeDirection.Left : SwipeDirection.Right;
  return y < 0 ? SwipeDirection.Up : SwipeDirection.Down;
}

/**
 * Straight-line distance between two points, in CSS pixels.
 *
 * @param a First point.
 * @param b Second point.
 * @returns The non-negative distance; `0` if either coordinate is non-finite.
 */
export function pointerDistance(a: GesturePoint, b: GesturePoint): number {
  return Math.hypot(finiteOrZero(b.x) - finiteOrZero(a.x), finiteOrZero(b.y) - finiteOrZero(a.y));
}

/**
 * Angle of the line from `a` to `b`, in degrees.
 *
 * Measured from the positive x-axis and rotating CLOCKWISE, because `y` grows downward on screen: `0` points
 * right, `90` points down, `-90` points up.
 *
 * @param a Origin point.
 * @param b Target point.
 * @returns The angle in degrees, within `[-180, 180]`.
 */
export function pointerAngle(a: GesturePoint, b: GesturePoint): number {
  const dx = finiteOrZero(b.x) - finiteOrZero(a.x);
  const dy = finiteOrZero(b.y) - finiteOrZero(a.y);
  return Math.atan2(dy, dx) * DegreesPerRadian;
}

/**
 * Midpoint of two points — the anchor a pinch should scale and rotate about.
 *
 * @param a First point.
 * @param b Second point.
 * @returns The midpoint in the same screen coordinates.
 */
export function pointerCenter(a: GesturePoint, b: GesturePoint): GesturePoint {
  return {
    x: (finiteOrZero(a.x) + finiteOrZero(b.x)) / 2,
    y: (finiteOrZero(a.y) + finiteOrZero(b.y)) / 2,
  };
}

/**
 * Scale factor of a pinch — how far apart the two pointers are now, relative to where they started.
 *
 * `1` means unchanged, `2` means the fingers doubled their separation, `0.5` means they halved it.
 *
 * Returns `1` for a non-positive starting distance: two pointers that went down on the same pixel define no
 * baseline to scale against, and dividing by it would hand a consumer `Infinity` to write into a transform.
 *
 * @param startDistance Separation when the pinch began, in CSS pixels.
 * @param currentDistance Separation now, in CSS pixels.
 * @returns The multiplicative scale factor; `1` when no valid baseline exists.
 */
export function pinchScale(startDistance: number, currentDistance: number): number {
  if (!Number.isFinite(startDistance) || startDistance <= 0) return 1;
  return finiteOrZero(currentDistance) / startDistance;
}

/**
 * Signed rotation of a pinch, in degrees, taking the shortest way round.
 *
 * Crossing the ±180° seam is the whole reason this is not a subtraction: a pointer pair rotating from 170° to
 * -170° turned 20° clockwise, not 340° counter-clockwise.
 *
 * @param startAngle Angle between the pointers when the pinch began, in degrees.
 * @param currentAngle Angle between them now, in degrees.
 * @returns The rotation in degrees within `[-180, 180)`; positive is clockwise on screen.
 */
export function pinchRotation(startAngle: number, currentAngle: number): number {
  return normalizeAngle(finiteOrZero(currentAngle) - finiteOrZero(startAngle));
}

/**
 * Wraps an arbitrary angle into a single turn.
 *
 * @param degrees Any angle, including multiples of a full turn.
 * @returns The equivalent angle within `[-180, 180)` — note `180` normalizes to `-180`.
 */
export function normalizeAngle(degrees: number): number {
  const value = finiteOrZero(degrees);
  // Double-modulo: the inner one can go negative in JS, the `+ 360` pass fixes that before re-centring on zero.
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

/**
 * Zeroes the component a constrained gesture must not report, so a consumer can bind the payload straight to a
 * transform without re-clamping it.
 *
 * @param dx Horizontal displacement in CSS pixels.
 * @param dy Vertical displacement in CSS pixels.
 * @param axis The axis the gesture is locked to.
 * @returns The displacement with the off-axis component set to `0`.
 */
export function constrainToAxis(
  dx: number,
  dy: number,
  axis: GestureAxis,
): { readonly dx: number; readonly dy: number } {
  const x = finiteOrZero(dx);
  const y = finiteOrZero(dy);
  if (axis === GestureAxis.X) return { dx: x, dy: 0 };
  if (axis === GestureAxis.Y) return { dx: 0, dy: y };
  return { dx: x, dy: y };
}

/**
 * Whether a displacement has travelled far enough to count, measured along the gesture's own axis.
 *
 * This is the gate that stops a drag from stealing a click: below the threshold the pointer is still "pressing",
 * not "dragging". An unconstrained gesture measures straight-line distance; a constrained one measures only its
 * axis, so a vertical scroll never trips an `axis: 'x'` drag.
 *
 * A threshold of `0` always passes — that is the documented way to recognize on pointer-down.
 *
 * @param dx Horizontal displacement in CSS pixels.
 * @param dy Vertical displacement in CSS pixels.
 * @param threshold Distance in CSS pixels that must be met or exceeded. Non-finite is treated as `0`.
 * @param axis The axis the gesture is locked to.
 * @returns `true` once the displacement reaches the threshold.
 */
export function exceedsThreshold(dx: number, dy: number, threshold: number, axis: GestureAxis): boolean {
  const limit = Number.isFinite(threshold) ? Math.max(0, threshold) : 0;
  const x = finiteOrZero(dx);
  const y = finiteOrZero(dy);
  if (axis === GestureAxis.X) return Math.abs(x) >= limit;
  if (axis === GestureAxis.Y) return Math.abs(y) >= limit;
  return Math.hypot(x, y) >= limit;
}

/**
 * Whether a pointer has stayed still enough for a hold to survive — the inverse gate to {@link exceedsThreshold},
 * and always measured as straight-line distance because a hold is not directional.
 *
 * @param dx Horizontal displacement in CSS pixels since the press began.
 * @param dy Vertical displacement in CSS pixels since the press began.
 * @param tolerance Slack in CSS pixels, to absorb the finger tremor every real touch carries. Non-finite is `0`.
 * @returns `true` while the pointer remains within tolerance.
 */
export function withinTolerance(dx: number, dy: number, tolerance: number): boolean {
  const limit = Number.isFinite(tolerance) ? Math.max(0, tolerance) : 0;
  return Math.hypot(finiteOrZero(dx), finiteOrZero(dy)) <= limit;
}

/**
 * Applies a `pointerTypes` allowlist to one pointer.
 *
 * `undefined` means no filter — every input device is accepted. An EMPTY array is read literally as "accept
 * nothing" rather than being quietly upgraded to "accept everything": an allowlist that arrived empty from a
 * caller's own filtering should visibly disable the gesture, not silently widen it.
 *
 * @param pointerType The event's `pointerType` — conventionally `'mouse'`, `'touch'`, or `'pen'`.
 * @param allowed The allowlist, or `undefined` for no filtering.
 * @returns `true` when this pointer may drive the gesture.
 */
export function acceptsPointerType(pointerType: string, allowed: ReadonlyArray<string> | undefined): boolean {
  if (allowed === undefined) return true;
  return allowed.includes(pointerType);
}

/**
 * Clamps a long-press delay into the shared `PressExtensions.longPressDelay` bounds.
 *
 * The bounds are NOT redefined here — they are the same `min` / `max` / `default` every other press-driven
 * component in the library already honours, so a hold configured on a `Button` and a hold configured through
 * `useLongPress` can never disagree about what counts as "too fast to be deliberate".
 *
 * @param delayMs The requested delay in milliseconds; `undefined` or non-finite falls back to the shared default.
 * @returns A delay within `[min, max]`.
 */
export function clampLongPressDelay(delayMs: number | undefined): number {
  const bounds = PressExtensions.longPressDelay;
  if (delayMs === undefined || !Number.isFinite(delayMs)) return bounds.default;
  return Math.min(bounds.max, Math.max(bounds.min, delayMs));
}
