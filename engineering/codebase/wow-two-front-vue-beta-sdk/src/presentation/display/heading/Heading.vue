<script lang="ts">
import type { HeadingAlign, HeadingSize, HeadingWeight } from './Heading.variants';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps {
  /** The semantic heading level (1–6). Default 2. Visual size is independent — set via `size`. */
  readonly level?: HeadingLevel;
  /** The visual size step. */
  readonly size?: HeadingSize;
  /** The font weight. */
  readonly weight?: HeadingWeight;
  /** The text alignment. */
  readonly align?: HeadingAlign;
  /** Draws the heading as one bar per line; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
  /** The skeleton bar's width, any CSS length; defaults to the heading's own width. */
  readonly skeletonWidth?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';
import { headingVariants } from './Heading.variants';

/**
 * Renders a semantic heading whose tag (`h1`-`h6`) and visual size are set independently.
 *
 * So a visually-large heading can still sit at the right outline level.
 */
defineOptions({ name: 'Heading', inheritAttrs: false });

/** The heading copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<HeadingProps>(), { level: 2, isSkeleton: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLHeadingElement>('el');
const skeleton = useSkeletonState(() => props.isSkeleton);

const tag = computed(() => `h${props.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');

const classes = computed(() =>
  cn(
    headingVariants({ size: props.size, weight: props.weight, align: props.align }),
    attrs.class as string | undefined,
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
  <component :is="tag" ref="el" :data-skeleton="skeleton.isSkeleton.value || undefined" v-bind="rest" :class="classes"
    ><SkeletonStateLine v-if="skeleton.isSkeleton.value" is-skeleton :width="props.skeletonWidth"
      ><slot /></SkeletonStateLine
    ><slot v-else
  /></component>
</template>
