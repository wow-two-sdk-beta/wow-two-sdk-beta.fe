import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { useMediaQuery } from './UseMediaQuery';
import type { BreakpointScale } from '../Breakpoints';

/** The media query for "at least `key`", or one that never matches when the scale holds no valid width for it. */
function atLeastQuery(scale: BreakpointScale, key: string): string {
  const width = scale[key];
  return typeof width === 'number' && Number.isFinite(width) && width >= 0 ? `(min-width: ${width}px)` : 'not all';
}

/**
 * Reports whether the viewport is at least the `key` breakpoint of the caller's scale — `md` and wider for `'md'`.
 * One media query, so a layout that only asks "desktop or not" never tracks the whole scale.
 *
 * SSR-safe: `false` on the server and until mounted, the mobile-first base.
 * ```ts
 * const isDesktop = useBreakpointUp(TailwindBreakpoints, 'lg');
 * ```
 */
export function useBreakpointUp<TScale extends BreakpointScale>(
  scale: MaybeRefOrGetter<TScale>,
  key: MaybeRefOrGetter<Extract<keyof TScale, string>>,
): Readonly<ShallowRef<boolean>> {
  return useMediaQuery(() => atLeastQuery(toValue(scale), toValue(key)));
}

/**
 * Reports whether the viewport is narrower than the `key` breakpoint of the caller's scale — a phone below `'md'`.
 *
 * SSR-safe: `true` on the server and until mounted, the mobile-first base.
 * ```ts
 * const isPhone = useBreakpointBelow(TailwindBreakpoints, 'md');
 * ```
 */
export function useBreakpointBelow<TScale extends BreakpointScale>(
  scale: MaybeRefOrGetter<TScale>,
  key: MaybeRefOrGetter<Extract<keyof TScale, string>>,
): ComputedRef<boolean> {
  const atLeast = useBreakpointUp(scale, key);
  return computed(() => !atLeast.value);
}
