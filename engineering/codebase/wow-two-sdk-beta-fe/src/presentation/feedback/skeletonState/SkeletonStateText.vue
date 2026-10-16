<script lang="ts">
import type { SkeletonStateAnimation } from './SkeletonState.variants';

export interface SkeletonStateTextProps {
  /** The number of lines. Default `3`. */
  readonly lines?: number;
  /** The last line's width, so the block reads as a paragraph. Default `60%`. */
  readonly lastLineWidth?: string;
  /** How the lines move; defaults to the nearest `SkeletonStateGroup`'s. */
  readonly animation?: SkeletonStateAnimation;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import SkeletonState from './SkeletonState.vue';

/** Renders a paragraph placeholder — `lines` text skeletons with a shorter last line. */
defineOptions({ name: 'SkeletonStateText' });

const props = withDefaults(defineProps<SkeletonStateTextProps>(), { lines: 3, lastLineWidth: '60%' });

const el = useTemplateRef<HTMLDivElement>('el');
const count = computed(() => Math.max(1, Math.floor(props.lines)));

/** Vue does not append `px` to a numeric `:style` value — the width is passed through as written. */
function lineStyle(index: number): Record<string, string> | undefined {
  return index === count.value && count.value > 1 ? { width: props.lastLineWidth } : undefined;
}

defineExpose({ el });
</script>

<template>
  <div ref="el" aria-hidden="true" class="flex flex-col gap-2">
    <SkeletonState
      v-for="index in count"
      :key="index"
      shape="text"
      v-bind="props.animation ? { animation: props.animation } : {}"
      :style="lineStyle(index)"
    />
  </div>
</template>
