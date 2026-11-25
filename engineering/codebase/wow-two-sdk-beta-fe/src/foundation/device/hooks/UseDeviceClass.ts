// Device class — which of phone / tablet / desktop this device is, and which DECLARED layout serves it.
//
// Read entirely through media features on the shared `useMediaQuery` (`min-width` through `useBreakpointUp`,
// `max-height`, `pointer`), so every part is reactive: rotating a phone or docking a keyboard re-classifies the
// device without a reload. No user agent, and no `window.innerWidth` — see `DeviceClass.ts` for the rule.
//
// The composable never sees a pixel width: it learns which side of `md` and `lg` the viewport is on, and which side
// of the short-height line. Each threshold's own value stands for its band when handed to the pure
// `detectDeviceClass`, which compares only against those thresholds and so answers exactly as it would for the real
// size. The rule therefore lives in one place.
//
// PROVIDER IS A COMPOSABLE, NOT A COMPONENT: `provideDeviceTargets` is one call in the app root's setup, with no
// slot wrapper and no SFC to keep in step with `check-sfc`. It also owns the one `data-device-class` write on
// `<html>`, for CSS that wants to key off the served class — a document-level side effect that belongs to the one
// root, never to the consumers that read the class. The attribute is absent on the server and until mount.
//
// SSR: reads as `'desktop'` until mounted — the wide base the unattributed CSS serves — and corrects on hydration,
// the way `usePointerType` reads `'none'`. Nothing here touches `window` at setup.

import {
  computed,
  inject,
  onMounted,
  onScopeDispose,
  provide,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';

import { useBreakpointUp } from './UseBreakpointRange';
import { useMediaQuery } from './UseMediaQuery';
import { usePointerType } from './UsePointer';

import {
  detectDeviceClass,
  resolveDeviceClass,
  ShortHeightPx,
  ShortHeightQuery,
  type DeviceScale,
} from '../DeviceClass';
import { DeviceClass } from '../enums/DeviceClass';
import { PointerType } from '../enums/PointerType';

/** The attribute `provideDeviceTargets` keeps on `<html>`: the effective class, once mounted. */
export const DeviceClassAttribute = 'data-device-class';

/** What {@link useDeviceClass} takes. */
export interface DeviceClassOptions {
  /** The app's breakpoints. Required, and must hold `md` and `lg`: the library has no scale of its own. */
  readonly scale: MaybeRefOrGetter<DeviceScale>;

  /** The classes the product declares it serves. Omitted or empty: the effective class is the detected one. */
  readonly targets?: MaybeRefOrGetter<readonly DeviceClass[] | undefined>;
}

/** What {@link useDeviceClass} returns. */
export interface DeviceClassState {
  /** What the device is, by viewport and pointer. `'desktop'` under SSR and until mounted. */
  readonly detected: ComputedRef<DeviceClass>;

  /** The declared class that serves the device — `detected` when no targets are declared. Lay out by this. */
  readonly effective: ComputedRef<DeviceClass>;

  /** Whether the viewport is shorter than 500px: a landscape phone, or a keyboard open over a form. */
  readonly isShortHeight: ComputedRef<boolean>;

  /** Whether the primary pointer is a finger. Size hit targets by this, not by the class. */
  readonly isCoarsePointer: ComputedRef<boolean>;
}

/** The injection key `provideDeviceTargets` fills and a no-options {@link useDeviceClass} reads. */
export const DeviceClassKey: InjectionKey<DeviceClassState> = Symbol('wow-two.deviceClass');

function createDeviceClass(options: DeviceClassOptions): DeviceClassState {
  const scale = computed(() => toValue(options.scale));
  const targets = computed(() => toValue(options.targets));
  const atLeastMd = useBreakpointUp(scale, 'md');
  const atLeastLg = useBreakpointUp(scale, 'lg');
  const shortHeight = useMediaQuery(ShortHeightQuery);
  const pointer = usePointerType();

  // Before mount every media query reads `false`, which would call a desktop a phone. Hold the wide base instead.
  const mounted = shallowRef(false);
  onMounted(() => {
    mounted.value = true;
  });

  const detected = computed<DeviceClass>(() => {
    if (!mounted.value) return DeviceClass.Desktop;
    const { md, lg } = scale.value;
    return detectDeviceClass(
      {
        width: atLeastLg.value ? lg : atLeastMd.value ? md : 0,
        height: shortHeight.value ? 0 : ShortHeightPx,
        pointer: pointer.value,
      },
      scale.value,
    );
  });

  return {
    detected,
    effective: computed(() => resolveDeviceClass(detected.value, targets.value)),
    isShortHeight: computed(() => shortHeight.value),
    isCoarsePointer: computed(() => pointer.value === PointerType.Coarse),
  };
}

/**
 * Reports the device class and the declared class that serves it. Pass `{ scale }` (and optionally `targets`) for
 * a standalone reading; pass nothing to read the app's, which `provideDeviceTargets` supplied once at the root and
 * every caller shares — one set of media-query subscriptions, however many components ask.
 *
 * Options win outright: a call with `{ scale }` inside a provider does not inherit the provider's targets.
 *
 * Reactive: rotating the device or docking a keyboard changes the result without a reload. Under SSR it reads
 * `'desktop'` and corrects on hydration.
 *
 * Throws when called with no options below no `provideDeviceTargets`: there is no default scale to fall back on,
 * and a silent guess would disagree with the app's CSS.
 *
 * @param options The app's scale, and the classes it serves. Omit to read the app-level state.
 * @returns The detected and effective classes, plus the two inputs they were read from.
 */
export function useDeviceClass(options?: DeviceClassOptions): DeviceClassState {
  if (options) return createDeviceClass(options);
  const provided = inject(DeviceClassKey, null);
  if (!provided) {
    throw new Error(
      'useDeviceClass() without options must be used below provideDeviceTargets(); ' +
        'pass { scale } to use it standalone.',
    );
  }
  return provided;
}

/**
 * Declares the classes the product serves, once, for the app root, and shares the reading with every
 * `useDeviceClass()` below it. Also keeps `data-device-class="phone|tablet|desktop"` (the effective class) on
 * `<html>` while mounted, for CSS that keys off it; the previous value is restored on unmount. Call it once per
 * document: a second provider fights the first over the attribute.
 *
 * The attribute is absent on the server and until mount, so write attribute selectors as overrides of an
 * unattributed base layout.
 *
 * @param targets The classes the product declares in its design spec; omitted or empty serves the detected class.
 * @param scale The app's breakpoints, holding `md` and `lg`.
 * @returns The same state `useDeviceClass()` returns below this component.
 */
export function provideDeviceTargets(
  targets: MaybeRefOrGetter<readonly DeviceClass[] | undefined>,
  scale: MaybeRefOrGetter<DeviceScale>,
): DeviceClassState {
  const state = createDeviceClass({ scale, targets });
  provide(DeviceClassKey, state);

  let release: (() => void) | undefined;
  onMounted(() => {
    const root = document.documentElement;
    const previous = root.getAttribute(DeviceClassAttribute);
    const stop = watch(state.effective, (value) => root.setAttribute(DeviceClassAttribute, value), { immediate: true });
    release = () => {
      stop();
      if (previous === null) root.removeAttribute(DeviceClassAttribute);
      else root.setAttribute(DeviceClassAttribute, previous);
    };
  });
  onScopeDispose(() => {
    release?.();
    release = undefined;
  });

  return state;
}
