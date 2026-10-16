<script lang="ts">
/**
 * The prop surface of `CommandPaletteModalList`.
 *
 * React declared `HTMLAttributes<HTMLDivElement>`; attributes reach the root
 * through `useAttrs` here, which leaves no declared prop.
 */
export type CommandPaletteModalListProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useCommandPaletteContext } from './CommandPaletteModalContext';

/** Renders the scrollable `role="listbox"` the search input drives. */
defineOptions({ name: 'CommandPaletteModalList', inheritAttrs: false });

/** The groups / items — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const context = useCommandPaletteContext();

const classes = computed(() => cn('max-h-80 overflow-y-auto p-1', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    :id="context.listboxId"
    ref="el"
    role="listbox"
    :aria-labelledby="context.inputId"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </div>
</template>
