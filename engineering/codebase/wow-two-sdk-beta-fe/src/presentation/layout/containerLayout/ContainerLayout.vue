<script lang="ts">
import type { ElementType } from '../../../foundation/dom';
import type { ContainerLayoutSize } from './ContainerLayout.variants';

export interface ContainerLayoutProps {
  readonly as?: ElementType;
  /** The max-width preset. Default `lg`. */
  readonly size?: ContainerLayoutSize;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { containerVariants } from './ContainerLayout.variants';

/**
 * Renders a centered max-width wrapper with horizontal padding. Use at page-level to
 * constrain content width.
 */
defineOptions({ name: 'ContainerLayout', inheritAttrs: false });

const props = withDefaults(defineProps<ContainerLayoutProps>(), { as: 'div' });

defineSlots<{
  /** The page content held to the max width. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() => cn(containerVariants({ size: props.size }), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component :is="props.as" ref="el" v-bind="rest" :class="classes"><slot /></component>
</template>
