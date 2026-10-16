<script lang="ts">
import type { SkeletonStateAnimation, SkeletonStateShape } from './SkeletonState.variants';

export interface SkeletonStateSlotProps {
  /** Overrides the nearest `SkeletonStateGroup`'s loading flag. */
  readonly isLoading?: boolean;
  /** The placeholder's corners; its size always comes from the content. Default `text`. */
  readonly shape?: SkeletonStateShape;
  /** Renders a block-level wrapper for block content — bars, charts, cards. Default `false`. */
  readonly isBlock?: boolean;
  /** How the placeholder moves; defaults to the nearest `SkeletonStateGroup`'s. */
  readonly animation?: SkeletonStateAnimation;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { skeletonSlotVariants } from './SkeletonState.variants';
import { useSkeletonStateGroup } from './SkeletonStateContext';

/**
 * Wraps a real value and, while loading, paints a placeholder exactly its size — the content stays
 * mounted but invisible, so labels and layout hold still and only the value turns into a skeleton.
 */
defineOptions({ name: 'SkeletonStateSlot', inheritAttrs: false });

/* `isLoading: undefined` is load-bearing: Vue casts an absent `Boolean` prop to `false`, which would
   override the group's flag. */
const props = withDefaults(defineProps<SkeletonStateSlotProps>(), { isLoading: undefined, isBlock: false });

defineSlots<{
  /** The value; its size shapes the placeholder while loading. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
const group = useSkeletonStateGroup();
const loading = computed(() => props.isLoading ?? group?.isLoading.value ?? false);

/** The placeholder merges last, so a caller's text colour or background cannot show through it. */
const classes = computed(() =>
  cn(
    props.isBlock ? 'block' : 'inline-block',
    attrs.class as string | undefined,
    loading.value && skeletonSlotVariants({ shape: props.shape, animation: props.animation ?? group?.animation.value }),
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component
    :is="props.isBlock ? 'div' : 'span'"
    ref="el"
    v-bind="rest"
    :class="classes"
    :aria-hidden="loading || undefined"
    :data-loading="loading || undefined"
  >
    <slot />
  </component>
</template>
