// The swipe vocabulary, kept in its own file so a consumer can `switch` on `SwipeDirection.Left` without pulling
// Vue into a pure module — the same value/composable split `foundation/device` uses for `PointerType` vs `UsePointer`.
//
// SCREEN AXES, NOT READING ORDER. `Up` means "toward smaller `clientY`", which is what the pointer actually did.
// A right-to-left locale does not flip these; a consumer that wants "swipe toward the start of the line" maps
// `Left`/`Right` through its own direction context. Baking RTL in here would make the same finger motion report
// two different directions depending on a document attribute the pointer knows nothing about.

/** Which way a swipe travelled, in screen coordinates. */
export const SwipeDirection = {
  /** Toward smaller `clientX` — the pointer moved left across the screen. */
  Left: 'left',
  /** Toward larger `clientX` — the pointer moved right across the screen. */
  Right: 'right',
  /** Toward smaller `clientY` — the pointer moved up the screen. */
  Up: 'up',
  /** Toward larger `clientY` — the pointer moved down the screen. */
  Down: 'down',
} as const;

/** One of the {@link SwipeDirection} values. */
export type SwipeDirection = (typeof SwipeDirection)[keyof typeof SwipeDirection];
