<script lang="ts">
import type { Size } from '../../../foundation/styles';
import type { BadgeVariant } from './Badge.variants';

export interface BadgeProps {
  /** The color treatment. */
  readonly variant?: BadgeVariant;
  /** The size step. */
  readonly size?: Size;
  /** Draws the pill as its placeholder; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { renderableChildren } from '../../../foundation/primitives';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { badgeVariants, type BadgeVariants } from './Badge.variants';

/**
 * Renders a non-interactive pill marking a status or category.
 *
 * Use `Tag` for the clickable pill, `Alert*` for severity-tinted callouts at message scale.
 */
defineOptions({ name: 'Badge', inheritAttrs: false });

/** The badge copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<BadgeProps>(), { isSkeleton: undefined });

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLSpanElement>('el');
const skeleton = useSkeletonState(() => props.isSkeleton);

/** Whether the pill has copy — an empty one still loading keeps a short stand-in width. Read during render. */
const hasContent = (): boolean => renderableChildren(slots.default?.()).length > 0;

/* The placeholder merges last: the pill keeps its size, padding and radius while its fill and copy are masked. */
const classes = computed(() =>
  cn(
    badgeVariants({
      variant: props.variant,
      size: props.size as BadgeVariants['size'],
    }),
    attrs.class as string | undefined,
    skeleton.boxClass.value,
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
  <span
    ref="el"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :aria-hidden="skeleton.isSkeleton.value || undefined"
    v-bind="rest"
    :class="classes"
    ><span v-if="skeleton.isSkeleton.value && !hasContent()" class="inline-block w-[4ch]">&nbsp;</span><slot v-else
  /></span>
</template>
