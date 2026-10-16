<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { SelectPickerSize } from '../selectPicker';
import type { InputState } from '../InputStyles';

export interface TimePickerProps {
  /** The selected time, controlled. The `v-model` binding target. */
  readonly modelValue?: Temporal.PlainTime | null;

  /** The uncontrolled initial selection. */
  readonly defaultValue?: Temporal.PlainTime | null;

  /** The minute interval. Default 5. */
  readonly minuteStep?: number;
  /** Inclusive same-day time bounds. */
  readonly min?: Temporal.PlainTime | null;
  readonly max?: Temporal.PlainTime | null;

  /** The empty-state text on the trigger. */
  readonly placeholder?: string;

  /**
   * The trigger's time formatter.
   *
   * Kept a PROP, not an emit: it RETURNS the rendered string, which an emit cannot do.
   */
  readonly format?: (time: Temporal.PlainTime) => string;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The hidden input name; when set, a hidden input ships the value with form submission. */
  readonly name?: string;

  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The validity surface. */
  readonly state?: InputState;

  /** The trigger's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Clock } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { selectTriggerVariants } from '../selectPicker/SelectPicker.variants';
import { InputState as InputStateValue } from '../InputStyles';
import { isTimeInBounds } from '../DateExtensions';
import TimeColumns from '../TimeColumns.vue';

/** Renders a trigger button that opens popover hour and minute columns and shows the picked time. */
/* `inheritAttrs: false` so `class` folds into the trigger's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'TimePicker', inheritAttrs: false });

const inputProps = withDefaults(defineProps<TimePickerProps>(), {
  minuteStep: 5,

  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context, and Vue casts an absent `boolean` prop to `false` — which would shadow it. */
  isInvalid: undefined,
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});
const locale = useLocale();
const props = useLocaleDefaults(inputProps, 'TimePicker', { placeholder: 'Pick a time' });

const emit = defineEmits<{
  /** Fires when the reader picks an hour or a minute in the popover. The `v-model` half. */
  'update:modelValue': [time: Temporal.PlainTime | null];
}>();

const attrs = useAttrs();

/* Inherits id/disabled/invalid/labelledby/describedby from a surrounding <Field>;
   standalone props win when provided, context fills the gaps (SelectPicker parity). */
const field = useFormControl();

const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? field?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? field?.isReadOnly ?? false);
const finalInvalid = computed(() => props.isInvalid ?? field?.isInvalid);

const controlled = useControlled<Temporal.PlainTime | null>({
  /* `??` is wrong here — `null` is a MEANINGFUL selection, and `??` would fall through it
     to `modelValue`. Only `undefined` means "not controlled". */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const time = controlled.value;

const open = ref(false);

const triggerState = computed(
  () => props.state ?? (finalInvalid.value ? InputStateValue.Invalid : InputStateValue.Default),
);

/* The columns live in the shared `TimeColumns` — the same panel `TimeInput` and
   `DateTimeInput` open, so the three cannot drift. */
function onColumnsChange(next: Temporal.PlainTime): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  if (isTimeInBounds(next, props.min, props.max)) controlled.setValue(next);
}

const displayText = computed(() =>
  time.value
    ? (props.format?.(time.value) ??
      time.value.toLocaleString(locale.locale.value, { hour: '2-digit', minute: '2-digit' }))
    : props.placeholder,
);

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

const triggerId = computed(() => props.id ?? field?.id);
/* Names the trigger from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (ariaLabel.value ? undefined : field?.labelledBy));
const describedBy = computed(() => field?.describedBy);
const ariaInvalid = computed(() => triggerState.value === InputStateValue.Invalid || undefined);

const hiddenValue = computed(() => time.value?.toString({ smallestUnit: 'minute' }) ?? '');

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const triggerClass = computed(() =>
  cn(selectTriggerVariants({ size: props.size, state: triggerState.value }), attrs.class as ClassValue),
);

const labelClass = computed(() => cn('truncate', !time.value && 'text-muted-foreground'));

const trigger = useTemplateRef<{ el: HTMLElement | null }>('trigger');

/** The rendered trigger — the Vue stand-in for the React original's forwarded ref. */
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
      :disabled="finalDisabled || finalReadOnly"
      :aria-invalid="ariaInvalid"
      :aria-label="ariaLabel"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
      :class="triggerClass"
      v-bind="passthroughAttrs"
    >
      <!-- `muted-foreground` (not `subtle-foreground`): the trigger surface is muted, where
           subtle is only 4.2:1 (see index.css). -->
      <span :class="labelClass">{{ displayText }}</span>
      <Clock class="h-4 w-4 shrink-0 text-muted-foreground" />
    </PopoverTrigger>
    <PopoverContent is-bare>
      <TimeColumns
        :is-disabled="finalDisabled || finalReadOnly"
        :min="min"
        :max="max"
        :model-value="time"
        :minute-step="minuteStep"
        @update:modelValue="onColumnsChange"
      />
    </PopoverContent>
    <input
      v-if="name && time"
      type="hidden"
      :disabled="finalDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="hiddenValue"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </Popover>
</template>
