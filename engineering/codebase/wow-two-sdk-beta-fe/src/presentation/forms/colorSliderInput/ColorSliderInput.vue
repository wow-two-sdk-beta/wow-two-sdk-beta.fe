<script lang="ts">
import type { CSSProperties } from 'vue';
import type { HSV } from '../ColorExtensions';

/** Defines which HSV/alpha channel a color slider drives. */
export const ColorChannel = {
  /** Refers to the hue channel (0–360°). */
  Hue: 'hue',
  /** Refers to the saturation channel (0–1). */
  Saturation: 'saturation',
  /** Refers to the value/brightness channel (0–1). */
  Value: 'value',
  /** Refers to the alpha/opacity channel (0–1). */
  Alpha: 'alpha',
} as const;

export type ColorChannel = (typeof ColorChannel)[keyof typeof ColorChannel];

export interface ColorSliderInputProps {
  /** The channel the track drives. */
  readonly channel?: ColorChannel;

  /** The channel value, controlled. The `v-model` binding target. */
  readonly modelValue?: number;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: number;

  /** The surrounding color the non-hue gradients are built from. */
  readonly color?: HSV;

  /** The arrow-key increment. Defaults to `1` for hue, `0.01` otherwise. */
  readonly step?: number;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
  /** Prevents editing without removing keyboard focus. */
  readonly isReadOnly?: boolean;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;
}

export function channelMax(channel: ColorChannel): number {
  return channel === ColorChannel.Hue ? 360 : 1;
}

export function defaultStep(channel: ColorChannel): number {
  return channel === ColorChannel.Hue ? 1 : 0.01;
}

const CheckerboardBackground: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
};
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef, type StyleValue } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { clamp01, clampHue, hsvToHex } from '../ColorExtensions';

/** Renders a single-channel hue/saturation/value/alpha track, pointer-draggable and keyboard-operable as a slider. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ColorSliderInput', inheritAttrs: false });

const props = withDefaults(defineProps<ColorSliderInputProps>(), {
  channel: ColorChannel.Hue,
  /* Explicit `undefined` default: the flag falls back to the form control context, and Vue
     casts an absent `boolean` prop to `false` — which would shadow the context. */
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when a drag or arrow key lands the thumb on a new channel value — the `v-model` half. */
  'update:modelValue': [value: number];
}>();

const attrs = useAttrs();

const max = computed(() => channelMax(props.channel));
const stepValue = computed(() => props.step ?? defaultStep(props.channel));

const controlled = useControlled<number>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? 0,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const val = controlled.value;

/* Inherits id/disabled/invalid/labelling from a surrounding <Field>; explicit props win. */
const ctx = useFormControl();
const disabled = computed(() => props.isDisabled ?? ctx?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly ?? false);
const inactive = computed(() => disabled.value || readOnly.value);

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel` and
   stop reaching the DOM. It is read off the attrs so it can be relocated onto the track. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

/* Names the track from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (!ariaLabel.value ? ctx?.labelledBy : undefined));

const track = useTemplateRef<HTMLDivElement>('track');
const root = useTemplateRef<HTMLDivElement>('root');

/* `getBoundingClientRect` is safe unguarded — pointer handlers never run on the server. */
function updateFromClientX(clientX: number): void {
  const node = track.value;
  if (!node) return;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const ratio = clamp01((clientX - rect.left) / rect.width);
  const next = ratio * max.value;
  /* next is already within [0, max] — clampHue would wrap a full-right drag (360) back to 0. */
  controlled.setValue(props.channel === ColorChannel.Hue ? next : clamp01(next));
}

function onPointerdown(event: PointerEvent): void {
  if (event.defaultPrevented) return;
  if (inactive.value) return;
  if (event.button !== 0) return;
  event.preventDefault();
  track.value?.focus();
  (event.target as Element).setPointerCapture?.(event.pointerId);
  updateFromClientX(event.clientX);
}

function onPointermove(event: PointerEvent): void {
  if (event.defaultPrevented) return;
  if (inactive.value) return;
  if (event.buttons !== 1) return;
  updateFromClientX(event.clientX);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented) return;
  if (inactive.value) return;
  let next = val.value;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      next = val.value + stepValue.value;
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      next = val.value - stepValue.value;
      break;
    case 'PageUp':
      next = val.value + stepValue.value * 10;
      break;
    case 'PageDown':
      next = val.value - stepValue.value * 10;
      break;
    case 'Home':
    case 'End':
      /* Commit the extreme directly — clampHue(360) wraps to 0, which would make End act like Home. */
      event.preventDefault();
      controlled.setValue(event.key === 'Home' ? 0 : max.value);
      return;
    default:
      return;
  }
  event.preventDefault();
  controlled.setValue(props.channel === ColorChannel.Hue ? clampHue(next) : clamp01(next));
}

function buildGradient(channel: ColorChannel, color: HSV | undefined): string {
  if (channel === ColorChannel.Hue) {
    return 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';
  }
  const base: HSV = color ?? { h: 0, s: 1, v: 1 };
  if (channel === ColorChannel.Saturation) {
    const start = hsvToHex({ h: base.h, s: 0, v: base.v });
    const end = hsvToHex({ h: base.h, s: 1, v: base.v });
    return `linear-gradient(to right, ${start}, ${end})`;
  }
  if (channel === ColorChannel.Value) {
    const end = hsvToHex({ h: base.h, s: base.s, v: 1 });
    return `linear-gradient(to right, #000000, ${end})`;
  }
  // alpha
  const opaque = hsvToHex({ h: base.h, s: base.s, v: base.v });
  return `linear-gradient(to right, transparent, ${opaque})`;
}

const isAlpha = computed(() => props.channel === ColorChannel.Alpha);

/* val >= 360 pins the thumb to the right edge — clampHue would wrap the committed max back to 0. */
const ratio = computed(() =>
  props.channel === ColorChannel.Hue ? (val.value >= 360 ? 1 : clampHue(val.value) / 360) : clamp01(val.value),
);

const trackStyle = computed<StyleValue>(() => ({
  backgroundImage: buildGradient(props.channel, props.color),
  ...(isAlpha.value ? { backgroundColor: 'transparent' } : null),
}));

const thumbStyle = computed<StyleValue>(() => ({ left: `${ratio.value * 100}%` }));

const checkerboardStyle = CheckerboardBackground as StyleValue;

const controlId = computed(() => props.id ?? ctx?.id);
const finalAriaLabel = computed(() => ariaLabel.value ?? (labelledBy.value ? undefined : `${props.channel} slider`));
const valueNow = computed(() => Math.round(val.value * 100) / 100);
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

/* `id` and `aria-label` belong on the inner track (the ARIA slider), not the wrapper — the
   React original placed them there too, so both are kept off the passthrough set. */
const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('relative inline-flex w-full select-none items-center', attrs.class as ClassValue));

const innerClass = computed(() =>
  cn(
    'relative h-3 w-full rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    disabled.value && 'pointer-events-none opacity-50',
  ),
);

/** The rendered wrapper — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <div :key="formResetRevision" ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <div v-if="isAlpha" aria-hidden="true" class="absolute inset-0 rounded-full" :style="checkerboardStyle" />
    <div
      ref="track"
      role="slider"
      :id="controlId"
      :tabindex="disabled ? -1 : 0"
      :aria-label="finalAriaLabel"
      :aria-labelledby="labelledBy"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="valueNow"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      :aria-disabled="disabled || undefined"
      :aria-readonly="readOnly || undefined"
      aria-orientation="horizontal"
      :data-disabled="disabled ? '' : undefined"
      :style="trackStyle"
      :class="innerClass"
      @pointerdown="onPointerdown"
      @pointermove="onPointermove"
      @keydown="onKeydown"
    >
      <div
        aria-hidden="true"
        class="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent shadow-md ring-1 ring-black/20"
        :style="thumbStyle"
      />
    </div>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
