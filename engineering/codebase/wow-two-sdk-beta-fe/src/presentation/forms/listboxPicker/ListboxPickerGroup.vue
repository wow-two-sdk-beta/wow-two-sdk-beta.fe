<script lang="ts">
/** Represents the prop surface of `ListboxPicker.Group`. */
export interface ListboxPickerGroupProps {
  /**
   * The optional group heading rendered above the contained items. Fill the
   * `label` slot instead for richer content; the prop stays the discriminator.
   */
  readonly label?: string | number;
}
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useId } from '../../../foundation/identifiers';
import { listboxGroupLabelVariants } from './ListboxPicker.variants';

/** Renders a heading above a subset of items and wires it as that group's accessible name. */
/* `inheritAttrs` stays ON: React put `className` straight onto the group div with no `cn()`
   merge of its own, so plain fallthrough reproduces it exactly. */
defineOptions({ name: 'ListboxPickerGroup' });

const props = defineProps<ListboxPickerGroupProps>();

defineSlots<{
  /** The items this group heads. */
  default(): unknown;
  /** The heading content, richer than the `label` prop can carry. */
  label?(): unknown;
}>();

const slots = useSlots();
const labelId = useId();

const hasLabel = computed(() => Boolean(props.label) || Boolean(slots.label));
</script>

<template>
  <div role="group" :aria-labelledby="hasLabel ? labelId : undefined">
    <div v-if="hasLabel" :id="labelId" :class="listboxGroupLabelVariants()">
      <slot name="label">{{ label }}</slot>
    </div>
    <slot />
  </div>
</template>
