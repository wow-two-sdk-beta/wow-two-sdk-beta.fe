<script lang="ts">
/** Defines the accent palette of a knob's value arc. */
export const KnobInputTone = {
  /** Refers to the primary brand accent. */
  Brand: 'brand',
  /** Refers to the positive/confirmation accent. */
  Success: 'success',
  /** Refers to the caution accent. */
  Warning: 'warning',
  /** Refers to the destructive/error accent. */
  Danger: 'danger',
  /** Refers to the muted/neutral accent. */
  Muted: 'muted',
} as const;

export type KnobInputTone = (typeof KnobInputTone)[keyof typeof KnobInputTone];

const ToneClass: Record<KnobInputTone, string> = {
  brand: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

export interface KnobInputProps {
  /** The value, controlled. The `v-model` binding target. */
  readonly modelValue?: number;

  /** The initial value when uncontrolled. Defaults to `min`. */
  readonly defaultValue?: number;

  /** The lower bound. Default `0`. */
  readonly min?: number;

  /** The upper bound. Default `1`. */
  readonly max?: number;

  /** The arrow-key / wheel step. Default `0.01`. */
  readonly step?: number;

  /** The Shift+arrow step. Default `0.1`. */
  readonly largeStep?: number;

  /** The knob's pixel diameter. Default `64`. */
  readonly size?: number;

  /** The sweep of the value arc in degrees. Default `270`. */
  readonly arcDegrees?: number;

  /** The accent palette. Default `brand`. */
  readonly tone?: KnobInputTone;

  /**
   * The readout formatter. Default `(v) => v.toFixed(2)`.
   *
   * Kept a PROP, not an emit: it RETURNS the rendered text, which an emit cannot do.
   */
  readonly format?: (value: number) => string | number;

  /** Whether the formatted readout renders in the centre. Default `true`. */
  readonly isValueShown?: boolean;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
  /** Prevents edits without excluding the value from form submission. */
  readonly isReadOnly?: boolean;

  /** The hidden input name; the hidden input emits the numeric value. */
  readonly name?: string;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useEventListener } from '../../../foundation/dom';
import { useFormControl } from '../../../foundation/primitives';
import { useLocale } from '../../../foundation/i18n';

/** Renders a rotational dial whose arc, pointer and readout track one value, turned by drag, wheel or arrow keys. */
/* `inheritAttrs: false` so `class` folds into the root's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'KnobInput', inheritAttrs: false });

const props = withDefaults(defineProps<KnobInputProps>(), {
  min: 0,
  max: 1,
  step: 0.01,
  largeStep: 0.1,
  size: 64,
  arcDegrees: 270,
  tone: 'brand',
  format: (v: number) => v.toFixed(2),
  isValueShown: true,
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  defaultValue: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader turns the dial by drag, wheel or key — the `v-model` half. */
  'update:modelValue': [value: number];
}>();

const attrs = useAttrs();
const locale = useLocale();

const controlled = useControlled<number>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? props.min,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const current = controlled.value;

/* Inherits id/disabled/invalid/labelling from a surrounding <Field>; explicit props win. */
const ctx = useFormControl();
const disabled = computed(() => props.isDisabled ?? ctx?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly ?? false);
const inactive = computed(() => disabled.value || readOnly.value);

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`, so
   `props['aria-label']` is always undefined and no accessible name renders. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);
/* Names the knob from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (!ariaLabel.value ? ctx?.labelledBy : undefined));

const container = useTemplateRef<HTMLDivElement>('container');
const dragState = ref<{ startY: number; startValue: number } | null>(null);

const fraction = computed(() => (clamp(current.value, props.min, props.max) - props.min) / (props.max - props.min));
const halfArc = computed(() => props.arcDegrees / 2);
const startAngle = computed(() => -halfArc.value - 90); // -90 puts 0° at top
const endAngle = computed(() => halfArc.value - 90);
const angle = computed(() => startAngle.value + fraction.value * props.arcDegrees);

function setClamped(v: number): void {
  controlled.setValue(clamp(v, props.min, props.max));
}

function onPointerDown(event: PointerEvent): void {
  if (inactive.value || event.button !== 0) return;
  dragState.value = { startY: event.clientY, startValue: current.value };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  const drag = dragState.value;
  if (inactive.value || !drag) return;
  const dy = drag.startY - event.clientY; // up = increase
  const range = props.max - props.min;
  const sensitivity = range / 200; // 200px drag = full range
  setClamped(drag.startValue + dy * sensitivity);
}

function onPointerUp(event: PointerEvent): void {
  if (!dragState.value) return;
  dragState.value = null;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
}

/* Wheel through a non-passive listener attached to the element — Vue's `@wheel` lands as a
   passive listener on some engines, and `preventDefault` inside it cannot stop the page scroll.
   `useEventListener` is post-flush and re-attaches when the ref resolves, so nothing here runs
   during SSR; the handler reads state live rather than capturing it. */
useEventListener(
  'wheel',
  (event) => {
    if (inactive.value) return;
    event.preventDefault();
    const delta = (event as WheelEvent).deltaY < 0 ? props.step : -props.step;
    setClamped(current.value + delta);
  },
  container,
  { passive: false },
);

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (inactive.value) return;
  const s = event.shiftKey ? props.largeStep : props.step;
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      event.preventDefault();
      setClamped(current.value + s);
      break;
    case 'ArrowDown':
    case 'ArrowLeft':
      event.preventDefault();
      setClamped(current.value - s);
      break;
    case 'Home':
      event.preventDefault();
      setClamped(props.min);
      break;
    case 'End':
      event.preventDefault();
      setClamped(props.max);
      break;
  }
}

// SVG arc path math.
const radius = computed(() => props.size / 2 - 4);
const center = computed(() => props.size / 2);

function polar(deg: number, r: number): readonly [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [center.value + r * Math.cos(rad), center.value + r * Math.sin(rad)] as const;
}

const trackStart = computed(() => polar(startAngle.value, radius.value));
const trackEnd = computed(() => polar(endAngle.value, radius.value));
const largeArc = computed(() => (props.arcDegrees > 180 ? 1 : 0));

const trackPath = computed(
  () =>
    `M ${trackStart.value[0]} ${trackStart.value[1]} A ${radius.value} ${radius.value} 0 ${largeArc.value} 1 ${trackEnd.value[0]} ${trackEnd.value[1]}`,
);

const valueEnd = computed(() => polar(angle.value, radius.value));
const valueLargeArc = computed(() => (fraction.value * props.arcDegrees > 180 ? 1 : 0));

const valuePath = computed(
  () =>
    `M ${trackStart.value[0]} ${trackStart.value[1]} A ${radius.value} ${radius.value} 0 ${valueLargeArc.value} 1 ${valueEnd.value[0]} ${valueEnd.value[1]}`,
);

const pointerInner = computed(() => polar(angle.value, radius.value * 0.45));
const pointerOuter = computed(() => polar(angle.value, radius.value * 0.85));

const knobId = computed(() => props.id ?? ctx?.id);
const readout = computed(() => props.format(current.value));

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  touchAction: 'none',
}));

const rootClass = computed(() =>
  cn(
    'relative inline-flex select-none items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    ToneClass[props.tone],
    disabled.value ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing',
    attrs.class as ClassValue,
  ),
);

/** The rendered root `<div>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: container });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <div
    :key="formResetRevision"
    ref="container"
    role="slider"
    :id="knobId"
    :aria-label="ariaLabel ?? (labelledBy ? undefined : locale.t('KnobInput.label', undefined, 'Knob'))"
    :aria-labelledby="labelledBy"
    :aria-valuenow="current"
    :aria-valuemin="min"
    :aria-valuemax="max"
    aria-orientation="vertical"
    :aria-invalid="ctx?.isInvalid || undefined"
    :aria-describedby="ctx?.describedBy"
    :aria-disabled="disabled || undefined"
    :aria-readonly="readOnly || undefined"
    :tabindex="disabled ? -1 : 0"
    :style="rootStyle"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <svg :width="size" :height="size" class="overflow-visible">
      <path
        :d="trackPath"
        fill="none"
        stroke="currentColor"
        :stroke-width="4"
        stroke-linecap="round"
        class="opacity-20"
      />
      <path :d="valuePath" fill="none" stroke="currentColor" :stroke-width="4" stroke-linecap="round" />
      <line
        :x1="pointerInner[0]"
        :y1="pointerInner[1]"
        :x2="pointerOuter[0]"
        :y2="pointerOuter[1]"
        stroke="currentColor"
        :stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
    <span
      v-if="isValueShown"
      aria-hidden="true"
      class="absolute inset-0 grid place-items-center text-[10px] font-medium tabular-nums text-foreground"
    >
      {{ readout }}
    </span>
    <input
      v-if="name"
      type="hidden"
      :disabled="disabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="current"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
