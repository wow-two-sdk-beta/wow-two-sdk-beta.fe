// animation — foundation seam. Imperative motion: a Web Animations API wrapper (`animate`) and the FLIP layout
// technique built on it (`measureRect` / `computeFlipTransform` / `playFlip`, the `useFlip` composable, and the
// `AnimatedLayout` container). Replaces hand-rolled `element.animate()` calls and the `requestAnimationFrame`
// tweens that appear whenever a list needs to reorder smoothly.
//
// HOUSE RULES, which consumers should follow too:
//
//  - LAYOUT, NOT PRESENCE. This slice animates elements that STAY MOUNTED and CHANGE POSITION. Enter/exit —
//    an element appearing or leaving the tree — is `foundation/primitives`' `Presence`, which defers unmount
//    until a CSS transition/animation ends. They compose: wrap a list item in `Presence` for its fade-in and
//    put the list in `AnimatedLayout` so its neighbours slide to their new places. Neither reimplements the
//    other, and nothing here holds an element mounted.
//
//  - REDUCED MOTION IS A PARAMETER, NOT A LOOKUP. Every pure entry point takes an explicit `reducedMotion`
//    option, so it stays testable (and usable) outside Vue. Only the Vue layer (`useFlip`,
//    `AnimatedLayout`) calls `foundation/device`' `useReducedMotion`, and an explicit option still overrides it.
//    Reduced motion NEVER skips the state change — it commits the final state instantly (`animate`) or leaves
//    the already-committed layout alone (`playFlip`).
//
//  - THE MATH IS PURE AND SEPARATELY TESTABLE. `computeFlipTransform` is four divisions over two plain rects,
//    exercised in the node project; the DOM shell around it is exercised in the browser project. New geometry
//    behaviour belongs in the pure function, where it can be tested without a layout engine.
//
//  - MEASURE BEFORE PAINT. Anything that snapshots geometry across an update must do it in a `flush: 'post'`
//    watcher (or `onMounted` / `onUpdated`). A rect read from a pre-flush watcher is the OLD box; one read
//    after paint makes the animation visibly jump. `useFlip` encodes this.
//
// NOT HERE, on purpose:
//  - `useReducedMotion` — it lives in `foundation/device` and is not re-exported; one export site per composable.
//  - Scroll, gesture, and media-driven motion — separate foundation seams own those inputs.
//  - Spring/physics integration and enter/exit choreography — this is the primitive layer they would build on.

export {
  animate,
  applyFinalKeyframe,
  noopAnimationHandle,
  AnimationDefaults,
  type AnimateOptions,
  type AnimationHandle,
  type AnimationKeyframes,
} from './Animate';

export {
  measureRect,
  computeFlipTransform,
  isIdentityFlip,
  formatFlipTransform,
  playFlip,
  IdentityFlipTransform,
  type FlipOptions,
  type FlipTransform,
  type RectLike,
} from './Flip';

export { useFlip, type UseFlipOptions } from './UseFlip';

export { AnimatedLayout, type AnimatedLayoutProps } from './animatedLayout';

export { TransitionExtensions } from './TransitionExtensions';
export type { PresenceAnimationDurationProp, PresenceAnimationDuration } from './TransitionExtensions';
