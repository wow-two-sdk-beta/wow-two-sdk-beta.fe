<script lang="ts">
import type { Temporal } from 'temporal-polyfill';

export interface CalendarPickerProps {
  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The selected date, controlled. The `v-model` binding target. */
  readonly modelValue?: Temporal.PlainDate | null;

  /** The uncontrolled initial selection. */
  readonly defaultValue?: Temporal.PlainDate | null;

  /** The initial visible month (uncontrolled). */
  readonly defaultMonth?: Temporal.PlainDate;

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
}
</script>

<script setup lang="ts">
import { useFormControl } from '../../../foundation/primitives';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { isDateDisabled as isOutOfBounds, isSameDay, isToday, startOfMonth, today } from '../DateExtensions';
import MonthGrid from '../MonthGrid.vue';
import type { MonthGridDayProps } from '../MonthGrid.vue';

/** Renders a month grid where one day is picked, navigated by keyboard and bounded by min/max. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'CalendarPicker', inheritAttrs: false });

const props = withDefaults(defineProps<CalendarPickerProps>(), {
  isDateDisabled: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  disabled: undefined,
  readonly: undefined,
});
/** The per-day predicate: `isDateDisabled`, or the deprecated function form of `isDisabled`. */
const dayPredicate = computed(
  () => props.isDateDisabled ?? (typeof props.isDisabled === 'function' ? props.isDisabled : undefined),
);

/** The boolean `isDisabled`, ignoring its deprecated predicate form. */
const disabledFlag = computed(() => (typeof props.isDisabled === 'boolean' ? props.isDisabled : undefined));

const emit = defineEmits<{
  /** Fires when the reader picks a day in the grid. The `v-model` half. */
  'update:modelValue': [date: Temporal.PlainDate | null];
}>();

const attrs = useAttrs();
const field = useFormControl();
const inactive = computed(
  () =>
    (disabledFlag.value ?? props.disabled ?? field?.isDisabled ?? false) ||
    (props.isReadOnly ?? props.readonly ?? field?.isReadOnly ?? false),
);

const controlled = useControlled<Temporal.PlainDate | null>({
  /* `??` is wrong here — `null` is a MEANINGFUL selection ("nothing selected"), and `??`
     would fall through it to `modelValue`. Only `undefined` means "not controlled". */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const selected = controlled.value;

/* `today()` reads the host time zone through `Temporal.Now` — universal, not a browser
   global, so both seeds are safe on the server. */
const viewMonth = ref<Temporal.PlainDate>(startOfMonth(props.defaultMonth ?? selected.value ?? today()));
const focusedDate = ref<Temporal.PlainDate>(selected.value ?? today());

function setViewMonth(next: Temporal.PlainDate): void {
  viewMonth.value = next;
}

function setFocusedDate(next: Temporal.PlainDate): void {
  focusedDate.value = next;
}

function isDayDisabled(d: Temporal.PlainDate): boolean {
  return inactive.value || isOutOfBounds(d, { min: props.min, max: props.max, isDisabled: dayPredicate.value });
}

function onDayActivate(d: Temporal.PlainDate): void {
  if (isDayDisabled(d)) return;
  controlled.setValue(d);
}

/*
 * `hover:text-primary-foreground` is load-bearing, not decoration: `MonthGrid`'s base carries
 * `hover:text-foreground`, and tailwind-merge only drops a class from the same utility group
 * AND the same variant — a plain `text-primary-foreground` does not displace a `hover:text-*`.
 * Without it the selected day's number flipped to near-black on `bg-primary` while hovered.
 *
 * `hover:bg-primary/90` (the package's solid-surface hover, see `Button.variants`) rather than
 * a flat `hover:bg-primary`, so hovering the selected day still reads as a hover.
 */
function dayProps(date: Temporal.PlainDate): MonthGridDayProps {
  const isSelectedCell = isSameDay(selected.value, date);
  return {
    [AriaAttribute.Selected]: isSelectedCell,
    'data-selected': isSelectedCell ? '' : undefined,
    class: cn(
      'rounded-sm',
      isToday(date) && !isSelectedCell && 'border border-border',
      isSelectedCell && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
    ),
  };
}

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. It is
   read off the attrs so it can be relocated onto the inner grid. */
const ariaLabel = computed(() => (attrs[AriaAttribute.Label] as string | undefined) ?? 'Calendar');

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn(attrs.class as ClassValue));

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element. */
defineExpose({ el: root });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <div :key="formResetRevision" ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <MonthGrid
      :view-month="viewMonth"
      @update:viewMonth="setViewMonth"
      :focused-date="focusedDate"
      @update:focusedDate="setFocusedDate"
      :is-day-disabled="isDayDisabled"
      :on-day-activate="onDayActivate"
      :day-props="dayProps"
      :aria-label="ariaLabel"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
