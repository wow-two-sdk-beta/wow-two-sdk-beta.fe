// `useDrag` — the single-pointer engine the rest of this slice is built on. `useSwipe` is a thin reading of this
// composable's end payload rather than a second recognizer, so the two can never disagree about where a pointer
// went.
//
// WHY POINTER EVENTS AND NOTHING ELSE: a mouse/touch pair means writing the gesture twice, then discovering the
// two disagree — touch fires a compatibility mouse sequence after every tap, `touchmove` has no capture model,
// and a stylus is a third case both miss. `PointerEvent` is one stream for mouse, touch, and pen, carries the
// device in `pointerType` (so an allowlist is a field read, not a UA sniff), and is the only one of the three with
// `setPointerCapture`. There is no legacy fallback here on purpose: every browser this library targets ships it.
//
// WHY CAPTURE **AND** WINDOW LISTENERS — the non-obvious part. `setPointerCapture` keeps the element as the event
// TARGET once the pointer wanders off it, which is what a consumer reading `event.target` expects and what stops
// another element's hit-testing from interfering mid-drag. What it does not do is survive its own absence: if the
// call fails (a stale pointer id, a test DOM without the method), events would simply stop arriving and the drag
// would freeze mid-gesture with a consumer stuck in its dragging state. So the move/up/cancel listeners are bound
// to `window` for the lifetime of the gesture — they arrive with or without capture — and capture is requested on
// top for its targeting. Belt and braces, one set of listeners, no double-fire.
//
// SSR: the effect is post-flush and bails on a null element, so nothing here runs on the server — there is no
// element to bind to. `window` is only ever touched from inside a `pointerdown` handler, which by construction
// cannot fire outside a browser.
//
// TOUCH NEEDS `touch-action` — the one thing a consumer must do. The browser claims a touch pointer for scrolling
// and then fires `pointercancel`, killing the drag mid-stroke. Set `touch-action: none` on the draggable element
// (or `pan-y` / `pan-x` when only one axis is yours). This slice deliberately does not write the style itself: it
// is headless, and silently blocking page scroll on a consumer's element is not a decision a composable should
// make.
//
// NOTHING HERE ANIMATES, so nothing here consults `useReducedMotion` — these composables report where a pointer
// went, which is a fact, not a motion preference. A consumer that TWEENS the reported delta (spring-back,
// momentum, snap) owns that call and should read `foundation/device`' `useReducedMotion` at its own layer.

import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

import { GestureAxis } from '../enums/GestureAxis';
import {
  acceptsPointerType,
  constrainToAxis,
  exceedsThreshold,
  windowedVelocity,
  type GestureSample,
} from '../GestureMath';

/** How many trailing samples to retain for the velocity window — see `VelocityWindowMs`. */
const MaxSamples = 16;

/**
 * Velocity is measured over the last ~80ms of movement, not over the whole gesture and not over the single last
 * event. Whole-gesture would report a flick that followed a long slow drag as slow. The single last event is
 * worse: `pointerup` usually repeats the final `pointermove` coordinates a few milliseconds later, so a genuine
 * flick would release at a velocity of zero. A short trailing window is what makes "was that a flick" answerable.
 */
const VelocityWindowMs = 80;

/** What a drag handler receives — the full state of the gesture at the moment of the call. */
export interface DragPayload {
  /** Horizontal distance from the press origin, in CSS pixels. Zeroed when `axis` is `'y'`. */
  readonly dx: number;
  /** Vertical distance from the press origin, in CSS pixels. Zeroed when `axis` is `'x'`. */
  readonly dy: number;
  /** Current pointer position — the event's `clientX`, viewport-relative and never axis-constrained. */
  readonly x: number;
  /** Current pointer position — the event's `clientY`, viewport-relative and never axis-constrained. */
  readonly y: number;
  /** Horizontal speed in px/ms over the recent movement window, NOT over the whole drag. Signed. */
  readonly velocityX: number;
  /** Vertical speed in px/ms over the recent movement window, NOT over the whole drag. Signed. */
  readonly velocityY: number;
  /** Milliseconds since the pointer went down — the whole gesture, unlike the velocity fields. */
  readonly elapsedMs: number;
  /** The DOM pointer event that produced this payload, for `preventDefault`, modifier keys, or `pointerType`. */
  readonly event: PointerEvent;
}

/** The callbacks a drag can fire. Every one is optional. */
export interface DragHandlers {
  /**
   * Fired once the drag is recognized — immediately on pointer-down when `threshold` is `0`, otherwise on the
   * first move that clears it.
   */
  readonly onDragStart?: (payload: DragPayload) => void;
  /** Fired on each subsequent pointer move while the drag is active. */
  readonly onDragMove?: (payload: DragPayload) => void;
  /**
   * Fired on pointer-up or pointer-cancel, but ONLY if the drag was recognized — a press that never cleared the
   * threshold produces no start and therefore no end. Read `event.type` to tell a completion from a cancellation.
   */
  readonly onDragEnd?: (payload: DragPayload) => void;
}

/** Tunes how a drag is recognized. */
export interface DragOptions {
  /**
   * CSS pixels the pointer must travel before the drag is recognized. Defaults to `0` — recognized on
   * pointer-down.
   *
   * Raise it to a few pixels whenever the same element is also clickable: below the threshold the interaction
   * stays a press, so a click survives the hand tremor that accompanies every real tap.
   */
  readonly threshold?: number;

  /** Axis the drag is locked to — gates recognition AND zeroes the off-axis delta. Defaults to `'both'`. */
  readonly axis?: GestureAxis;

  /**
   * Whether the drag is inert. Checked when the pointer goes DOWN; a gesture already in flight completes normally
   * rather than stranding a consumer mid-drag with no `onDragEnd`.
   */
  readonly disabled?: boolean;

  /**
   * Input devices allowed to drive the drag — conventionally `'mouse'`, `'touch'`, `'pen'`. Omit for no filter.
   * An empty array accepts nothing, which is the literal reading and makes an accidentally-empty list obvious.
   */
  readonly pointerTypes?: ReadonlyArray<string>;
}

/** Mutable state of one in-flight drag; `null` between gestures. */
interface DragState {
  pointerId: number;
  originX: number;
  originY: number;
  startTime: number;
  recognized: boolean;
  samples: GestureSample[];
}

/**
 * Tracks a single-pointer drag on `target`, reporting distance, position, and recent velocity.
 *
 * Takes the element as a ref or getter rather than handing one back, so the caller keeps ownership of its
 * `useTemplateRef`. Options are read through `toValue` at call time, so a reactive `disabled` or `axis` takes
 * effect without re-attaching the listener; only the element identity re-binds. When the scope is disposed every
 * listener is detached and any held pointer capture released.
 *
 * Nothing throws: a missing element, an unavailable `setPointerCapture`, or a pointer that vanishes without an
 * up event all resolve quietly.
 *
 * @param target The element to watch. A `null` value simply binds nothing.
 * @param handlers Drag lifecycle callbacks.
 * @param options Recognition tuning — threshold, axis, disabled, pointer-type filter.
 */
export function useDrag(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  handlers: DragHandlers,
  options?: MaybeRefOrGetter<DragOptions | undefined>,
): void {
  watchPostEffect((onCleanup) => {
    if (toValue(options)?.disabled === true) return;
    const current = toValue(target);
    if (!current) return;
    // Re-bound with an explicit type: TypeScript does not carry a narrowing into a hoisted function DECLARATION
    // (it cannot prove the declaration is not called before the guard), and every handler below is one. The alias
    // is what keeps the listeners free of `element!` and repeated null checks.
    const element: HTMLElement = current;

    let state: DragState | null = null;
    // Held so both the gesture's own end and the watcher's cleanup can detach the window listeners exactly once.
    let detachWindow: (() => void) | null = null;

    /** Builds the payload shared by every handler call, applying the axis constraint to deltas and velocity. */
    function toPayload(active: DragState, event: PointerEvent): DragPayload {
      const axis = toValue(options)?.axis ?? GestureAxis.Both;
      const { dx, dy } = constrainToAxis(event.clientX - active.originX, event.clientY - active.originY, axis);
      const velocity = windowedVelocity(active.samples, VelocityWindowMs);
      const constrainedVelocity = constrainToAxis(velocity.velocityX, velocity.velocityY, axis);
      return {
        dx,
        dy,
        x: event.clientX,
        y: event.clientY,
        velocityX: constrainedVelocity.dx,
        velocityY: constrainedVelocity.dy,
        elapsedMs: event.timeStamp - active.startTime,
        event,
      };
    }

    /** Appends a sample, dropping the oldest once the window can no longer need it. */
    function sample(active: DragState, event: PointerEvent): void {
      active.samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
      if (active.samples.length > MaxSamples) active.samples.shift();
    }

    /** Releases capture defensively — the pointer may already be gone, which is not an error worth throwing on. */
    function releaseCapture(pointerId: number): void {
      try {
        if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
      } catch {
        // Capture was never held, or the pointer id is stale. Either way there is nothing to release.
      }
    }

    /** Tears down one gesture: window listeners off, capture released, state cleared. */
    function finish(): void {
      if (detachWindow !== null) {
        detachWindow();
        detachWindow = null;
      }
      if (state !== null) releaseCapture(state.pointerId);
      state = null;
    }

    function onPointerMove(event: PointerEvent): void {
      if (state === null || event.pointerId !== state.pointerId) return;
      sample(state, event);

      if (!state.recognized) {
        const axis = toValue(options)?.axis ?? GestureAxis.Both;
        const threshold = toValue(options)?.threshold ?? 0;
        const rawDx = event.clientX - state.originX;
        const rawDy = event.clientY - state.originY;
        if (!exceedsThreshold(rawDx, rawDy, threshold, axis)) return;
        state.recognized = true;
        handlers.onDragStart?.(toPayload(state, event));
        return; // The move that starts a drag is the start, not also a move.
      }

      handlers.onDragMove?.(toPayload(state, event));
    }

    function onPointerEnd(event: PointerEvent): void {
      if (state === null || event.pointerId !== state.pointerId) return;
      sample(state, event);
      const recognized = state.recognized;
      const payload = toPayload(state, event);
      finish();
      // Fired after teardown so a handler that starts a new gesture (or unmounts) finds clean state.
      if (recognized) handlers.onDragEnd?.(payload);
    }

    function onPointerDown(event: PointerEvent): void {
      if (event.button !== 0) return;
      const opts = toValue(options);
      if (opts?.disabled === true) return;
      if (!acceptsPointerType(event.pointerType, opts?.pointerTypes)) return;
      if (state !== null) return; // Single-pointer gesture — a second finger belongs to `usePinch`, not here.

      state = {
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        startTime: event.timeStamp,
        recognized: false,
        samples: [{ x: event.clientX, y: event.clientY, t: event.timeStamp }],
      };

      // Requested at DOWN, not at recognition: a fast flick can leave the element before the threshold is even
      // cleared, and capture has to already be in place for the element to stay the target when it does.
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // No capture available (stale pointer, or a DOM without the method). The window listeners below still
        // deliver every move, so the drag degrades to "works, but `event.target` may not be this element".
      }

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
      detachWindow = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);
      };

      const threshold = opts?.threshold ?? 0;
      // A zero threshold means "recognized on contact" — fire the start now rather than waiting for a move that
      // a tap-and-hold would never produce.
      if (threshold <= 0) {
        state.recognized = true;
        handlers.onDragStart?.(toPayload(state, event));
      }
    }

    element.addEventListener('pointerdown', onPointerDown);
    onCleanup(() => {
      element.removeEventListener('pointerdown', onPointerDown);
      finish(); // Torn down mid-drag: window listeners off and capture released, no dangling gesture.
    });
  });
}
