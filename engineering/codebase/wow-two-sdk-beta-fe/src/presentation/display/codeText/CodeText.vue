<script lang="ts">
import type { CodeTextVariant } from './CodeText.variants';

export interface CodeTextProps {
  /** The rendering mode. */
  readonly variant?: CodeTextVariant;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { codeVariants } from './CodeText.variants';

/**
 * Renders inline or block code text in the mono face — styling only, no tokenizing.
 *
 * For block, wrap children in a `<pre>` when you need pre-wrap whitespace. Syntax highlighting is L5.
 */
defineOptions({ name: 'CodeText', inheritAttrs: false });

/** The code text — React's `children`. */
defineSlots<{ default(): unknown }>();

/* No default: `codeVariants`' own `defaultVariants` decides, as in React. */
const props = defineProps<CodeTextProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() => cn(codeVariants({ variant: props.variant }), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <code ref="el" v-bind="rest" :class="classes"><slot /></code>
</template>
