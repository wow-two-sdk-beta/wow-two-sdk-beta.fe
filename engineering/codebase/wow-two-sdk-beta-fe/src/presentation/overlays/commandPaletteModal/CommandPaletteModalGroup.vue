<script lang="ts">
export interface CommandPaletteModalGroupProps {
  /** The group heading. React typed this `ReactNode`; the scalar form is the prop and `#label` is the rich override. */
  readonly label?: string | number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { useId } from '../../../foundation/identifiers';
import { listboxGroupLabelVariants } from '../../forms/listboxPicker/ListboxPicker.variants';

/** Renders a labelled `role="group"` band of palette items. */
defineOptions({ name: 'CommandPaletteModalGroup', inheritAttrs: false });

defineSlots<{
  /** The grouped items — React's `children`. */
  default(): unknown;

  /** The rich override for the `label` prop. */
  label?(): unknown;
}>();

const props = defineProps<CommandPaletteModalGroupProps>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');
const labelId = useId();

const hasLabel = computed(() => Boolean(props.label) || Boolean(slots.label));

defineExpose({ el });
</script>

<template>
  <!-- React passed `className` straight through (no `cn` merge) and spread the
       rest after it; `v-bind="attrs"` is the same single pass-through. -->
  <div ref="el" role="group" :aria-labelledby="hasLabel ? labelId : undefined" v-bind="attrs">
    <div v-if="hasLabel" :id="labelId" :class="listboxGroupLabelVariants()">
      <slot name="label">{{ props.label }}</slot>
    </div>
    <slot />
  </div>
</template>
