import { computed, inject, type ComputedRef } from 'vue';
import { DeviceClass, DeviceClassKey, TailwindBreakpoints, useMediaQuery } from '../../../foundation/device';

/**
 * Whether the calendar serves its phone layout — dots instead of chips, a day list instead of a time grid.
 *
 * Follows the device class an app root provided with `provideDeviceTargets`: the phone layout when the effective class
 * is phone, whatever the viewport — a landscape phone, or a product that declares no tablet, is served the phone class
 * at a width the viewport alone would call wide. Without a provider it follows the viewport: narrower than Tailwind's
 * `sm` (640px). Both read through `foundation/device`, so rotating the device or resizing the window re-evaluates
 * without a reload.
 *
 * Reads `false` — the wide layout — on the server and in the first render, as the device class itself does, so a
 * narrow screen is corrected on mount, in the same flush and before the first paint. The first render therefore never
 * depends on `window`, and hydration matches the server.
 *
 * The class is read through the optional `inject` AppFrame uses: `useDeviceClass()` throws without a provider, and this
 * calendar renders in apps that never provide one.
 */
export function useIsPhone(): ComputedRef<boolean> {
  const provided = inject(DeviceClassKey, null);
  const isViewportPhone = useMediaQuery(`(width < ${TailwindBreakpoints.sm}px)`);
  return computed(() => (provided ? provided.effective.value === DeviceClass.Phone : isViewportPhone.value));
}
