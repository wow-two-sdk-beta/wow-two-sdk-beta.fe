<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an exported
   name: React declared `TimelineDescriptionProps` and consumers import it. Every attribute
   falls through, so the interface carries nothing in Vue. The block itself is load-bearing:
   in a `<script setup>`-only SFC, `vue-eslint-parser` loses `ignoreRestSiblings` and the
   `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
export interface TimelineDescriptionProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders the supporting copy under a `TimelineTitle`, at muted body scale. */
defineOptions({ name: 'TimelineDescription', inheritAttrs: false });

/** The description copy — React's required `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLParagraphElement>('el');

const classes = computed(() => cn('text-xs text-muted-foreground', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <p ref="el" v-bind="rest" :class="classes"><slot /></p>
</template>
