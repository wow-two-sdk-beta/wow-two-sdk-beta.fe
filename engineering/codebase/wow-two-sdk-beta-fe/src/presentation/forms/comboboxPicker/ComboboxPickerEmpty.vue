<script lang="ts">
/* No props: React typed this as bare `HTMLAttributes<HTMLDivElement>`, every member of which is
   a Vue fallthrough attr, and the message itself is the default slot. The block exists because
   a `<script setup>`-only SFC loses `ignoreRestSiblings` in `vue-eslint-parser` and trips
   `no-unused-vars` on the house `const { class: _class, ...others }` idiom. */
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { listboxEmptyVariants } from '../listboxPicker/ListboxPicker.variants';

/** Renders the no-matches message as a disabled option row, perceivable to AT but skipped by keyboard nav. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ComboboxPickerEmpty', inheritAttrs: false });

defineSlots<{
  /** The no-matches copy — React's `children`. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn(listboxEmptyVariants(), attrs.class as ClassValue));
</script>

<template>
  <div role="option" aria-disabled="true" :aria-selected="false" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </div>
</template>
