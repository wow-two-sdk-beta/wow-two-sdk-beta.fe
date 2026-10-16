// gestures — foundation seam. Headless pointer-gesture recognizers: `useDrag` (single-pointer, with capture),
// `useSwipe` (directional flick), `useLongPress` (hold), `usePinch` (two-pointer scale + rotate), plus the pure
// math (`GestureMath`) every one of them is a thin wrapper over.
//
// HOUSE RULES, which consumers should follow too:
//
//  - POINTER EVENTS, ONE MODEL. Mouse, touch, and pen arrive on a single stream, so each gesture is written once
//    rather than as a mouse/touch pair that drifts apart. Device filtering is `pointerType` — a field the browser
//    reports about the pointer in the user's hand, not a UA string it claims about itself. There is no touch- or
//    mouse-event fallback here, and adding one would reintroduce the double-fire the pointer model exists to end.
//
//  - RECOGNITION IS ARITHMETIC, AND THE ARITHMETIC IS PURE. Direction, velocity, scale, rotation, and every
//    threshold gate live in `GestureMath` with no DOM and no Vue, because that is where gesture bugs actually
//    are — a diagonal resolving to the wrong axis, a velocity dividing by a zero interval, a rotation reporting
//    350° instead of -10°. The composables own listeners and lifecycle; they own no formulas.
//
//  - ONE POINTER CORE. `useSwipe` runs `useDrag` and reads its end payload; it is not a second recognizer. Two
//    implementations would eventually disagree about where the same finger went.
//
//  - NOTHING THROWS, AND NOTHING LEAKS. A degenerate input returns the identity answer (zero velocity, scale 1,
//    no direction) rather than an exception or a `NaN` that poisons a transform. On scope disposal every listener is
//    detached, every timer cleared, and every held pointer capture released — including mid-gesture.
//
// WHAT A CONSUMER STILL OWNS:
//  - `touch-action`. Touch drags and pinches need `touch-action: none` (or `pan-x` / `pan-y`) on the element, or
//    the browser claims the pointer for scrolling and cancels the gesture. These composables are headless and will not
//    write a style that silently disables page scroll on someone else's element.
//  - Motion. Nothing here animates, so nothing here reads `useReducedMotion` — a reported delta is a fact, not a
//    preference. A consumer that TWEENS one (spring-back, momentum, snap) owns that call and should consult
//    `foundation/device`' `useReducedMotion` at its own layer.
//
// NOT HERE, on purpose:
//  - `PressExtensions.longPressDelay` stays in `foundation/dom` and is NOT re-exported. `useLongPress` clamps
//    against it via `clampLongPressDelay` so a hold configured on a component and a hold configured through this
//    slice can never disagree; a second delay constant here would be the drift it exists to prevent.
//  - Pointer capability questions (`is this a coarse pointer`, `can it hover`) belong to `foundation/device`.
//    This slice asks what a pointer DID, never what the device IS.

// Vocabulary — the values a consumer switches on, Vue-free
export { SwipeDirection } from './enums/SwipeDirection';
export { GestureAxis } from './enums/GestureAxis';

// Pure core — the whole of the recognition arithmetic, independently testable
export {
  type GesturePoint,
  type GestureSample,
  gestureVelocity,
  windowedVelocity,
  swipeDirection,
  pointerDistance,
  pointerAngle,
  pointerCenter,
  pinchScale,
  pinchRotation,
  normalizeAngle,
  constrainToAxis,
  exceedsThreshold,
  withinTolerance,
  acceptsPointerType,
  clampLongPressDelay,
} from './GestureMath';

// Single-pointer drag — the engine `useSwipe` is built on
export { useDrag, type DragPayload, type DragHandlers, type DragOptions } from './hooks/UseDrag';

// Directional flick — distance AND velocity, over the drag core
export { useSwipe, type SwipePayload, type SwipeHandlers, type SwipeOptions } from './hooks/UseSwipe';

// Hold — delay bounded by the shared `PressExtensions.longPressDelay`
export { useLongPress, type LongPressPayload, type LongPressOptions } from './hooks/UseLongPress';

// Two-pointer scale + rotate
export { usePinch, type PinchPayload, type PinchHandlers, type PinchOptions } from './hooks/UsePinch';
