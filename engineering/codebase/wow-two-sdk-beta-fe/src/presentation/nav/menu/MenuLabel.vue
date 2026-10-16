<script lang="ts">
/**
 * The prop surface of `MenuLabel`.
 *
 * React declared `HTMLAttributes<HTMLDivElement>`; attributes reach the root
 * through `useAttrs` here and `children` is the default slot, which leaves no
 * declared prop.
 */
export type MenuLabelProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { menuLabelVariants } from './Menu.variants';

/** Renders a standalone heading row inside a menu — no `role`, purely visual. */
defineOptions({ name: 'MenuLabel', inheritAttrs: false });

/** The label content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn(menuLabelVariants(), attrs.class as string | undefined));

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
