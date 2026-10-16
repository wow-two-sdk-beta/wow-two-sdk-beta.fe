// `usePinch` — two-pointer scale and rotation, the one gesture in this slice that cannot reuse `useDrag`: that
// composable is single-pointer by construction (a second `pointerdown` is ignored), and a pinch is defined by the
// RELATION between two pointers rather than by either one's path.
//
// WHY A MAP KEYED BY `pointerId`: pointer events arrive interleaved and independently — two fingers produce two
// separate `pointermove` streams that share no ordering guarantee, and either may cancel alone. Tracking "finger
// one and finger two" as variables desynchronizes the moment they arrive out of order. The map is the only
// structure that answers "where is pointer 7 right now" without caring when pointer 3 last moved.
//
// SCALE AND ROTATION ARE MEASURED FROM THE PINCH'S OWN ORIGIN, not from the previous frame. Per-frame deltas
// compound their own rounding error, so a finger returning to exactly where it started would not return the
// consumer's transform to 1.0. Anchoring both to the separation and angle captured at pinch-start means the
// gesture is always reversible.
//
// A THIRD FINGER IS TRACKED BUT NOT PROMOTED. The active pair is fixed when the pinch starts; extra pointers sit
// in the map unused. When one of the pair lifts, the pinch ENDS — and immediately re-arms on the two pointers
// still down, so a hand rolling across the surface produces clean end/start pairs instead of a transform that
// teleports as the anchors silently swap underneath it.
//
// SSR: the effect is post-flush and bails on a null element, so nothing here runs on the server, and `window` is
// only ever touched from inside a `pointerdown` handler.

import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

import {
  acceptsPointerType,
  pinchRotation,
  pinchScale,
  pointerAngle,
  pointerCenter,
  pointerDistance,
  type GesturePoint,
} from '../GestureMath';

/** What a pinch handler receives — the gesture's state relative to where the pinch began. */
export interface PinchPayload {
  /** Separation now, over separation at pinch-start: `1` unchanged, `2` doubled, `0.5` halved. */
  readonly scale: number;
  /** Degrees turned since pinch-start, within `[-180, 180)`. Positive is clockwise on screen. */
  readonly rotation: number;
  /** Midpoint of the two active pointers, in viewport coordinates — the anchor to transform about. */
  readonly center: GesturePoint;
  /** The pointer event that produced this payload. */
  readonly event: PointerEvent;
}

/** The callbacks a pinch can fire. All optional. */
export interface PinchHandlers {
  /** Fired when a second pointer goes down, with `scale: 1` and `rotation: 0` — the gesture's own origin. */
  readonly onPinchStart?: (payload: PinchPayload) => void;
  /** Fired when either pointer of the active pair moves. */
  readonly onPinchMove?: (payload: PinchPayload) => void;
  /** Fired when either pointer of the active pair lifts or cancels, carrying the last computed values. */
  readonly onPinchEnd?: (payload: PinchPayload) => void;
}

/** Tunes how a pinch is recognized. */
export interface PinchOptions {
  /** Whether the gesture is inert. Checked when each pointer goes down. */
  readonly disabled?: boolean;

  /**
   * Input devices allowed to drive the pinch — in practice `'touch'` or `'pen'`, since a mouse has one pointer.
   * Omit for no filter; an empty array accepts nothing.
   */
  readonly pointerTypes?: ReadonlyArray<string>;
}

/** The fixed anchors of one in-flight pinch; `null` when fewer than two pointers are down. */
interface PinchState {
  readonly idA: number;
  readonly idB: number;
  readonly startDistance: number;
  readonly startAngle: number;
}

/**
 * Tracks a two-pointer pinch on `target`, reporting scale, rotation, and the pinch centre.
 *
 * Ignored entirely while fewer than two pointers are down. Takes the element as a ref or getter rather than
 * handing one back; options are read through `toValue` at call time. When the scope is disposed every listener is
 * detached and every held pointer capture released. Nothing throws.
 *
 * Touch pinches need `touch-action: none` on the element, or the browser claims the pointers for page zoom and
 * fires `pointercancel` mid-gesture.
 *
 * @param target The element to watch.
 * @param handlers Pinch lifecycle callbacks.
 * @param options Disabled flag and pointer-type filter.
 */
export function usePinch(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  handlers: PinchHandlers,
  options?: MaybeRefOrGetter<PinchOptions | undefined>,
): void {
  watchPostEffect((onCleanup) => {
    if (toValue(options)?.disabled === true) return;
    const current = toValue(target);
    if (!current) return;
    // Re-bound with an explicit type: TypeScript does not carry a narrowing into a hoisted function DECLARATION,
    // and every handler below is one. See the same note in `UseDrag`.
    const element: HTMLElement = current;

    /** Live position of every pointer currently down on the element, in insertion order. */
    const pointers = new Map<number, GesturePoint>();
    let state: PinchState | null = null;
    let detachWindow: (() => void) | null = null;

    /** Releases capture defensively — a pointer that already went away is not an error worth throwing on. */
    function releaseCapture(pointerId: number): void {
      try {
        if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
      } catch {
        // Capture was never held, or the pointer id is stale. Nothing to release.
      }
    }

    /** Detaches the window listeners once no pointer remains. */
    function detachIfIdle(): void {
      if (pointers.size > 0 || detachWindow === null) return;
      detachWindow();
      detachWindow = null;
    }

    /** The two oldest live pointers, or `null` when fewer than two are down. */
    function activePair(): readonly [number, number] | null {
      const iterator = pointers.keys();
      const first = iterator.next();
      const second = iterator.next();
      if (!first.done && !second.done) return [first.value, second.value];
      return null;
    }

    /** Builds a payload from the active pair's current positions, or `null` if either has gone. */
    function toPayload(active: PinchState, event: PointerEvent): PinchPayload | null {
      const a = pointers.get(active.idA);
      const b = pointers.get(active.idB);
      if (a === undefined || b === undefined) return null;
      return {
        scale: pinchScale(active.startDistance, pointerDistance(a, b)),
        rotation: pinchRotation(active.startAngle, pointerAngle(a, b)),
        center: pointerCenter(a, b),
        event,
      };
    }

    /** Arms a pinch on the two oldest live pointers, if two are down and none is already armed. */
    function tryStart(event: PointerEvent): void {
      if (state !== null) return;
      const pair = activePair();
      if (pair === null) return;
      const a = pointers.get(pair[0]);
      const b = pointers.get(pair[1]);
      if (a === undefined || b === undefined) return;

      state = {
        idA: pair[0],
        idB: pair[1],
        startDistance: pointerDistance(a, b),
        startAngle: pointerAngle(a, b),
      };
      const payload = toPayload(state, event);
      if (payload !== null) handlers.onPinchStart?.(payload);
    }

    function onPointerMove(event: PointerEvent): void {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (state === null) return;
      if (event.pointerId !== state.idA && event.pointerId !== state.idB) return; // A spectator finger moved.

      const payload = toPayload(state, event);
      if (payload !== null) handlers.onPinchMove?.(payload);
    }

    function onPointerEnd(event: PointerEvent): void {
      if (!pointers.has(event.pointerId)) return;
      const wasAnchor = state !== null && (event.pointerId === state.idA || event.pointerId === state.idB);

      // The payload is computed BEFORE the pointer leaves the map, so the end call carries the last real geometry
      // rather than a hole where one anchor used to be.
      const payload = wasAnchor && state !== null ? toPayload(state, event) : null;

      releaseCapture(event.pointerId);
      pointers.delete(event.pointerId);

      if (wasAnchor) {
        state = null;
        if (payload !== null) handlers.onPinchEnd?.(payload);
        tryStart(event); // Re-arm on whatever is still down, so a rolling hand gets clean end/start pairs.
      }
      detachIfIdle();
    }

    function onPointerDown(event: PointerEvent): void {
      if (event.button !== 0) return;
      const opts = toValue(options);
      if (opts?.disabled === true) return;
      if (!acceptsPointerType(event.pointerType, opts?.pointerTypes)) return;

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // No capture available. The window listeners below still deliver every move.
      }

      if (detachWindow === null) {
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerEnd);
        window.addEventListener('pointercancel', onPointerEnd);
        detachWindow = () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerEnd);
          window.removeEventListener('pointercancel', onPointerEnd);
        };
      }

      tryStart(event);
    }

    element.addEventListener('pointerdown', onPointerDown);
    onCleanup(() => {
      element.removeEventListener('pointerdown', onPointerDown);
      for (const pointerId of pointers.keys()) releaseCapture(pointerId);
      pointers.clear();
      state = null;
      detachIfIdle();
    });
  });
}
