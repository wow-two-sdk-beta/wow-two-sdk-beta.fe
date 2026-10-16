import type { ShallowRef } from 'vue';

import { useMediaQuery } from './UseMediaQuery';

/**
 * Returns a ref that is `true` when the user has requested reduced motion via
 * OS settings. Components should short-circuit looping/transitional animations
 * to a static final state when it is `true`.
 */
export function useReducedMotion(): Readonly<ShallowRef<boolean>> {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
