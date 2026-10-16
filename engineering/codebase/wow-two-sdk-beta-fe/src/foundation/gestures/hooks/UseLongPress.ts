// `useLongPress` — fires once the pointer has been held still for long enough.
//
// THE DELAY IS NOT THIS SLICE'S TO INVENT. `PressExtensions.longPressDelay` already defines the `min` / `max` /
// `default` every press-driven component in the library honours, and `clampLongPressDelay` in `GestureMath` is the
// only place a requested delay meets those bounds. A second 500 here would be a second source of truth that drifts
// the first time one of them is tuned — a hold on a `Button` and a hold through this composable must mean the
// same thing.
//
// WHY A MOVE TOLERANCE RATHER THAN "ANY MOVEMENT CANCELS": no real touch is still. A finger resting on glass
// wanders a few pixels from tremor alone and a stylus is worse, so a zero-slack rule makes long-press fire for
// mice and almost never for the touchscreens it exists to serve. The tolerance is straight-line, not per-axis —
// a hold has no direction to be lenient about.
//
// NO POINTER CAPTURE HERE, deliberately, unlike `useDrag`. Capture exists to keep tracking a pointer that LEAVES
// the element; a hold that leaves the element is a hold that has been abandoned, and should cancel. The move and
// release listeners go on `window` precisely so that departure is observed rather than missed.
//
// SSR: the effect is post-flush and bails on a null element, so nothing here runs on the server, and `window` is
// only ever touched from inside a `pointerdown` handler.

import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

import { acceptsPointerType, clampLongPressDelay, withinTolerance } from '../GestureMath';

/** Default slack in CSS pixels — wide enough for finger tremor, tight enough that a deliberate drag cancels. */
const DefaultMoveTolerance = 10;

/** What the long-press handler receives when the hold completes. */
export interface LongPressPayload {
  /** Where the press began — `clientX` of the pointer-down, not of the moment the timer elapsed. */
  readonly x: number;
  /** Where the press began — `clientY` of the pointer-down. */
  readonly y: number;
  /**
   * The `pointerdown` event that opened the hold. There is no event for the completion itself: a timer fired, and
   * inventing a synthetic one would misreport `timeStamp` and `target`.
   */
  readonly event: PointerEvent;
}

/** Tunes how a hold is recognized. */
export interface LongPressOptions {
  /**
   * Hold duration in milliseconds before the handler fires. Defaults to `PressExtensions.longPressDelay.default`
   * and is clamped into that same shared `[min, max]` range — this composable defines no bounds of its own.
   */
  readonly delayMs?: number;

  /** CSS pixels the pointer may drift before the hold is abandoned. Defaults to `10`. */
  readonly moveTolerance?: number;

  /** Whether the gesture is inert. Checked when the pointer goes down. */
  readonly disabled?: boolean;

  /** Input devices allowed to drive the hold. Omit for no filter; an empty array accepts nothing. */
  readonly pointerTypes?: ReadonlyArray<string>;
}

/** Mutable state of one in-flight hold; `null` between presses. */
interface LongPressState {
  pointerId: number;
  originX: number;
  originY: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Fires `handler` after the pointer has been held on `target` for `delayMs` without drifting beyond
 * `moveTolerance`.
 *
 * Cancels on pointer-up, on pointer-cancel, and on any move past the tolerance. The pending timer is cleared when
 * the scope is disposed, so a component that disappears mid-hold can never fire into a dead tree.
 *
 * Takes the element as a ref or getter rather than handing one back. Options are read through `toValue` at call
 * time, so a reactive `disabled` or `delayMs` takes effect without re-attaching. Nothing throws.
 *
 * @param target The element to watch.
 * @param handler Called once when the hold completes.
 * @param options Delay, move tolerance, disabled, pointer-type filter.
 */
export function useLongPress(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  handler: (payload: LongPressPayload) => void,
  options?: MaybeRefOrGetter<LongPressOptions | undefined>,
): void {
  watchPostEffect((onCleanup) => {
    if (toValue(options)?.disabled === true) return;
    const current = toValue(target);
    if (!current) return;
    // Re-bound with an explicit type: TypeScript does not carry a narrowing into a hoisted function DECLARATION,
    // and every handler below is one. See the same note in `UseDrag`.
    const element: HTMLElement = current;

    let state: LongPressState | null = null;
    // Held so both a cancelled hold and the watcher's cleanup detach the window listeners exactly once.
    let detachWindow: (() => void) | null = null;

    /** Clears the pending timer and window listeners. The single teardown path for every outcome. */
    function cancel(): void {
      if (state !== null) {
        clearTimeout(state.timer);
        state = null;
      }
      if (detachWindow !== null) {
        detachWindow();
        detachWindow = null;
      }
    }

    function onPointerMove(event: PointerEvent): void {
      if (state === null || event.pointerId !== state.pointerId) return;
      const tolerance = toValue(options)?.moveTolerance ?? DefaultMoveTolerance;
      if (withinTolerance(event.clientX - state.originX, event.clientY - state.originY, tolerance)) return;
      cancel(); // Drifted too far — this is a drag, not a hold.
    }

    function onPointerEnd(event: PointerEvent): void {
      if (state?.pointerId === event.pointerId) cancel();
    }

    function onPointerDown(event: PointerEvent): void {
      if (event.button !== 0) return;
      const opts = toValue(options);
      if (opts?.disabled === true) return;
      if (!acceptsPointerType(event.pointerType, opts?.pointerTypes)) return;
      if (state !== null) return; // A hold is already in flight; a second pointer does not restart it.

      const delay = clampLongPressDelay(opts?.delayMs);
      const timer = setTimeout(() => {
        const payload: LongPressPayload = { x: event.clientX, y: event.clientY, event };
        // Cleared BEFORE the handler runs: the hold is complete, so a later pointer-up must find nothing to
        // cancel, and a handler that unmounts the tree must not leave a live timer behind it.
        cancel();
        handler(payload);
      }, delay);

      state = { pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, timer };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
      detachWindow = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);
      };
    }

    element.addEventListener('pointerdown', onPointerDown);
    onCleanup(() => {
      element.removeEventListener('pointerdown', onPointerDown);
      cancel(); // Torn down mid-hold: timer cleared, listeners detached.
    });
  });
}
