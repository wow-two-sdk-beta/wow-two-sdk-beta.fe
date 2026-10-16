<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { SelectPickerSize } from '../selectPicker';

/** Defines props for the month picker. */
export interface MonthPickerProps {
  /** The picked month, controlled. The `v-model` binding target; `null` picks nothing. */
  readonly modelValue?: Temporal.PlainYearMonth | null;

  /** The initial month when uncontrolled. */
  readonly defaultValue?: Temporal.PlainYearMonth | null;

  /** The earliest selectable month. */
  readonly min?: Temporal.PlainYearMonth | null;

  /** The latest selectable month. */
  readonly max?: Temporal.PlainYearMonth | null;

  /** The custom per-month disable predicate. Kept a prop: it returns a value. */
  readonly isMonthDisabled?: (month: Temporal.PlainYearMonth) => boolean;

  /** The trigger's formatter. Default the localized long month and year. */
  readonly format?: (month: Temporal.PlainYearMonth) => string;

  /** The trigger text with no month picked. Default `"Pick a month"`, localized. */
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

  /** The hidden input name; the month ships as ISO `YYYY-MM`. */
  readonly name?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { monthIndexOf, PeriodKind, yearMonthAt } from '../PeriodExtensions';
import PeriodPicker from '../PeriodPicker.vue';

/** Renders a trigger that opens a year page of months and shows the picked month. */
defineOptions({ name: 'MonthPicker', inheritAttrs: false });

const componentProps = withDefaults(defineProps<MonthPickerProps>(), {
  modelValue: undefined,
  defaultValue: null,
  min: null,
  max: null,
  isMonthDisabled: undefined,
  format: undefined,
  size: undefined,
  id: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'MonthPicker', { placeholder: 'Pick a month' });

const emit = defineEmits<{
  /** Fires when the reader picks a month — the `v-model` half. */
  'update:modelValue': [month: Temporal.PlainYearMonth | null];
}>();

const attrs = useAttrs();

/** Maps a month to its index, keeping `null` and `undefined` apart. */
function toIndex(month: Temporal.PlainYearMonth | null | undefined): number | null | undefined {
  return month ? monthIndexOf(month) : month;
}

const isIndexDisabled = computed(() => {
  const test = props.isMonthDisabled;
  return test ? (index: number) => test(yearMonthAt(index)) : undefined;
});

const formatIndex = computed(() => {
  const format = props.format;
  return format ? (index: number) => format(yearMonthAt(index)) : undefined;
});

function serializeIndex(index: number): string {
  return yearMonthAt(index).toString();
}

function handleUpdate(index: number | null): void {
  emit('update:modelValue', index === null ? null : yearMonthAt(index));
}
</script>

<template>
  <PeriodPicker
    v-bind="attrs"
    :kind="PeriodKind.Month"
    :model-value="toIndex(props.modelValue)"
    :default-value="toIndex(props.defaultValue)"
    :min="toIndex(props.min)"
    :max="toIndex(props.max)"
    :is-index-disabled="isIndexDisabled"
    :format-index="formatIndex"
    :serialize-index="serializeIndex"
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
