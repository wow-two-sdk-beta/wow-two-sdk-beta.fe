<script lang="ts">
/* No props of its own — every attribute falls through. The block itself is load-bearing:
   in a `<script setup>`-only SFC, `vue-eslint-parser` loses `ignoreRestSiblings` and the
   `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders the `caption` of a `Table`, placed below the grid. */
defineOptions({ name: 'TableCaption', inheritAttrs: false });

/** The caption copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableCaptionElement>('el');

const classes = computed(() => cn('mt-2 text-sm text-muted-foreground', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <caption ref="el" v-bind="rest" :class="classes">
    <slot />
  </caption>
</template>
