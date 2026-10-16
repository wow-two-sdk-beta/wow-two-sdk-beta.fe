// The `NavigationProgress` token pairs. React declared them inside `NavigationProgress.tsx`; they
// live in their own module here because `@vue/compiler-sfc`'s prop-type resolver is narrower than
// TypeScript's, and a prop annotated with a token type declared in the SAME SFC is the shape that
// trips it. Imported named types (the `Size` / `Orientation` pattern) resolve cleanly.

/** Defines the visual form of the navigation indicator — a slim top bar or a pulsing heartbeat. */
export const NavigationProgressVariant = {
  /** Refers to a slim indeterminate top bar. */
  Bar: 'bar',
  /** Refers to a pulsing heartbeat dot. */
  Heartbeat: 'heartbeat',
} as const;

export type NavigationProgressVariant = (typeof NavigationProgressVariant)[keyof typeof NavigationProgressVariant];

/** Defines which busy sources drive the indicator — route navigation, manual spans, or both. */
export const NavigationProgressMode = {
  /** Refers to route-navigation busy state (vue-router). */
  Auto: 'auto',
  /** Refers to manual / backend busy spans. */
  Manual: 'manual',
  /** Refers to either busy source. */
  Both: 'both',
} as const;

export type NavigationProgressMode = (typeof NavigationProgressMode)[keyof typeof NavigationProgressMode];
