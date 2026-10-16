<script lang="ts">
// Shared trigger + popover for MonthPicker and YearPicker, in period-index space (see PeriodExtensions).
// The public pickers convert their Temporal / number models at the boundary. Not exported from
// `forms/index.ts` — internal only.
import type { PeriodKind } from './PeriodExtensions';
import type { SelectPickerSize } from './selectPicker';

/** Defines props for the shared month/year picker, in period-index space. */
export interface PeriodPickerProps {
  /** Months or years. */
  readonly kind: PeriodKind;

  /** The picked index, controlled; `null` picks nothing, `undefined` leaves it uncontrolled. */
  readonly modelValue?: number | null;

  /** The initial index when uncontrolled. */
  readonly defaultValue?: number | null;

  /** The lowest selectable index. */
  readonly min?: number | null;

  /** The highest selectable index. */
  readonly max?: number | null;

  /** The custom per-cell disable predicate. */
  readonly isIndexDisabled?: (index: number) => boolean;

  /** The trigger's formatter. Default the localized month and year, or the year. */
  readonly formatIndex?: (index: number) => string;

  /** The hidden input's serializer. */
  readonly serializeIndex: (index: number) => string;

  /** The trigger text with nothing picked. */
  readonly placeholder: string;

  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The trigger's id. Auto-filled from `Field` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value submitted. Falls back to the surrounding field's state. */
  readonly isReadOnly?: boolean;

  /** The invalid state. Falls back to the surrounding field's state. */
  readonly isInvalid?: boolean;

  /** The hidden input name; when set, the serialized value ships with the form. */
  readonly name?: string;
}
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Calendar as CalendarIcon } from 'lucide-vue-next';
import { AriaAttribute } from '../../foundation/dom';
import { useLocale } from '../../foundation/i18n';
import { useFormControl } from '../../foundation/primitives';
import { useControlled } from '../../foundation/state';
import { cn } from '../../foundation/styles';
import { Popover, PopoverContent, PopoverTrigger } from '../overlays';
import { InputState } from './InputStyles';
import { currentPeriodIndex, PeriodKind as PeriodKindValue, periodStartDate } from './PeriodExtensions';
import PeriodGrid from './PeriodGrid.vue';
import { selectTriggerVariants } from './selectPicker/SelectPicker.variants';
import { useNativeFormReset } from './UseNativeFormReset';

/** Renders a trigger that opens a popover period grid and shows the picked month or year. */
defineOptions({ name: 'PeriodPicker', inheritAttrs: false });

const props = withDefaults(defineProps<PeriodPickerProps>(), {
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the field context, and Vue casts
     an absent boolean prop to `false`, which would shadow it. */
  modelValue: undefined,
  defaultValue: null,
  min: null,
  max: null,
  isIndexDisabled: undefined,
  formatIndex: undefined,
  size: undefined,
  id: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks a cell — the `v-model` half. */
  'update:modelValue': [index: number | null];
}>();

const attrs = useAttrs();
const locale = useLocale();
const field = useFormControl();

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const invalid = computed(() => props.isInvalid ?? field?.isInvalid ?? false);

const controlled = useControlled<number | null>({
  /* `null` is a meaningful pick; only `undefined` means uncontrolled. */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});
const value = controlled.value;

const open = ref(false);

function onActivate(index: number): void {
  if (disabled.value || readOnly.value) return;
  controlled.setValue(index);
  open.value = false;
}

const displayText = computed(() => {
  const index = value.value;
  if (index === null) return props.placeholder;
  if (props.formatIndex) return props.formatIndex(index);
  const options: Intl.DateTimeFormatOptions =
    props.kind === PeriodKindValue.Month ? { month: 'long', year: 'numeric' } : { year: 'numeric' };
  return periodStartDate(props.kind, index).toLocaleString(locale.locale.value, options);
});

const initialIndex = computed(() => value.value ?? currentPeriodIndex(props.kind));
const hiddenValue = computed(() => (value.value === null ? '' : props.serializeIndex(value.value)));

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);
const triggerId = computed(() => props.id ?? field?.id);
/* Names the trigger from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (ariaLabel.value ? undefined : field?.labelledBy));
const describedBy = computed(() => field?.describedBy);
const formId = computed(() => (typeof attrs.form === 'string' ? attrs.form : undefined));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'form', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const triggerClass = computed(() =>
  cn(
    selectTriggerVariants({ size: props.size, state: invalid.value ? InputState.Invalid : InputState.Default }),
    attrs.class as ClassValue,
  ),
);
const labelClass = computed(() => cn('truncate', value.value === null && 'text-muted-foreground'));

const trigger = useTemplateRef<{ el: HTMLElement | null }>('trigger');

/** The rendered trigger. */
defineExpose({ el: computed(() => trigger.value?.el ?? null) });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <Popover :key="formResetRevision" v-model:open="open" placement="bottom-start" :offset="6">
    <PopoverTrigger
      ref="trigger"
      :id="triggerId"
      :disabled="disabled || readOnly"
      :aria-invalid="invalid || undefined"
      :aria-label="ariaLabel"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
      :class="triggerClass"
      v-bind="passthroughAttrs"
    >
      <span :class="labelClass">{{ displayText }}</span>
      <CalendarIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
    </PopoverTrigger>
    <PopoverContent is-bare>
      <PeriodGrid
        :kind="props.kind"
        :selected-index="value"
        :initial-index="initialIndex"
        :min="props.min"
        :max="props.max"
        :is-index-disabled="props.isIndexDisabled"
        @activate="onActivate"
      />
    </PopoverContent>
    <input
      v-if="props.name"
      type="hidden"
      :disabled="disabled"
      :form="formId"
      :name="props.name"
      :value="hiddenValue"
    />
    <input ref="formResetAnchor" type="hidden" :form="formId" aria-hidden="true" />
  </Popover>
</template>
