<script lang="ts">
import type { SelectPickerSize } from '../selectPicker';

/** Defines props for the year picker. */
export interface YearPickerProps {
  /** The picked year, controlled. The `v-model` binding target; `null` picks nothing. */
  readonly modelValue?: number | null;

  /** The initial year when uncontrolled. */
  readonly defaultValue?: number | null;

  /** The earliest selectable year. */
  readonly min?: number | null;

  /** The latest selectable year. */
  readonly max?: number | null;

  /** The custom per-year disable predicate. Kept a prop: it returns a value. */
  readonly isYearDisabled?: (year: number) => boolean;

  /** The trigger's formatter. Default the year in the locale's numerals. */
  readonly format?: (year: number) => string;

  /** The trigger text with no year picked. Default `"Pick a year"`, localized. */
  readonly placeholder?: string;

  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The trigger's id. Auto-filled from `Field` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value submitted. */
  readonly isReadOnly?: boolean;

  /** The invalid state. Falls back to the surrounding field's state. */
  readonly isInvalid?: boolean;

  /** The hidden input name; the year ships as its decimal digits. */
  readonly name?: string;
}
</script>

<script setup lang="ts">
import { useAttrs } from 'vue';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { PeriodKind } from '../PeriodExtensions';
import PeriodPicker from '../PeriodPicker.vue';

/** Renders a trigger that opens a decade page of years and shows the picked year. */
defineOptions({ name: 'YearPicker', inheritAttrs: false });

const componentProps = withDefaults(defineProps<YearPickerProps>(), {
  modelValue: undefined,
  defaultValue: null,
  min: null,
  max: null,
  isYearDisabled: undefined,
  format: undefined,
  size: undefined,
  id: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'YearPicker', { placeholder: 'Pick a year' });

const emit = defineEmits<{
  /** Fires when the reader picks a year — the `v-model` half. */
  'update:modelValue': [year: number | null];
}>();

const attrs = useAttrs();

function handleUpdate(year: number | null): void {
  emit('update:modelValue', year);
}
</script>

<template>
  <PeriodPicker
    v-bind="attrs"
    :kind="PeriodKind.Year"
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :min="props.min"
    :max="props.max"
    :is-index-disabled="props.isYearDisabled"
    :format-index="props.format"
    :serialize-index="String"
    :placeholder="props.placeholder"
    :size="props.size"
    :id="props.id"
    :is-disabled="props.isDisabled"
    :is-read-only="props.isReadOnly"
    :is-invalid="props.isInvalid"
    :name="props.name"
    @update:model-value="handleUpdate"
  />
</template>
