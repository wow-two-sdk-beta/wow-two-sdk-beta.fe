import { computed, inject, provide, toValue, type ComputedRef, type InjectionKey, type MaybeRefOrGetter } from 'vue';

/** Defines the reading direction of a subtree. */
export const Direction = {
  /** Refers to left-to-right reading order. */
  Ltr: 'ltr',
  /** Refers to right-to-left reading order. */
  Rtl: 'rtl',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

/**
 * React's `createContext(Direction.Ltr)` becomes an `InjectionKey` plus a
 * default at the injection site. The provided value is a `ComputedRef` rather
 * than a bare string so a `dir` change re-evaluates every consumer — Vue's
 * `provide` is not reactive on its own.
 */
export const DirectionKey: InjectionKey<ComputedRef<Direction>> = Symbol('wow-two.direction');

/** The provider half — used by `DirectionProvider`, and by any component that owns a direction. */
export function provideDirection(dir: MaybeRefOrGetter<Direction>): ComputedRef<Direction> {
  const direction = computed(() => toValue(dir));
  provide(DirectionKey, direction);
  return direction;
}

/**
 * Read the surrounding reading direction. Falls back to `ltr` outside any
 * provider, matching the React context's default value.
 */
export function useDirection(): ComputedRef<Direction> {
  return inject(DirectionKey, () => computed<Direction>(() => Direction.Ltr), true);
}
