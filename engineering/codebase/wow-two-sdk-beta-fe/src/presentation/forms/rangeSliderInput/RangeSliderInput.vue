<script lang="ts">
/** Defines the track and thumb scale of a range slider. */
export const RangeSliderInputSize = {
  /** Refers to a 4px track with 14px thumbs. */
  Sm: 'sm',
  /** Refers to a 6px track with 16px thumbs. */
  Md: 'md',
  /** Refers to an 8px track with 20px thumbs. */
  Lg: 'lg',
} as const;

export type RangeSliderInputSize = (typeof RangeSliderInputSize)[keyof typeof RangeSliderInputSize];

/** Defines a range value — the start and the end, start never above end. */
export type RangeSliderValue = readonly [start: number, end: number];

/** Defines props for the two-thumb range slider. */
export interface RangeSliderInputProps {
  /** The range, controlled. The `v-model` binding target. */
  readonly modelValue?: RangeSliderValue;

  /** The initial range when uncontrolled. Default the full `[min, max]`. */
  readonly defaultValue?: RangeSliderValue;

  /** The lower bound. Default 0. */
  readonly min?: number;

  /** The upper bound. Default 100. */
  readonly max?: number;

  /** The arrow-key and snapping step. Default 1. */
  readonly step?: number;

  /** The Page Up / Page Down step. Default a tenth of the span, snapped to `step`. */
  readonly largeStep?: number;

  /** The smallest gap kept between the two thumbs. Default 0. */
  readonly minDistance?: number;

  /** The track and thumb scale. Default `md`. */
  readonly size?: RangeSliderInputSize;

  /** The accessible text for a thumb's value. Default the plain number. */
  readonly formatValue?: (value: number) => string;

  /** The start thumb's accessible name. Default `"Minimum"`, localized. */
  readonly startLabel?: string;

  /** The end thumb's accessible name. Default `"Maximum"`, localized. */
  readonly endLabel?: string;

  /** The hidden inputs' shared `name`; the form receives the start and then the end value. */
  readonly name?: string;

  /** The group's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value in form submission. Falls back to the form control. */
  readonly isReadOnly?: boolean;
}

/** @internal The track height per size. */
const TrackClass: Record<RangeSliderInputSize, string> = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

/** @internal The thumb diameter per size, in rem, which also offsets the thumb onto its value. */
const ThumbRem: Record<RangeSliderInputSize, number> = { sm: 0.875, md: 1, lg: 1.25 };

/** @internal The thumb index for each end of the range. */
const ThumbIndex = { Start: 0, End: 1 } as const;

type ThumbIndex = (typeof ThumbIndex)[keyof typeof ThumbIndex];

/** @internal The decimal places of a number, so snapped values carry no floating-point residue. */
function decimalsOf(value: number): number {
  const text = String(value);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  return text.split('.')[1]?.length ?? 0;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { useNativeFormReset } from '../UseNativeFormReset';

/** Renders a track with two thumbs that edit one numeric range, dragged or stepped with the keyboard. */
defineOptions({ name: 'RangeSliderInput', inheritAttrs: false });

const componentProps = withDefaults(defineProps<RangeSliderInputProps>(), {
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and each flag falls back to
     the form control context, which Vue's `boolean` cast to `false` would shadow. */
  modelValue: undefined,
  defaultValue: undefined,
  min: 0,
  max: 100,
  step: 1,
  largeStep: undefined,
  minDistance: 0,
  size: RangeSliderInputSize.Md,
  formatValue: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
});
const props = useLocaleDefaults(componentProps, 'RangeSliderInput', { startLabel: 'Minimum', endLabel: 'Maximum' });

const emit = defineEmits<{
  /** Fires on every change while a thumb moves — the `v-model` half. */
  'update:modelValue': [value: RangeSliderValue];

  /** Fires once a drag ends or a key moves a thumb, with the settled range. */
  commit: [value: RangeSliderValue];
}>();

const attrs = useAttrs();
const ctx = useFormControl();

/** The bounds, ordered and finite. */
const bounds = computed(() => {
  const low = Number.isFinite(props.min) ? props.min : 0;
  const high = Number.isFinite(props.max) ? props.max : low;
  return high < low ? { low: high, high: low } : { low, high };
});

/** The snapping step; a non-positive or non-finite step falls back to 1. */
const stepSize = computed(() => (Number.isFinite(props.step) && props.step > 0 ? props.step : 1));

/** The Page Up / Page Down step. */
const pageStep = computed(() => {
  if (props.largeStep !== undefined && Number.isFinite(props.largeStep) && props.largeStep > 0) return props.largeStep;
  const tenth = (bounds.value.high - bounds.value.low) / 10;
  return Math.max(stepSize.value, Math.round(tenth / stepSize.value) * stepSize.value);
});

/** The smallest gap between the thumbs, kept within the span. */
const gap = computed(() => {
  const span = bounds.value.high - bounds.value.low;
  return Math.min(span, Math.max(0, Number.isFinite(props.minDistance) ? props.minDistance : 0));
});

/** The decimal places every value is rounded to — the finest of the step, the lower bound and the gap. */
const precision = computed(() =>
  Math.max(decimalsOf(stepSize.value), decimalsOf(bounds.value.low), decimalsOf(gap.value)),
);

const controlled = useControlled<RangeSliderValue>({
  controlled: () => props.modelValue,
  default: () => normalize(props.defaultValue ?? [props.min, props.max]),
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

/** The range the thumbs draw — the model, kept inside the bounds and ordered. */
const range = computed(() => normalize(controlled.value.value));

const disabled = computed(() => props.isDisabled ?? ctx?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly ?? false);
const groupId = computed(() => props.id ?? ctx?.id);

/** The thumb a pointer is dragging, or `null`. */
const dragging = shallowRef<ThumbIndex | null>(null);

/** @internal The last range this slider requested; a controlled caller may not have applied it yet. */
let requested: RangeSliderValue | null = null;

const root = useTemplateRef<HTMLDivElement>('root');
const track = useTemplateRef<HTMLDivElement>('track');
const startThumb = useTemplateRef<HTMLDivElement>('startThumb');
const endThumb = useTemplateRef<HTMLDivElement>('endThumb');

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'relative flex h-5 w-full touch-none select-none items-center',
    disabled.value ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    attrs.class as ClassValue,
  ),
);

const thumbClass = computed(() =>
  cn(
    'absolute top-1/2 block -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    disabled.value ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
  ),
);

/** The thumb diameter in rem. */
const thumbRem = computed(() => ThumbRem[props.size] ?? ThumbRem.md);

/** Rounds away floating-point residue at the slider's precision. */
function trim(value: number): number {
  return Number(value.toFixed(precision.value));
}

/** Snaps a value onto the step grid inside the bounds. */
function snap(value: number): number {
  const { low, high } = bounds.value;
  const snapped = low + Math.round((value - low) / stepSize.value) * stepSize.value;
  return Math.min(high, Math.max(low, trim(snapped)));
}

/** Keeps a range inside the bounds, on the step grid and ordered. */
function normalize(value: RangeSliderValue | undefined): RangeSliderValue {
  const { low, high } = bounds.value;
  const start = snap(Number.isFinite(value?.[0]) ? (value?.[0] as number) : low);
  const end = snap(Number.isFinite(value?.[1]) ? (value?.[1] as number) : high);
  return start <= end ? [start, end] : [end, start];
}

/** The position of a value along the track, 0 to 100. */
function percentOf(value: number): number {
  const { low, high } = bounds.value;
  return high === low ? 0 : ((value - low) / (high - low)) * 100;
}

/** The inline-start offset that centres a thumb on its value. */
function thumbStyle(value: number): Record<string, string> {
  const rem = thumbRem.value;
  return {
    insetInlineStart: `calc(${percentOf(value)}% - ${rem / 2}rem)`,
    width: `${rem}rem`,
    height: `${rem}rem`,
  };
}

/** Whether the slider lays out right to left. */
function isRightToLeft(): boolean {
  const node = root.value;
  return node?.ownerDocument.defaultView?.getComputedStyle(node).direction === 'rtl';
}

/** Whether edits are blocked. */
function isInactive(): boolean {
  return disabled.value || readOnly.value;
}

/** Moves one thumb, keeping it on its side of the other thumb; returns the requested range, or `null`. */
function moveThumb(index: ThumbIndex, raw: number): RangeSliderValue | null {
  const [start, end] = range.value;
  const next =
    index === ThumbIndex.Start
      ? ([Math.min(snap(raw), trim(end - gap.value)), end] as const)
      : ([start, Math.max(snap(raw), trim(start + gap.value))] as const);
  const settled = normalize(next);
  if (settled[0] === start && settled[1] === end) return null;
  controlled.setValue(settled);
  requested = settled;
  return settled;
}

/** Resolves the value under a pointer, or `null` when the track has no size. */
function valueAt(event: PointerEvent): number | null {
  const rect = track.value?.getBoundingClientRect();
  if (!rect || rect.width === 0) return null;
  const offset = isRightToLeft() ? rect.right - event.clientX : event.clientX - rect.left;
  const fraction = Math.min(1, Math.max(0, offset / rect.width));
  return bounds.value.low + fraction * (bounds.value.high - bounds.value.low);
}

/** Picks the thumb a press should move — the nearer one, the end thumb when both sit below the press. */
function nearestThumb(value: number): ThumbIndex {
  const [start, end] = range.value;
  if (start === end) return value > end ? ThumbIndex.End : ThumbIndex.Start;
  return Math.abs(value - start) <= Math.abs(value - end) ? ThumbIndex.Start : ThumbIndex.End;
}

function thumbElement(index: ThumbIndex): HTMLDivElement | null {
  return index === ThumbIndex.Start ? startThumb.value : endThumb.value;
}

function handlePointerDown(event: PointerEvent): void {
  if (isInactive() || event.button !== 0 || event.defaultPrevented) return;
  const value = valueAt(event);
  if (value === null) return;
  event.preventDefault();
  const index = nearestThumb(value);
  dragging.value = index;
  requested = null;
  moveThumb(index, value);
  thumbElement(index)?.focus({ preventScroll: true });
  root.value?.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event: PointerEvent): void {
  if (dragging.value === null || isInactive()) return;
  const value = valueAt(event);
  if (value !== null) moveThumb(dragging.value, value);
}

function handlePointerUp(event: PointerEvent): void {
  if (dragging.value === null) return;
  dragging.value = null;
  root.value?.releasePointerCapture?.(event.pointerId);
  emit('commit', requested ?? range.value);
  requested = null;
}

function handleKeydown(event: KeyboardEvent, index: ThumbIndex): void {
  if (isInactive() || event.isComposing || event.defaultPrevented) return;
  const current = range.value[index];
  const rtl = isRightToLeft();
  const increase = rtl ? 'ArrowLeft' : 'ArrowRight';
  const decrease = rtl ? 'ArrowRight' : 'ArrowLeft';
  let next: number;
  switch (event.key) {
    case increase:
    case 'ArrowUp':
      next = current + stepSize.value;
      break;
    case decrease:
    case 'ArrowDown':
      next = current - stepSize.value;
      break;
    case 'PageUp':
      next = current + pageStep.value;
      break;
    case 'PageDown':
      next = current - pageStep.value;
      break;
    case 'Home':
      next = index === ThumbIndex.Start ? bounds.value.low : range.value[0] + gap.value;
      break;
    case 'End':
      next = index === ThumbIndex.End ? bounds.value.high : range.value[1] - gap.value;
      break;
    default:
      return;
  }
  event.preventDefault();
  const settled = moveThumb(index, next);
  if (settled) emit('commit', settled);
}

/** Resolves a thumb's accessible value text. */
function valueText(value: number): string | undefined {
  return props.formatValue?.(value);
}

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

defineExpose({ el: root });
</script>

<template>
  <div
    ref="root"
    :key="formResetRevision"
    role="group"
    :id="groupId"
    :aria-labelledby="ctx?.labelledBy"
    :aria-describedby="ctx?.describedBy"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readOnly ? '' : undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <div ref="track" :class="cn('relative w-full grow overflow-hidden rounded-full bg-muted', TrackClass[size])">
      <div
        class="absolute inset-y-0 bg-primary"
        :style="{ insetInlineStart: `${percentOf(range[0])}%`, insetInlineEnd: `${100 - percentOf(range[1])}%` }"
      />
    </div>
    <div
      ref="startThumb"
      role="slider"
      :tabindex="disabled ? -1 : 0"
      :aria-label="props.startLabel"
      :aria-valuemin="bounds.low"
      :aria-valuemax="trim(range[1] - gap)"
      :aria-valuenow="range[0]"
      :aria-valuetext="valueText(range[0])"
      aria-orientation="horizontal"
      :aria-invalid="ctx?.isInvalid || undefined"
      :aria-disabled="disabled || undefined"
      :aria-readonly="readOnly || undefined"
      :data-dragging="dragging === ThumbIndex.Start ? '' : undefined"
      :class="thumbClass"
      :style="thumbStyle(range[0])"
      @keydown="handleKeydown($event, ThumbIndex.Start)"
    />
    <div
      ref="endThumb"
      role="slider"
      :tabindex="disabled ? -1 : 0"
      :aria-label="props.endLabel"
      :aria-valuemin="trim(range[0] + gap)"
      :aria-valuemax="bounds.high"
      :aria-valuenow="range[1]"
      :aria-valuetext="valueText(range[1])"
      aria-orientation="horizontal"
      :aria-invalid="ctx?.isInvalid || undefined"
      :aria-disabled="disabled || undefined"
      :aria-readonly="readOnly || undefined"
      :data-dragging="dragging === ThumbIndex.End ? '' : undefined"
      :class="thumbClass"
      :style="thumbStyle(range[1])"
      @keydown="handleKeydown($event, ThumbIndex.End)"
    />
    <template v-if="name">
      <input
        v-for="(value, index) in range"
        :key="index"
        type="hidden"
        :name="name"
        :value="value"
        :disabled="disabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      />
    </template>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
