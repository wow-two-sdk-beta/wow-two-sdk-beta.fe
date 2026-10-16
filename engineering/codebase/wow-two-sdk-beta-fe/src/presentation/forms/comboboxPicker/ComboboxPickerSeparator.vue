<script lang="ts">
/* No props: React typed this as bare `HTMLAttributes<HTMLDivElement>`, every member of which is
   a Vue fallthrough attr. The block exists because a `<script setup>`-only SFC loses
   `ignoreRestSiblings` in `vue-eslint-parser` and trips `no-unused-vars` on the house
   `const { class: _class, ...others }` idiom. */
</script>

<script setup lang="ts">
import { listboxSeparatorVariants } from '../listboxPicker/ListboxPicker.variants';

/** Renders a decorative rule between groups of options, hidden from the accessibility tree. */
/* `inheritAttrs` stays ON: React put `className` straight onto the div with no `cn()` merge
   of its own, so plain fallthrough reproduces it exactly. */
defineOptions({ name: 'ComboboxPickerSeparator' });
</script>

<template>
  <div aria-hidden="true" :class="listboxSeparatorVariants()" />
</template>
