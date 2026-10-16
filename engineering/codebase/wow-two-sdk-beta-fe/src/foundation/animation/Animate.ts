// The WAAPI seam of the animation vector — one way to start an animation, one handle shape to control it.
//
// WHY a wrapper at all, when `element.animate()` already exists:
//
//  - THREE FAILURE MODES COLLAPSE INTO ONE PATH. A null element (SSR, an unattached ref), a host without WAAPI
//    (Safari < 13.1, jsdom), and a reduced-motion user all want the same outcome: the state change lands, the
//    tween does not. Each caller would otherwise re-derive that branch — and most would forget one of the three.
//
//  - `finished` NEVER REJECTS. The native `Animation.finished` promise rejects with an `AbortError` when the
//    animation is cancelled, so every `await` needs a try/catch and every un-awaited handle risks an unhandled
//    rejection. Here `finished` SETTLES — on finish, on cancel, or on browser removal — because the only thing
//    callers actually want to know is "the animation is no longer running, run cleanup". It resolves `void`; a
//    caller that must distinguish the two reads the element's state, not the promise.
//
//  - DURATION 0 IS THE REDUCED-MOTION CONTRACT. `reducedMotion: true` and `duration: 0` take the exact same
//    branch: commit the final keyframe synchronously and return a settled handle. Reduced motion means "skip the
//    tween", never "skip the state change" — an element that was going to end up opaque still ends up opaque.
//
// `reducedMotion` is an explicit OPTION, not a `useReducedMotion()` call inside. That keeps `animate` a pure
// function usable outside Vue (an imperative controller, a node test) and leaves exactly one place — the
// composable layer — that reads the media query. See `UseFlip.ts` for the Vue side that wires the two together.

import { TransitionExtensions } from './TransitionExtensions';

/** A keyframe list (`[{ opacity: '0' }, { opacity: '1' }]`) or a property-indexed map (`{ opacity: ['0', '1'] }`). */
export type AnimationKeyframes = Keyframe[] | PropertyIndexedKeyframes;

/** Tunes a single `animate()` call. Mirrors the subset of `KeyframeAnimationOptions` this slice commits to. */
export interface AnimateOptions {
  /** Run length in milliseconds. `0` (or less) commits the final keyframe instantly. Defaults to `200`. */
  readonly duration?: number;

  /** CSS easing function (`'ease-out'`, a `cubic-bezier(…)`). Defaults to the house ease-out curve. */
  readonly easing?: string;

  /** Milliseconds to wait before the first frame. Defaults to `0`. */
  readonly delay?: number;

  /** Whether the animated values persist outside the active window. Defaults to `'none'` — no style residue. */
  readonly fill?: FillMode;

  /** How many times the keyframes run. Defaults to `1`. */
  readonly iterations?: number;

  /** When `true`, skip the tween and commit the final keyframe immediately. Defaults to `false`. */
  readonly reducedMotion?: boolean;
}

/** The control surface returned by every entry point in this slice. Always safe to call, even on a no-op handle. */
export interface AnimationHandle {
  /**
   * Settles when the animation stops running — finished, cancelled, or removed by the browser.
   * Never rejects, so it is safe to `await` without a try/catch and safe to ignore entirely.
   */
  readonly finished: Promise<void>;

  /** Stops the animation and reverts to the element's own styles. Settles `finished`. */
  cancel(): void;

  /** Jumps to the end of the animation. No-op on an infinite-iteration animation, which cannot finish. */
  finish(): void;

  /** Suspends playback at the current time. */
  pause(): void;

  /** Resumes playback (or restarts a finished animation). */
  play(): void;
}

/**
 * Motion defaults for the slice. `duration` reuses `TransitionExtensions.duration.default` (200ms) — the
 * single existing motion constant in this codebase — so a WAAPI tween and a CSS presence transition agree.
 * `easing` mirrors Tailwind's `ease-out` (the curve `ScrollViewport` already animates with); there is no
 * easing token in `foundation/themes` to consume, so this is the slice's declaration of one.
 */
export const AnimationDefaults = {
  /** Default run length in milliseconds. */
  duration: TransitionExtensions.duration.default,
  /** Default easing curve — Tailwind `ease-out`. */
  easing: 'cubic-bezier(0, 0, 0.2, 1)',
} as const;

/** Keyframe keys that configure the frame rather than name a CSS property — never written to `style`. */
const NonStyleKeyframeKeys: ReadonlySet<string> = new Set(['offset', 'easing', 'composite']);

const noop = (): void => {};

/**
 * An already-settled handle for the paths that never start an animation (no element, no WAAPI, reduced motion,
 * a no-op FLIP). Callers branch on nothing — `await handle.finished` resolves and `cancel()` is harmless.
 */
export function noopAnimationHandle(): AnimationHandle {
  return { finished: Promise.resolve(), cancel: noop, finish: noop, pause: noop, play: noop };
}

/**
 * The element's inline style declaration, or `null` for a node that has none (a bare `Element`, a text node
 * reached through a loose cast). `HTMLElement` and `SVGElement` both qualify; nothing else is assumed.
 */
export function inlineStyleOf(element: Element): CSSStyleDeclaration | null {
  const styled = element as Partial<ElementCSSInlineStyle>;
  return styled.style ?? null;
}

/** Writes one CSS property inline, routing custom (`--x`) and kebab-case names through `setProperty`. */
function setStyleProperty(style: CSSStyleDeclaration, property: string, value: string): void {
  if (property.includes('-')) {
    style.setProperty(property, value);
    return;
  }
  // camelCase names (`backgroundColor`) are accessors on the declaration, not `setProperty` keys.
  (style as unknown as Record<string, string>)[property] = value;
}

/** Reads the last defined value of a property-indexed keyframe entry (`['0', '1']` → `'1'`; `'1'` → `'1'`). */
function lastValueOf(value: string | string[] | number | null | (number | null)[] | undefined) {
  return Array.isArray(value) ? value.at(-1) : value;
}

/**
 * Commits the final frame of `keyframes` as inline styles — the instant-jump branch shared by reduced motion,
 * `duration: 0`, and hosts without WAAPI. Frame-config keys (`offset`/`easing`/`composite`) and `null` values
 * are skipped; a `null` in a keyframe means "use the underlying value", which is what NOT writing achieves.
 */
export function applyFinalKeyframe(element: Element, keyframes: AnimationKeyframes): void {
  const style = inlineStyleOf(element);
  if (!style) return;

  if (Array.isArray(keyframes)) {
    const last = keyframes.at(-1);
    if (!last) return;
    for (const [property, value] of Object.entries(last)) {
      if (NonStyleKeyframeKeys.has(property) || value === null || value === undefined) continue;
      setStyleProperty(style, property, String(value));
    }
    return;
  }

  for (const [property, value] of Object.entries(keyframes)) {
    if (NonStyleKeyframeKeys.has(property)) continue;
    const resolved = lastValueOf(value);
    if (resolved === null || resolved === undefined) continue;
    setStyleProperty(style, property, String(resolved));
  }
}

/**
 * Animates `element` through `keyframes` and returns a handle to control it.
 *
 * Falls back to committing the final keyframe instantly — with a settled handle, never a throw — when the
 * element is missing, the host has no `element.animate`, `reducedMotion` is set, or `duration` is `0`.
 *
 * @param element The target node. `null`/`undefined` (SSR, an unattached ref) yields a no-op handle.
 * @param keyframes The frames to run, in either WAAPI shape.
 * @param options Timing and the reduced-motion switch.
 * @returns A handle whose `finished` promise settles when the animation stops running.
 */
export function animate(
  element: Element | null | undefined,
  keyframes: AnimationKeyframes,
  options: AnimateOptions = {},
): AnimationHandle {
  if (!element) return noopAnimationHandle();

  const {
    duration = AnimationDefaults.duration,
    easing = AnimationDefaults.easing,
    delay = 0,
    fill = 'none',
    iterations = 1,
    reducedMotion = false,
  } = options;

  if (reducedMotion || duration <= 0 || typeof element.animate !== 'function') {
    applyFinalKeyframe(element, keyframes);
    return noopAnimationHandle();
  }

  const animation = element.animate(keyframes, { duration, easing, delay, fill, iterations });

  // Event-based rather than `animation.finished`, whose rejection on cancel would surface as an unhandled
  // rejection for any caller that does not await. Subscribing synchronously after `animate()` cannot miss an
  // event — the animation is play-pending until at least the next frame.
  const finished = new Promise<void>((resolve) => {
    const settle = (): void => resolve();
    animation.addEventListener('finish', settle, { once: true });
    animation.addEventListener('cancel', settle, { once: true });
    animation.addEventListener('remove', settle, { once: true });
  });

  return {
    finished,
    cancel: () => animation.cancel(),
    finish: () => {
      try {
        animation.finish();
      } catch {
        // `finish()` throws InvalidStateError on an infinite-iteration animation, which has no end to jump to.
      }
    },
    pause: () => animation.pause(),
    play: () => animation.play(),
  };
}
