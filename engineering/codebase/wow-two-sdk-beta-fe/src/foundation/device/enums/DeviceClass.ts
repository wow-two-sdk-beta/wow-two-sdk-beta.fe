// The device-class vocabulary, split from its composable like `PointerType` so a consumer can compare against
// `DeviceClass.Phone` or walk `DeviceClassOrder` without pulling Vue into a pure module.

/** The three classes a product can serve a layout for. Ordered by `DeviceClassOrder`, narrowest first. */
export const DeviceClass = {
  /** A handheld screen: a narrow viewport, or a touch device turned on its side with little height left. */
  Phone: 'phone',
  /** A mid-width screen: a tablet, a small laptop window, a landscape phone with a keyboard docked. */
  Tablet: 'tablet',
  /** A wide screen, or the SSR answer where nothing is knowable yet. */
  Desktop: 'desktop',
} as const;

/** One of the {@link DeviceClass} values. */
export type DeviceClass = (typeof DeviceClass)[keyof typeof DeviceClass];

/** The classes from narrowest to widest: `phone` < `tablet` < `desktop`. A class's index is its rank. */
export const DeviceClassOrder: readonly DeviceClass[] = [DeviceClass.Phone, DeviceClass.Tablet, DeviceClass.Desktop];
