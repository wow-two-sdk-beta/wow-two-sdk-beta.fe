// `useSwipe` — a flick recognizer that is deliberately NOT its own pointer implementation. It runs `useDrag` with
// a zero threshold and reads the end payload; every listener, the capture handling, the pointer-type filter, and
// the velocity window all come from there. A second listener stack would be a second set of edge cases (a pointer
// that cancels, a drag that outlives its element) resolved slightly differently, and the two recognizers would
// eventually disagree about where the same finger went.
//
// A SWIPE IS DISTANCE **AND** SPEED, both required. Distance alone promotes a slow deliberate drag into a flick,
// which is how a carousel ends up advancing when the user was carefully positioning something. Speed alone
// promotes a 3px twitch. Requiring both is what makes the gesture mean "thrown", and it is why the two thresholds
// are separate knobs rather than one blended score a consumer could not reason about.
//
// ONE DIRECTION PER GESTURE, resolved at release from the total displacement — not accumulated per move. A finger
// that arcs out and back reports where it ENDED relative to where it began, which is the thing the user meant.

import { toValue, type MaybeRefOrGetter } from 'vue';

import { GestureAxis } from '../enums/GestureAxis';
import { swipeDirection } from '../GestureMath';
import { SwipeDirection } from '../enums/SwipeDirection';
import { useDrag, type DragPayload } from './UseDrag';

/** Default travel required before a flick counts, in CSS pixels — roughly a thumb's comfortable arc. */
const DefaultSwipeThreshold = 50;

/** Default speed required, in px/ms (300 px/s) — above a deliberate drag, below a hurried one. */
const DefaultVelocityThreshold = 0.3;

/** What `onSwipe` receives once a flick is recognized. */
export interface SwipePayload {
  /** Which way the flick went, from the total displacement between press and release. */
  readonly direction: SwipeDirection;
  /** How far it travelled ALONG that direction's axis, in CSS pixels. Always positive. */
  readonly distance: number;
  /** Release speed along that same axis, in px/ms, over the recent movement window. Always positive. */
  readonly velocity: number;
  /** The pointerup event that completed the gesture; cancelled pointers never produce a swipe. */
  readonly event: PointerEvent;
}

/** The callbacks a swipe can fire. */
export interface SwipeHandlers {
  /** Fired once per gesture, at release, only when both the distance and velocity thresholds are met. */
  readonly onSwipe?: (payload: SwipePayload) => void;
}

/** Tunes how a flick is recognized. */
export interface SwipeOptions {
  /** CSS pixels the pointer must travel along the swipe axis. Defaults to `50`. */
  readonly threshold?: number;

  /** Speed in px/ms the pointer must still carry at release. Defaults to `0.3` (300 px/s). */
  readonly velocityThreshold?: number;

  /**
   * Axis to restrict recognition to. `'x'` reports only `'left'` / `'right'`, `'y'` only `'up'` / `'down'`.
   * Defaults to `'both'`.
   */
  readonly axis?: GestureAxis;

  /** Whether the gesture is inert. Checked when the pointer goes down. */
  readonly disabled?: boolean;

  /** Input devices allowed to drive the swipe. Omit for no filter; see {@link useDrag} for the empty-array rule. */
  readonly pointerTypes?: ReadonlyArray<string>;
}

/**
 * Recognizes a directional flick on `target`.
 *
 * Built on {@link useDrag}, so it inherits pointer capture, the pointer-type filter, and the same cleanup
 * guarantees: on scope disposal every listener is detached and any capture released. Nothing throws.
 *
 * @param target The element to watch, as a ref or getter.
 * @param handlers Swipe callbacks.
 * @param options Distance / velocity thresholds, axis, disabled, pointer-type filter.
 */
export function useSwipe(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  handlers: SwipeHandlers,
  options?: MaybeRefOrGetter<SwipeOptions | undefined>,
): void {
  useDrag(
    target,
    {
      onDragEnd: (payload: DragPayload): void => {
        if (payload.event.type === 'pointercancel') return;
        const opts = toValue(options);
        const direction = swipeDirection(payload.dx, payload.dy);
        if (direction === null) return; // Pressed and released without moving — not a swipe.

        const horizontal = direction === SwipeDirection.Left || direction === SwipeDirection.Right;
        const distance = Math.abs(horizontal ? payload.dx : payload.dy);
        const velocity = Math.abs(horizontal ? payload.velocityX : payload.velocityY);

        const threshold = opts?.threshold ?? DefaultSwipeThreshold;
        const velocityThreshold = opts?.velocityThreshold ?? DefaultVelocityThreshold;
        if (distance < threshold || velocity < velocityThreshold) return;

        handlers.onSwipe?.({ direction, distance, velocity, event: payload.event });
      },
    },
    // A getter, so the drag re-reads the swipe's own axis / disabled / pointer-type values live rather than
    // pinning whatever they were at setup.
    () => ({
      // Zero threshold so the underlying drag tracks from first contact: the swipe's own distance gate is what
      // decides, and a drag-level threshold would only subtract from the displacement measured here.
      threshold: 0,
      axis: toValue(options)?.axis ?? GestureAxis.Both,
      disabled: toValue(options)?.disabled,
      pointerTypes: toValue(options)?.pointerTypes,
    }),
  );
}
