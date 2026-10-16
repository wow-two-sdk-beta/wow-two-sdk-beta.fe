<script lang="ts">
/**
 * The prop surface of `CommandPaletteModalEmpty`.
 *
 * React declared `HTMLAttributes<HTMLDivElement>`; attributes reach the root
 * through `useAttrs` here, which leaves no declared prop.
 */
export type CommandPaletteModalEmptyProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { listboxEmptyVariants } from '../../forms/listboxPicker/ListboxPicker.variants';
import { useCommandPaletteContext } from './CommandPaletteModalContext';

/** Renders the "no results" notice, shown only while the filter matches nothing. */
defineOptions({ name: 'CommandPaletteModalEmpty', inheritAttrs: false });

/** The empty-state copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const context = useCommandPaletteContext();

/* React read the mutable `itemsRef` during render; `items` is a reactive ref
   here, so the count re-derives on every register / unregister without the
   `registryVersion` counter React needed. */
const matchCount = computed(() => {
  const search = context.inputValue.value;
  return context.items.value.filter((i) => search === '' || context.filter(i.searchText, search)).length;
});

const classes = computed(() => cn(listboxEmptyVariants(), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- Polite live region — "no results" must be announced, not hidden as
       presentational chrome. -->
  <div v-if="matchCount === 0" ref="el" role="status" v-bind="rest" :class="classes">
    <slot />
  </div>
</template>
