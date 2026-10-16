<script lang="ts">
export interface ColorAreaProps {
  /** The hue the square is tinted with (0–360). */
  readonly hue?: number;

  /** The saturation, controlled (0–1). The `v-model:saturation` binding target. */
  readonly saturation?: number;

  /** The initial saturation when uncontrolled. */
  readonly defaultSaturation?: number;

  /** The brightness/value, controlled (0–1). The `v-model:value` binding target. */
  readonly value?: number;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: number;

  /** The arrow-key increment. `PageUp`/`PageDown` move ten steps. */
  readonly step?: number;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
  /** Prevents editing without removing keyboard focus. */
  readonly isReadOnly?: boolean;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef, type StyleValue } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { clamp01, hsvToHex } from '../ColorExtensions';

/** Renders a two-axis saturation/value square, pointer-draggable and keyboard-operable as an ARIA slider. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ColorArea', inheritAttrs: false });

const props = withDefaults(defineProps<ColorAreaProps>(), {
  hue: 0,
  step: 0.01,
  /* Explicit `undefined` default: the flag falls back to the form control context, and Vue
     casts an absent `boolean` prop to `false` — which would shadow the context. */
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when a drag or arrow key lands the thumb on a new saturation — the `v-model:saturation` half. */
  'update:saturation': [value: number];
  /** Fires when a drag or arrow key lands the thumb on a new brightness — the `v-model:value` half. */
  'update:value': [value: number];
}>();

const attrs = useAttrs();
const locale = useLocale();

const saturationControlled = useControlled<number>({
  controlled: () => props.saturation,
  default: () => props.defaultSaturation ?? 1,
  onChange: (next) => emit('update:saturation', next),
});
const valueControlled = useControlled<number>({
  controlled: () => props.value,
  default: () => props.defaultValue ?? 1,
  onChange: (next) => emit('update:value', next),
});

const s = saturationControlled.value;
const v = valueControlled.value;

/* Inherits id/disabled/invalid/labelling from a surrounding <Field>; explicit props win. */
const ctx = useFormControl();
const disabled = computed(() => props.isDisabled ?? ctx?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly ?? false);
const inactive = computed(() => disabled.value || readOnly.value);

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel` and
   stop reaching the DOM. It is read off the attrs so it can be relocated onto the track. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

/* Names the area from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (!ariaLabel.value ? ctx?.labelledBy : undefined));

const track = useTemplateRef<HTMLDivElement>('track');

function commit(nextS: number, nextV: number): void {
  if (inactive.value || !Number.isFinite(nextS) || !Number.isFinite(nextV)) return;
  const cs = clamp01(nextS);
  const cv = clamp01(nextV);
  saturationControlled.setValue(cs);
  valueControlled.setValue(cv);
}

/* `getBoundingClientRect` is safe unguarded — pointer handlers never run on the server. */
function updateFromClient(clientX: number, clientY: number): void {
  const node = track.value;
  if (!node) return;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const xRatio = clamp01((clientX - rect.left) / rect.width);
  const yRatio = clamp01((clientY - rect.top) / rect.height);
  commit(xRatio, 1 - yRatio);
}

function onPointerdown(event: PointerEvent): void {
  if (event.defaultPrevented) return;
  if (inactive.value) return;
  if (event.button !== 0) return;
  event.preventDefault();
  track.value?.querySelector<HTMLElement>('[role=slider]')?.focus();
  (event.target as Element).setPointerCapture?.(event.pointerId);
  updateFromClient(event.clientX, event.clientY);
}

function onPointermove(event: PointerEvent): void {
  if (event.defaultPrevented) return;
  if (inactive.value || event.buttons !== 1) return;
  updateFromClient(event.clientX, event.clientY);
}

function onAxisKeydown(event: KeyboardEvent, axis: 'saturation' | 'value'): void {
  if (event.isComposing || event.defaultPrevented || inactive.value) return;
  const step = Number.isFinite(props.step) && props.step > 0 ? props.step : 0.01;
  const current = axis === 'saturation' ? s.value : v.value;
  let next = current;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      next += step;
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      next -= step;
      break;
    case 'PageUp':
      next += step * 10;
      break;
    case 'PageDown':
      next -= step * 10;
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  if (axis === 'saturation') commit(next, v.value);
  else commit(s.value, next);
}

const trackStyle = computed<StyleValue>(() => [
  attrs.style as StyleValue,
  {
    backgroundImage: 'linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, transparent)',
    backgroundColor: `hsl(${props.hue}, 100%, 50%)`,
  },
]);

const thumbStyle = computed<StyleValue>(() => ({
  left: `${s.value * 100}%`,
  top: `${(1 - v.value) * 100}%`,
  backgroundColor: hsvToHex({ h: props.hue, s: s.value, v: v.value }),
}));

const controlId = computed(() => props.id ?? ctx?.id);
const finalAriaLabel = computed(() => ariaLabel.value ?? (labelledBy.value ? undefined : 'Saturation and value'));
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'style', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'relative aspect-square w-full select-none rounded-md border border-border focus-within:outline-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
    disabled.value && 'pointer-events-none opacity-50',
    attrs.class as ClassValue,
  ),
);

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: track });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  saturationControlled.reset();
  valueControlled.reset();
});
</script>

<template>
  <div
    :key="formResetRevision"
    ref="track"
    role="group"
    :id="controlId"
    :aria-label="finalAriaLabel"
    :aria-labelledby="labelledBy"
    :aria-invalid="isInvalid"
    :aria-describedby="describedBy"
    :aria-disabled="disabled || undefined"
    :aria-readonly="readOnly || undefined"
    :data-disabled="disabled ? '' : undefined"
    :style="trackStyle"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @pointerdown="onPointerdown"
    @pointermove="onPointermove"
  >
    <div
      aria-hidden="true"
      :style="thumbStyle"
      class="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/20"
    />
    <span
      role="slider"
      class="sr-only"
      :tabindex="disabled ? -1 : 0"
      :aria-label="locale.t('ColorArea.saturation', undefined, 'Saturation')"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="Math.round(s * 100)"
      :aria-valuetext="`${Math.round(s * 100)}%`"
      :aria-disabled="disabled || undefined"
      :aria-readonly="readOnly || undefined"
      @keydown="onAxisKeydown($event, 'saturation')"
    />
    <span
      role="slider"
      class="sr-only"
      :tabindex="disabled ? -1 : 0"
      :aria-label="locale.t('ColorArea.value', undefined, 'Brightness')"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="Math.round(v * 100)"
      :aria-valuetext="`${Math.round(v * 100)}%`"
      :aria-disabled="disabled || undefined"
      :aria-readonly="readOnly || undefined"
      @keydown="onAxisKeydown($event, 'value')"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
