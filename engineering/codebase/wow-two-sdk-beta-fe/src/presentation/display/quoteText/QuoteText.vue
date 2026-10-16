<script lang="ts">
import type { HTMLAttributes } from 'vue';

export type QuoteTextProps = HTMLAttributes;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders a block quote with a subtle left border and italic body text. */
defineOptions({ name: 'QuoteText', inheritAttrs: false });

/** The quoted copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLQuoteElement>('el');

const classes = computed(() =>
  cn('border-l-4 border-border pl-4 italic text-muted-foreground', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <blockquote ref="el" v-bind="rest" :class="classes"><slot /></blockquote>
</template>
