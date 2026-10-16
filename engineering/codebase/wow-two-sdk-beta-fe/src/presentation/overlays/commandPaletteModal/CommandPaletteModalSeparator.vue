<script lang="ts">
/**
 * The prop surface of `CommandPaletteModalSeparator`.
 *
 * React declared `HTMLAttributes<HTMLDivElement>`; attributes reach the root
 * through `useAttrs` here, which leaves no declared prop.
 */
export type CommandPaletteModalSeparatorProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { listboxSeparatorVariants } from '../../forms/listboxPicker/ListboxPicker.variants';

/** Renders the hairline rule between palette sections. */
defineOptions({ name: 'CommandPaletteModalSeparator', inheritAttrs: false });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/* React spread `{...props}` *after* its own `className`, so a consumer's class
   replaced the recipe outright; `cn` reproduces that precedence through
   tailwind-merge rather than concatenating the two. */
const classes = computed(() => cn(listboxSeparatorVariants(), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" role="separator" v-bind="rest" :class="classes" />
</template>
