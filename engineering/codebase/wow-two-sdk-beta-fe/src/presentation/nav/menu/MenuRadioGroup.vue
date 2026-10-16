<script lang="ts">
/** Defines props for the single-choice band of menu rows. */
export interface MenuRadioGroupProps {
  /** The selected value, controlled. The `v-model` binding target; `null` selects nothing. */
  readonly modelValue?: string | null;

  /** The initial selected value when uncontrolled. Default `null`. */
  readonly defaultValue?: string | null;

  /** The group heading. The `#label` slot is the rich override. */
  readonly label?: string | number;

  /** The disabled state — blocks every row in the group. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useSlots, useTemplateRef } from 'vue';
import { useId } from '../../../foundation/identifiers';
import { useControlled } from '../../../foundation/state';
import { MenuRadioGroupKey } from './MenuContext';
import { menuLabelVariants } from './Menu.variants';

/** Renders a labelled `role="group"` band whose `MenuRadioItem` rows choose exactly one value. */
defineOptions({ name: 'MenuRadioGroup', inheritAttrs: false });

defineSlots<{
  /** The `MenuRadioItem` rows. */
  default(): unknown;

  /** The rich override for the `label` prop. */
  label?(): unknown;
}>();

/* `modelValue` defaults to `undefined` so omission selects uncontrolled mode; `null` stays a real value. */
const props = withDefaults(defineProps<MenuRadioGroupProps>(), {
  modelValue: undefined,
  defaultValue: null,
  label: undefined,
  isDisabled: false,
});

const emit = defineEmits<{
  /** Fires when the reader picks a row — the `v-model` half. */
  'update:modelValue': [value: string | null];
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');
const labelId = useId();

const controlled = useControlled<string | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const hasLabel = computed(() => (props.label !== undefined && props.label !== '') || Boolean(slots.label));

provide(MenuRadioGroupKey, {
  value: controlled.value,
  select: (value) => controlled.setValue(value),
  isDisabled: computed(() => props.isDisabled),
});

defineExpose({ el });
</script>

<template>
  <div ref="el" role="group" :aria-labelledby="hasLabel ? labelId : undefined" v-bind="attrs">
    <div v-if="hasLabel" :id="labelId" :class="menuLabelVariants()">
      <slot name="label">{{ props.label }}</slot>
    </div>
    <slot />
  </div>
</template>
