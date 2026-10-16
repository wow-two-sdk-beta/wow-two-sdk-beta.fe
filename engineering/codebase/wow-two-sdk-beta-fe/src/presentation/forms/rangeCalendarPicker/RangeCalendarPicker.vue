<script lang="ts">
import type { Temporal } from 'temporal-polyfill';

/** A completed date range. Both ends are set; the in-progress state is internal. */
export interface DateRange {
  readonly start: Temporal.PlainDate;
  readonly end: Temporal.PlainDate;
}

export interface RangeCalendarPickerProps {
  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The selected range, controlled. The `v-model` binding target. */
  readonly modelValue?: DateRange | null;

  /** The uncontrolled initial selection. */
  readonly defaultValue?: DateRange | null;

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
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { isDateDisabled as isOutOfBounds, isInRange, isSameDay, isToday, startOfMonth, today } from '../DateExtensions';
import MonthGrid from '../MonthGrid.vue';
import type { MonthGridDayProps } from '../MonthGrid.vue';

/** Renders a month grid where two clicks set a range, previewing the span under the pointer. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'RangeCalendarPicker', inheritAttrs: false });

const props = withDefaults(defineProps<RangeCalendarPickerProps>(), {
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
  /** Fires when the second click completes the range, or the first clears it. The `v-model` half. */
  'update:modelValue': [range: DateRange | null];
}>();

const attrs = useAttrs();
const field = useFormControl();
const inactive = computed(
  () =>
    (disabledFlag.value ?? props.disabled ?? field?.isDisabled ?? false) ||
    (props.isReadOnly ?? props.readonly ?? field?.isReadOnly ?? false),
);

const controlled = useControlled<DateRange | null>({
  /* `??` is wrong here — `null` is a MEANINGFUL selection ("nothing selected"), and `??`
     would fall through it to `modelValue`. Only `undefined` means "not controlled". */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const range = controlled.value;

/* `today()` reads the host time zone through `Temporal.Now` — universal, not a browser
   global, so both seeds are safe on the server. */
const viewMonth = ref<Temporal.PlainDate>(startOfMonth(props.defaultMonth ?? range.value?.start ?? today()));
const focusedDate = ref<Temporal.PlainDate>(range.value?.start ?? today());
const hoveredDate = ref<Temporal.PlainDate | null>(null);
const pendingStart = ref<Temporal.PlainDate | null>(null);

function setViewMonth(next: Temporal.PlainDate): void {
  viewMonth.value = next;
}

function setFocusedDate(next: Temporal.PlainDate): void {
  focusedDate.value = next;
}

function isDayDisabled(d: Temporal.PlainDate): boolean {
  return inactive.value || isOutOfBounds(d, { min: props.min, max: props.max, isDisabled: dayPredicate.value });
}

function onDayActivate(date: Temporal.PlainDate): void {
  if (isDayDisabled(date)) return;
  if (!pendingStart.value) {
    /* First click opens a pending range; the public value clears until both ends are set
       (a `DateRange` always carries a real start and end). */
    pendingStart.value = date;
    controlled.setValue(null);
    return;
  }
  const forward = TemporalValue.PlainDate.compare(pendingStart.value, date) <= 0;
  const finalStart = forward ? pendingStart.value : date;
  const finalEnd = forward ? date : pendingStart.value;
  controlled.setValue({ start: finalStart, end: finalEnd });
  pendingStart.value = null;
}

const previewEnd = computed(() => (pendingStart.value ? hoveredDate.value : (range.value?.end ?? null)));

function isStart(d: Temporal.PlainDate): boolean {
  return isSameDay(d, range.value?.start ?? null) || isSameDay(d, pendingStart.value);
}

function isEnd(d: Temporal.PlainDate): boolean {
  return isSameDay(d, range.value?.end ?? null);
}

function inRange(d: Temporal.PlainDate): boolean {
  return isInRange(d, pendingStart.value ?? range.value?.start, previewEnd.value);
}

function dayProps(date: Temporal.PlainDate): MonthGridDayProps {
  const startCell = isStart(date);
  const endCell = isEnd(date);
  const rangeCell = inRange(date) && !startCell && !endCell;
  const selected = startCell || endCell;
  return {
    [AriaAttribute.Selected]: selected,
    'data-range-start': startCell ? '' : undefined,
    'data-range-end': endCell ? '' : undefined,
    'data-in-range': rangeCell ? '' : undefined,
    onPointerenter: () => {
      hoveredDate.value = date;
    },
    onPointerleave: () => {
      if (isSameDay(hoveredDate.value, date)) hoveredDate.value = null;
    },
    /*
     * Every painted cell has to restate BOTH `hover:bg-*` and `hover:text-*`. `MonthGrid`'s
     * base hover is `hover:bg-primary/10 hover:text-foreground`, and a `:hover` rule outranks
     * the unqualified `bg-primary` / `bg-primary-soft` here on specificity — so without an
     * explicit hover the selected ends and the in-range run lost their fill the moment the
     * pointer touched them. tailwind-merge only resolves same-group + same-variant pairs.
     *
     * The ladder: `/90` on the solid ends (the package's solid-surface hover), `/25` on the
     * in-range run — a step deeper than its `primary-soft` fill, so the hover reads against
     * the range without competing with the ends.
     */
    class: cn(
      isToday(date) && !startCell && !endCell && 'border border-border rounded-sm',
      rangeCell &&
        'bg-primary-soft text-primary-soft-foreground hover:bg-primary/25 hover:text-primary-soft-foreground',
      startCell && 'bg-primary text-primary-foreground rounded-l-sm hover:bg-primary/90 hover:text-primary-foreground',
      endCell && 'bg-primary text-primary-foreground rounded-r-sm hover:bg-primary/90 hover:text-primary-foreground',
      !startCell && !endCell && !rangeCell && 'rounded-sm',
    ),
  };
}

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. It is
   read off the attrs so it can be relocated onto the inner grid. */
const ariaLabel = computed(() => (attrs[AriaAttribute.Label] as string | undefined) ?? 'Date range');

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
  pendingStart.value = null;
  hoveredDate.value = null;
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
