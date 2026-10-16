/** Defines the foreground gradient projection — linear or radial. */
export const GradientType = {
  /** Refers to a linear (directional) gradient. */
  Linear: 'linear',
  /** Refers to a radial (center-out) gradient. */
  Radial: 'radial',
} as const;

export type GradientType = (typeof GradientType)[keyof typeof GradientType];
