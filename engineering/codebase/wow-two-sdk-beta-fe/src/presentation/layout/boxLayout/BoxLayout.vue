<script lang="ts">
import type { ElementType } from '../../../foundation/dom';

export interface BoxLayoutProps {
  /** The HTML element to render. Default `div`. */
  readonly as?: ElementType;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders the lowest-level layout primitive — any element (default `div`)
 * with className passthrough. Use as a styling shell when no other layout
 * atom fits.
 *
 * `inheritAttrs: false` so a caller's `class` goes through `cn` (tailwind-merge
 * resolves the conflict) instead of Vue's blind class concatenation — the same
 * last-wins precedence React's `cn(…, className)` gives.
 */
defineOptions({ name: 'BoxLayout', inheritAttrs: false });

const props = withDefaults(defineProps<BoxLayoutProps>(), { as: 'div' });

defineSlots<{
  /** The content the box wraps. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() => cn(attrs.class as string | undefined));

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
