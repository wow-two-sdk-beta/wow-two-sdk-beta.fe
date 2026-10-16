<script lang="ts">
import type { ElementType } from '../../../foundation/dom';

export interface FlexLayoutProps {
  readonly as?: ElementType;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a bare flex container — no opinions on direction, gap, or alignment.
 * Use for one-off flex layouts that don't fit `StackLayout`'s variant matrix.
 */
defineOptions({ name: 'FlexLayout', inheritAttrs: false });

const props = withDefaults(defineProps<FlexLayoutProps>(), { as: 'div' });

defineSlots<{
  /** The flex items. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() => cn('flex', attrs.class as string | undefined));

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
