<script lang="ts">
import type { HTMLAttributes } from 'vue';

export type MarkTextProps = HTMLAttributes;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders a semantic `<mark>` tint over text — search matches, "you mentioned this" affordances. */
defineOptions({ name: 'MarkText', inheritAttrs: false });

/** The highlighted text — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn('rounded-sm bg-warning-soft px-0.5 text-warning-soft-foreground', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <mark ref="el" v-bind="rest" :class="classes"><slot /></mark>
</template>
