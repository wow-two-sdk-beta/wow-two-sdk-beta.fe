import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import {
  SkeletonStateAnimation,
  skeletonBoxClass,
  skeletonLineClass,
  skeletonPaintClass,
} from './SkeletonState.variants';

/** What a loading region shares with the components and placeholders inside it. */
export interface SkeletonStateGroupContext {
  /** Whether the region is loading; every `SkeletonStateSlot` without its own flag follows it. */
  readonly isLoading: ComputedRef<boolean>;
  /** Whether every SDK component inside draws its own skeleton — a region's first load. */
  readonly isSkeleton: ComputedRef<boolean>;
  /** How every placeholder inside moves, unless one sets its own. */
  readonly animation: ComputedRef<SkeletonStateAnimation | undefined>;
}

export const skeletonStateGroupKey: InjectionKey<SkeletonStateGroupContext> = Symbol('wow-two.skeletonStateGroup');

/** Reads the nearest `SkeletonStateGroup` or `DataRegion`, or `null` outside one. */
export function useSkeletonStateGroup(): SkeletonStateGroupContext | null {
  return inject(skeletonStateGroupKey, null);
}

/** A component's resolved skeleton mode and the classes that draw its placeholders. */
export interface SkeletonStateMode {
  /** Whether the component draws its skeleton: its own override, else the nearest region's first load. */
  readonly isSkeleton: ComputedRef<boolean>;
  /** How its placeholders move: the nearest region's animation, else `pulse`. */
  readonly animation: ComputedRef<SkeletonStateAnimation>;
  /** Paints a placeholder surface — see `skeletonPaintClass`. Empty outside skeleton mode. */
  readonly paintClass: ComputedRef<string>;
  /** Turns the component's own box into its placeholder — see `skeletonBoxClass`. Empty outside skeleton mode. */
  readonly boxClass: ComputedRef<string>;
  /** Draws an inline text bar — see `skeletonLineClass`. Empty outside skeleton mode. */
  readonly lineClass: ComputedRef<string>;
}

/**
 * Resolves whether a component draws its own skeleton: `override` wins when it returns a boolean, else the component
 * follows the nearest `DataRegion` first load. Call it in `setup`; pass the component's `isSkeleton` prop getter.
 */
export function useSkeletonState(override?: () => boolean | undefined): SkeletonStateMode {
  const group = useSkeletonStateGroup();
  const isSkeleton = computed(() => override?.() ?? group?.isSkeleton.value ?? false);
  const animation = computed(() => group?.animation.value ?? SkeletonStateAnimation.Pulse);
  return {
    isSkeleton,
    animation,
    paintClass: computed(() => (isSkeleton.value ? skeletonPaintClass(animation.value) : '')),
    boxClass: computed(() => (isSkeleton.value ? skeletonBoxClass(animation.value) : '')),
    lineClass: computed(() => (isSkeleton.value ? skeletonLineClass(animation.value) : '')),
  };
}

/**
 * Hands a container's resolved skeleton mode to everything inside it, so a container with its own `isSkeleton`
 * switches its children too. The loading flag stays on while an outer region still loads.
 */
export function provideSkeletonState(mode: SkeletonStateMode): void {
  const parent = useSkeletonStateGroup();
  provide(skeletonStateGroupKey, {
    isSkeleton: mode.isSkeleton,
    isLoading: computed(() => mode.isSkeleton.value || (parent?.isLoading.value ?? false)),
    animation: computed(() => parent?.animation.value),
  });
}
