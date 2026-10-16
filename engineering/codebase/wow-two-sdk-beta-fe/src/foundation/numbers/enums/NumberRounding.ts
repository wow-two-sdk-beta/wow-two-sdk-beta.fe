/** Explicit rounding direction; Half modes resolve an exact tie as named. */
export const NumberRounding = {
  AwayFromZero: 'AwayFromZero',
  TowardZero: 'TowardZero',
  Ceiling: 'Ceiling',
  Floor: 'Floor',
  HalfAwayFromZero: 'HalfAwayFromZero',
  HalfTowardZero: 'HalfTowardZero',
  HalfEven: 'HalfEven',
  HalfCeiling: 'HalfCeiling',
  HalfFloor: 'HalfFloor',
} as const;
export type NumberRounding = (typeof NumberRounding)[keyof typeof NumberRounding];
