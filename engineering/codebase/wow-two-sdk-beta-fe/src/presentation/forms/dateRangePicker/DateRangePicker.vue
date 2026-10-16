<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { SelectPickerSize } from '../selectPicker';
import type { InputState } from '../InputStyles';
import type { DateRange } from '../rangeCalendarPicker';

export interface DateRangePickerProps {
  /** The selected range, controlled. The `v-model` binding target. */
  readonly modelValue?: DateRange | null;

  /** The uncontrolled initial selection. */
  readonly defaultValue?: DateRange | null;

  /** The empty-state text on the trigger. */
  readonly placeholder?: string;

  /**
   * The trigger's date formatter.
   *
   * Kept a PROP, not an emit: it RETURNS the rendered string, which an emit cannot do.
   */
  readonly format?: (date: Temporal.PlainDate) => string;

  /** The minimum selectable date. */
  readonly min?: Temporal.PlainDate | null;

  /** The maximum selectable date. */
  readonly max?: Temporal.PlainDate | null;

  /** The custom per-day disable predicate. Kept a prop: it returns a value. */
  readonly isDateDisabled?: (date: Temporal.PlainDate) => boolean;

  /**
   * The disabled state. Falls back to the surrounding field's `isDisabled`. A function here is the deprecated
   * spelling of `isDateDisabled`, still honoured this release.
   */
  readonly isDisabled?: boolean | ((date: Temporal.PlainDate) => boolean);

  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The hidden input name; when set, two hidden inputs (`{name}_start`, `{name}_end`) ship the ISO values. */
  readonly name?: string;

  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The validity surface. */
  readonly state?: InputState;

  /** The trigger's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Calendar as CalendarIcon } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { selectTriggerVariants } from '../selectPicker/SelectPicker.variants';
import { InputState as InputStateValue } from '../InputStyles';
import { formatISODate, today } from '../DateExtensions';
import RangeCalendarPicker from '../rangeCalendarPicker/RangeCalendarPicker.vue';

/** Renders a trigger button that opens a popover `RangeCalendarPicker` and closes once both ends are set. */
/* `inheritAttrs: false` so `class` folds into the trigger's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'DateRangePicker', inheritAttrs: false });

const inputProps = withDefaults(defineProps<DateRangePickerProps>(), {
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context, and Vue casts an absent `boolean` prop to `false` — which would shadow it. */
  isInvalid: undefined,
  isDateDisabled: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  disabled: undefined,
  readonly: undefined,
});
const locale = useLocale();
const props = useLocaleDefaults(inputProps, 'DateRangePicker', { placeholder: 'Pick a range' });

/** The per-day predicate: `isDateDisabled`, or the deprecated function form of `isDisabled`. */
const dayPredicate = computed(
  () => props.isDateDisabled ?? (typeof props.isDisabled === 'function' ? props.isDisabled : undefined),
);

/** The boolean `isDisabled`, ignoring its deprecated predicate form. */
const disabledFlag = computed(() => (typeof props.isDisabled === 'boolean' ? props.isDisabled : undefined));

const emit = defineEmits<{
  /** Fires when a click in the popover completes or clears the range. The `v-model` half. */
  'update:modelValue': [range: DateRange | null];
}>();

const attrs = useAttrs();

/* Inherits id/disabled/invalid/labelledby/describedby from a surrounding <Field>;
   standalone props win when provided, context fills the gaps (SelectPicker parity). */
const field = useFormControl();

const finalDisabled = computed(() => disabledFlag.value ?? props.disabled ?? field?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? field?.isReadOnly ?? false);
const finalInvalid = computed(() => props.isInvalid ?? field?.isInvalid);

const controlled = useControlled<DateRange | null>({
  /* `??` is wrong here — `null` is a MEANINGFUL selection, and `??` would fall through it
     to `modelValue`. Only `undefined` means "not controlled". */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const range = controlled.value;

const open = ref(false);

/*
 * Auto-close when a pick completes the range. Watches the range only: opening over an already complete range (a
 * saved stay, a preset) must not close the panel the moment it opens. NOT `immediate` — an immediate watcher runs
 * during setup, on the server too.
 */
watch(range, (nextRange, previousRange) => {
  const complete = Boolean(nextRange?.start && nextRange?.end);
  const wasComplete = Boolean(previousRange?.start && previousRange?.end);
  if (complete && !wasComplete && open.value) open.value = false;
});

function onCalendarChange(next: DateRange | null): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  controlled.setValue(next);
}

const triggerState = computed(
  () => props.state ?? (finalInvalid.value ? InputStateValue.Invalid : InputStateValue.Default),
);

const display = computed(() => {
  const current = range.value;
  if (!current?.start) return null;
  return current.end ? `${formatDate(current.start)} → ${formatDate(current.end)}` : `${formatDate(current.start)} → …`;
});

const formatDate = (date: Temporal.PlainDate): string =>
  props.format?.(date) ?? date.toLocaleString(locale.locale.value, { year: 'numeric', month: 'short', day: 'numeric' });
const displayText = computed(() => display.value ?? props.placeholder);

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

const triggerId = computed(() => props.id ?? field?.id);
/* Names the trigger from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (ariaLabel.value ? undefined : field?.labelledBy));
const describedBy = computed(() => field?.describedBy);
const ariaInvalid = computed(() => triggerState.value === InputStateValue.Invalid || undefined);

const defaultMonth = computed(() => range.value?.start ?? today());
const hiddenStart = computed(() => formatISODate(range.value?.start));
const hiddenEnd = computed(() => formatISODate(range.value?.end));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const triggerClass = computed(() =>
  cn(selectTriggerVariants({ size: props.size, state: triggerState.value }), attrs.class as ClassValue),
);

const labelClass = computed(() => cn('truncate', !display.value && 'text-muted-foreground'));

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
      <CalendarIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
    </PopoverTrigger>
    <PopoverContent is-bare>
      <RangeCalendarPicker
        :model-value="range"
        :default-month="defaultMonth"
        :min="min"
        :max="max"
        :is-date-disabled="dayPredicate"
        :is-disabled="Boolean(finalDisabled || finalReadOnly)"
        @update:modelValue="onCalendarChange"
      />
    </PopoverContent>
    <template v-if="name">
      <input
        type="hidden"
        :disabled="finalDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}_start`"
        :value="hiddenStart"
      />
      <input
        type="hidden"
        :disabled="finalDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}_end`"
        :value="hiddenEnd"
      />
    </template>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </Popover>
</template>
