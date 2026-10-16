<script lang="ts">
import type { HTMLAttributes } from 'vue';

export type CenterLayoutProps = HTMLAttributes;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders a flex shorthand that centers its children on both axes. */
/* `<center>` is a deprecated HTML element. This is a library component — imported,
   never globally registered — so the name cannot shadow the tag, and renaming it
   would break parity with the React package. */
defineOptions({ name: 'CenterLayout', inheritAttrs: false });

defineSlots<{
  /** The content centered on both axes. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn('flex items-center justify-center', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes"><slot /></div>
</template>
