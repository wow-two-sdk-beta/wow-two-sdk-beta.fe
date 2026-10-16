// The axis-constraint vocabulary. Separate from the composables for the same reason as `SwipeDirection` — a pure module
// (and the threshold math in `GestureMath`) needs these values without importing Vue.
//
// An axis does TWO things at once, and both matter: it gates RECOGNITION (a vertical twitch must not start an
// `axis: 'x'` drag, or a horizontal carousel steals the page's scroll) and it constrains the REPORTED delta (the
// off-axis component is zeroed, so a consumer can bind `dx` straight to a transform without re-clamping it).

/** Which axis a gesture is constrained to. */
export const GestureAxis = {
  /** Horizontal only — vertical movement neither triggers recognition nor appears in the payload. */
  X: 'x',
  /** Vertical only — horizontal movement neither triggers recognition nor appears in the payload. */
  Y: 'y',
  /** Unconstrained — recognition uses straight-line distance and both deltas are reported. */
  Both: 'both',
} as const;

/** One of the {@link GestureAxis} values. */
export type GestureAxis = (typeof GestureAxis)[keyof typeof GestureAxis];
