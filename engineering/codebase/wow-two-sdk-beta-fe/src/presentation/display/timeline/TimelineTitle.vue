<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an exported
   name: React declared `TimelineTitleProps` and consumers import it. Every attribute falls
   through, so the interface carries nothing in Vue. The block itself is load-bearing: in a
   `<script setup>`-only SFC, `vue-eslint-parser` loses `ignoreRestSiblings` and the
   `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
export interface TimelineTitleProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders the headline of a `TimelineItem`, at the rail title weight. */
defineOptions({ name: 'TimelineTitle', inheritAttrs: false });

/** The title copy — React's required `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLHeadingElement>('el');

const classes = computed(() => cn('text-sm font-medium text-foreground', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <h4 ref="el" v-bind="rest" :class="classes"><slot /></h4>
</template>
