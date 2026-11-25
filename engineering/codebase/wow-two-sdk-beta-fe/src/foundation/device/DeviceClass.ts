// The device-class model — pure, DOM-free, and deliberately WITHOUT a built-in scale, like `Breakpoints`.
//
// WHY NOT WIDTH ALONE: a phone turned on its side is ~844x390 and reads as a tablet by width. What makes it a phone
// is the INPUT and the HEIGHT: a finger (`pointer: coarse`) and no room above the keyboard. Both are media
// features, so the rule needs no user-agent string — see `Platform.ts` for why a UA names none of this truthfully.
//
// WHY THE RULE STOPS AT THREE CLASSES: it answers one question — which declared layout serves this device — and
// a fourth class would be a fourth layout every product has to design. A product declares the classes it serves;
// a class it does not declare is served by the nearest declared one (`resolveDeviceClass`).

import { DeviceClass, DeviceClassOrder } from './enums/DeviceClass';
import { PointerType } from './enums/PointerType';

/**
 * The two breakpoints the rule reads, in CSS pixels: below `md` is a phone, below `lg` a tablet. A caller's whole
 * scale is accepted (extra keys are ignored); the app's own `@theme` values go here, or JS and CSS will disagree.
 */
export type DeviceScale = Readonly<Record<'md' | 'lg', number>>;

/** The height under which a touch device is a phone whatever its width, in CSS pixels. */
export const ShortHeightPx = 500;

/** The media query that matches a viewport shorter than {@link ShortHeightPx}. */
export const ShortHeightQuery = `(max-height: ${ShortHeightPx - 1}px)`;

/** The viewport and primary pointer {@link detectDeviceClass} judges. */
export interface DeviceMeasure {
  /** The viewport width in CSS pixels. */
  readonly width: number;
  /** The viewport height in CSS pixels. */
  readonly height: number;
  /** The primary pointer's precision; only `'coarse'` changes the answer. */
  readonly pointer: PointerType;
}

/**
 * Classifies a device from its viewport and primary pointer: a phone when narrower than `scale.md`, or when the
 * pointer is coarse and the viewport is shorter than {@link ShortHeightPx}; else a tablet when narrower than
 * `scale.lg`; else a desktop.
 *
 * A fine pointer never makes a phone from height alone: a desktop window dragged short is still a desktop window.
 * A scale without a finite `md` and `lg` is a caller bug and reads as desktop, never as a throw.
 *
 * @param measure The viewport size and primary pointer.
 * @param scale The app's `md` and `lg` breakpoints.
 * @returns The detected {@link DeviceClass}.
 */
export function detectDeviceClass(measure: DeviceMeasure, scale: DeviceScale): DeviceClass {
  const { width, height, pointer } = measure;
  if (width < scale.md || (pointer === PointerType.Coarse && height < ShortHeightPx)) return DeviceClass.Phone;
  if (width < scale.lg) return DeviceClass.Tablet;
  return DeviceClass.Desktop;
}

/**
 * Maps a detected class onto a class the product serves: the largest declared class not wider than `detected`, or
 * the smallest declared class when every declared class is wider. Order is `phone` < `tablet` < `desktop`.
 *
 * An empty or missing `targets` means no declaration, so `detected` stands. Entries that are not a
 * {@link DeviceClass} are ignored, and so is their order and repetition.
 *
 * @param detected The class {@link detectDeviceClass} found.
 * @param targets The classes the product declares in its design spec.
 * @returns The class whose layout serves the device.
 */
export function resolveDeviceClass(detected: DeviceClass, targets?: readonly DeviceClass[]): DeviceClass {
  const declared = DeviceClassOrder.filter((candidate) => targets?.includes(candidate));
  const rank = DeviceClassOrder.indexOf(detected);
  let served: DeviceClass | undefined;
  for (const candidate of declared) {
    if (DeviceClassOrder.indexOf(candidate) <= rank) served = candidate;
  }
  return served ?? declared[0] ?? detected;
}
