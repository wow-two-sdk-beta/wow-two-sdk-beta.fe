// FLIP — First, Last, Invert, Play. The technique for animating a layout change that the browser has already
// committed: snapshot the geometry BEFORE the change ("First"), let the change happen, measure again ("Last"),
// apply the transform that visually puts the element back where it was ("Invert"), then animate that transform
// away ("Play"). The element ends at its real layout position, and only compositor-cheap `transform` was
// animated — never `top`/`left`/`width`, which reflow every frame.
//
// NON-OBVIOUS DECISIONS:
//
//  - THE MATH IS SEPARATE FROM THE DOM. `computeFlipTransform` takes two plain rects and returns four numbers.
//    That is the whole algorithm, and it is exhaustively unit-testable in node with hand-built rects — no
//    browser, no layout engine, no flake. `measureRect` and `playFlip` are the thin DOM shell around it.
//
//  - `transform-origin: top left`. The translate is derived from the rects' top-left corners, so the scale must
//    pivot there too. With the CSS default (`50% 50%`) a scaled element drifts by half the size delta and the
//    inverted frame no longer overlays the original position — the single most common FLIP bug.
//
//  - NO INLINE INVERT, NO CLEANUP. The inverted transform is the FIRST KEYFRAME, not an inline style. A
//    play-pending WAAPI animation already applies its first frame in the next style recalc, so there is no
//    unstyled flash to guard against; and with `fill: 'none'` the element is left with ZERO inline residue when
//    the animation ends or is cancelled. The inline-then-clear variant has to race its own cleanup against a
//    paint at the end and can strand a `transform` on the node if the handle is dropped.
//
//  - DIVISION IS GUARDED, ALWAYS. A "last" rect of zero width/height is routine — a `display: none` ancestor,
//    an element measured mid-unmount, a collapsed flex child. Dividing by it yields `Infinity`, which becomes
//    `scale(Infinity)`, which WAAPI rejects. Every ratio here falls back to `1` unless it is finite.

import { animate, noopAnimationHandle, type AnimateOptions, type AnimationHandle } from './Animate';

/**
 * A geometry snapshot — the fields of a `DOMRect` this slice actually uses. Deliberately a plain readonly
 * object rather than a `DOMRect`: it is structurally comparable, serializable, and constructible by hand in a
 * node test without a layout engine.
 */
export interface RectLike {
  /** Distance from the viewport's left edge, in pixels. */
  readonly x: number;
  /** Distance from the viewport's top edge, in pixels. */
  readonly y: number;
  /** Border-box width in pixels. */
  readonly width: number;
  /** Border-box height in pixels. */
  readonly height: number;
}

/** The "Invert" step's output — the transform that maps the element's new box back onto its old one. */
export interface FlipTransform {
  /** Horizontal offset in pixels (old left minus new left). */
  readonly translateX: number;
  /** Vertical offset in pixels (old top minus new top). */
  readonly translateY: number;
  /** Horizontal scale factor (old width over new width). `1` when the width did not change. */
  readonly scaleX: number;
  /** Vertical scale factor (old height over new height). `1` when the height did not change. */
  readonly scaleY: number;
}

/** Tunes a FLIP play. A subset of `AnimateOptions` — `fill`/`delay`/`iterations` are fixed by the technique. */
export type FlipOptions = Pick<AnimateOptions, 'duration' | 'easing' | 'reducedMotion'>;

/** The transform of an element that did not move or resize — the no-op FLIP. */
export const IdentityFlipTransform: FlipTransform = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
};

/** Below this, a translate (px) or a scale delta is invisible and not worth an animation. */
const FlipEpsilon = 0.01;

/** Returns `value` when it is a usable number, else `fallback` — the guard every rect field passes through. */
function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Old size over new size, guarded. Returns `1` whenever the ratio would not be a finite number — a zero-size
 * "last" rect (collapsed/hidden element) would otherwise produce `Infinity`, and a `NaN` input `NaN`.
 */
function safeScale(firstSize: number, lastSize: number): number {
  if (!Number.isFinite(firstSize) || !Number.isFinite(lastSize) || lastSize === 0) return 1;
  return finiteOr(firstSize / lastSize, 1);
}

/**
 * Snapshots an element's current viewport geometry — the "First" (and, inside `playFlip`, the "Last") step.
 *
 * Reads `left`/`top` rather than `x`/`y`: they are identical for a `getBoundingClientRect()` result (which is
 * never negative-width) and are present on every host and on hand-rolled test doubles.
 *
 * @param element The node to measure. `null`/`undefined` or a node without the method (SSR) yields `null`.
 * @returns A plain rect snapshot, or `null` when there is nothing measurable.
 */
export function measureRect(element: Element | null | undefined): RectLike | null {
  if (!element || typeof element.getBoundingClientRect !== 'function') return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

/**
 * The "Invert" step, and the whole of the FLIP algorithm: the transform that visually returns an element from
 * its `last` box to its `first` box. Pure — no DOM, no side effects, safe in node.
 *
 * Every result field is finite. Non-finite inputs and a zero-size `last` fall back to the identity component
 * (`0` for a translate, `1` for a scale) rather than propagating `Infinity`/`NaN` into a CSS transform.
 *
 * @param first Geometry before the layout change.
 * @param last Geometry after the layout change.
 * @returns The inverting translate + scale.
 */
export function computeFlipTransform(first: RectLike, last: RectLike): FlipTransform {
  return {
    translateX: finiteOr(first.x - last.x, 0),
    translateY: finiteOr(first.y - last.y, 0),
    scaleX: safeScale(first.width, last.width),
    scaleY: safeScale(first.height, last.height),
  };
}

/**
 * Whether a transform is close enough to identity that playing it would be a wasted animation.
 *
 * @param transform The computed invert.
 * @param epsilon Tolerance for sub-pixel layout noise. Defaults to `0.01`.
 * @returns `true` when the element effectively did not move or resize.
 */
export function isIdentityFlip(transform: FlipTransform, epsilon: number = FlipEpsilon): boolean {
  return (
    Math.abs(transform.translateX) < epsilon &&
    Math.abs(transform.translateY) < epsilon &&
    Math.abs(transform.scaleX - 1) < epsilon &&
    Math.abs(transform.scaleY - 1) < epsilon
  );
}

/**
 * Renders a transform as a CSS `transform` value — `translate(…px, …px) scale(…, …)`.
 *
 * Translate precedes scale on purpose: CSS applies transform functions left to right, so the element is moved
 * in its own untransformed coordinate space and the scale then pivots at `transform-origin` (`top left`).
 * Reversing them would scale the translation distance too.
 *
 * @param transform The computed invert.
 * @returns The CSS value string.
 */
export function formatFlipTransform(transform: FlipTransform): string {
  const { translateX, translateY, scaleX, scaleY } = transform;
  return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
}

/**
 * The "Last / Invert / Play" half of FLIP: measures where `element` is NOW, computes the transform back to
 * `first`, and animates that transform away to identity.
 *
 * Call it after the DOM change has been committed but before paint (a layout effect) — see `useFlip`.
 *
 * Returns a no-op handle, animating nothing, when: the element or `first` is missing; the element cannot be
 * measured; the element did not effectively move (`isIdentityFlip`); or motion is off (`reducedMotion`, or a
 * `duration` of `0`). That last case is the correct reduced-motion outcome for a LAYOUT animation — the DOM is
 * ALREADY in its final state, so doing nothing IS jumping to the final state. Unlike `animate`, no final
 * keyframe is committed inline, precisely so the element is left with no `transform` residue.
 *
 * @param element The node whose layout changed.
 * @param first The geometry snapshot taken before the change.
 * @param options Duration, easing, and the reduced-motion switch.
 * @returns A handle for the play, settled immediately when nothing was animated.
 */
export function playFlip(
  element: Element | null | undefined,
  first: RectLike | null | undefined,
  options: FlipOptions = {},
): AnimationHandle {
  if (!element || !first) return noopAnimationHandle();
  if (options.reducedMotion || (options.duration !== undefined && options.duration <= 0)) {
    return noopAnimationHandle();
  }

  const last = measureRect(element);
  if (!last) return noopAnimationHandle();

  const transform = computeFlipTransform(first, last);
  if (isIdentityFlip(transform)) return noopAnimationHandle();

  const inverted = formatFlipTransform(transform);
  return animate(
    element,
    [
      { transform: inverted, transformOrigin: 'top left' },
      { transform: 'none', transformOrigin: 'top left' },
    ],
    { duration: options.duration, easing: options.easing, fill: 'none' },
  );
}
