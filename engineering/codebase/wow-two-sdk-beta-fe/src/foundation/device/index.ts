export { PointerType } from './enums/PointerType';
export { usePointerType, useHoverCapability } from './hooks/UsePointer';

export { useOnlineStatus } from './hooks/UseOnlineStatus';

export { DisplayMode } from './enums/DisplayMode';
export { useDisplayMode, useIsInstalled } from './hooks/UseDisplayMode';

export { Platform, getPlatform } from './Platform';

export {
  type BreakpointScale,
  type BreakpointQuery,
  TailwindBreakpoints,
  toBreakpointQueries,
  resolveBreakpoint,
} from './Breakpoints';
export { useBreakpoint } from './hooks/UseBreakpoint';
export { useBreakpointUp, useBreakpointBelow } from './hooks/UseBreakpointRange';

export { DeviceClass, DeviceClassOrder } from './enums/DeviceClass';
export {
  type DeviceScale,
  type DeviceMeasure,
  ShortHeightPx,
  ShortHeightQuery,
  detectDeviceClass,
  resolveDeviceClass,
} from './DeviceClass';
export {
  type DeviceClassOptions,
  type DeviceClassState,
  DeviceClassAttribute,
  DeviceClassKey,
  useDeviceClass,
  provideDeviceTargets,
} from './hooks/UseDeviceClass';

export { useMediaQuery } from './hooks/UseMediaQuery';
export * from './hooks/UseReducedMotion';
