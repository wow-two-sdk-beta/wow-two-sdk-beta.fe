<script lang="ts">
import type { HSV } from '../ColorExtensions';
import type { ColorSwatchPreviewSize } from '../../display/colorSwatchPreview';

/** Defines which built-in trigger a color picker renders. */
export const ColorPickerTriggerVariant = {
  /** Refers to a swatch plus hex-value text in a framed button. */
  Full: 'full',
  /** Refers to a bare interactive swatch, no text. */
  Swatch: 'swatch',
  /** Refers to hex-value text only, no swatch. */
  Value: 'value',
} as const;

export type ColorPickerTriggerVariant = (typeof ColorPickerTriggerVariant)[keyof typeof ColorPickerTriggerVariant];

export interface ColorPickerProps {
  /** The selected hex, controlled. The `v-model` binding target. */
  readonly modelValue?: string | null;

  /** The initial hex when uncontrolled. Default `#3b82f6`. */
  readonly defaultValue?: string | null;

  /** Whether the committed hex keeps its alpha channel, and the alpha slider renders. */
  readonly hasAlpha?: boolean;

  /** The preset palette rendered under the panel; omitted or empty hides the row. */
  readonly presets?: ReadonlyArray<string>;

  /** The size step the built-in trigger's swatch renders at. */
  readonly triggerSize?: ColorSwatchPreviewSize;

  /**
   * The built-in trigger to render (ignored when the `trigger` slot is filled):
   * - `full` *(default)* — swatch + hex-value text, framed button.
   * - `swatch` — a bare interactive swatch, no text (compact toolbars, tiles).
   * - `modelValue` — hex-value text only, no swatch (dense / code contexts).
   */
  readonly triggerVariant?: ColorPickerTriggerVariant;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
  /** Prevents editing while preserving the submitted color. */
  readonly isReadOnly?: boolean;

  /** The hidden input's name — renders a form-submittable mirror of the hex. */
  readonly name?: string;

  /** The trigger id; falls back to a surrounding `<Field>`'s control id. */
  readonly id?: string;
}

/** The panel's fallback geometry when no parseable color is committed. */
const FallbackHsv: HSV = { h: 217, s: 0.91, v: 0.96, a: 1 };
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { FormControlProvider, useFormControl } from '../../../foundation/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { hsvToHex, parseColorToHsv } from '../ColorExtensions';
import { ColorSwatchPreviewSize as ColorSwatchSizeValue } from '../../display/colorSwatchPreview';
import ColorSwatchPreview from '../../display/colorSwatchPreview/ColorSwatchPreview.vue';
import ColorArea from '../colorArea/ColorArea.vue';
import ColorSliderInput, { ColorChannel } from '../colorSliderInput/ColorSliderInput.vue';
import ColorInput from '../colorInput/ColorInput.vue';
import ColorSwatchPicker from '../colorSwatchPicker/ColorSwatchPicker.vue';

/** Renders a trigger opening a panel with a saturation/value area, hue and alpha sliders, a hex field and presets. */
/* `inheritAttrs: false` so `class` folds into the trigger's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ColorPicker', inheritAttrs: false });

const props = withDefaults(defineProps<ColorPickerProps>(), {
  defaultValue: '#3b82f6',
  hasAlpha: false,
  triggerSize: ColorSwatchSizeValue.Md,
  triggerVariant: ColorPickerTriggerVariant.Full,
  /* Explicit `undefined` default: the flag falls back to the form control context, and Vue
     casts an absent `boolean` prop to `false` — which would shadow the context. */
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader commits a color from the panel or the preset row — the `v-model` half. */
  'update:modelValue': [value: string | null];
}>();

/**
 * The custom trigger — React's `trigger?: ReactNode`. Structural content, so a slot
 * rather than a scalar prop. Must hold a single focusable element (it becomes the
 * popover trigger via `as-child`). Form-control context wiring (id/aria) is the
 * consumer's responsibility for a custom trigger, exactly as in React.
 */
const slots = defineSlots<{ trigger?(): unknown }>();

const attrs = useAttrs();

/* Inherits id/disabled/invalid/labelledby/describedby from a surrounding <Field>;
   standalone props win when provided, context fills the gaps (SelectPicker parity). */
const field = useFormControl();

const finalDisabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const finalReadOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const triggerId = computed(() => props.id ?? field?.id);

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel` and
   stop reaching the DOM. It is read off the attrs so it can be relocated onto the trigger. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

/* Names the trigger from the Field label when present; an explicit aria-label always
   wins, and the default label only applies when nothing else names the trigger. */
const labelledBy = computed(() => (ariaLabel.value ? undefined : field?.labelledBy));
const finalAriaLabel = computed(() => ariaLabel.value ?? (labelledBy.value ? undefined : 'Pick a color'));
const describedBy = computed(() => field?.describedBy);
const isInvalid = computed(() => field?.isInvalid || undefined);

const controlled = useControlled<string | null>({
  /* `??` is wrong here — `null` is a MEANINGFUL committed value ("no color"), and `??` would
     fall through it to `modelValue`. Only `undefined` means "not controlled". */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const hex = controlled.value;

/* Internal HSV state (kept in sync with hex). HSV preserves picker geometry when the user
   moves to a fully-desaturated value (otherwise hue collapses). */
const hsv = shallowRef<HSV>(parseColorToHsv(hex.value) ?? FallbackHsv);

/* React's `useEffect([hex, hasAlpha])`. No `immediate` — the initial state above already
   seeds from `hex`, and an immediate watcher would re-run it before mount. */
watch([hex, () => props.hasAlpha], () => {
  if (!hex.value) return;
  const parsed = parseColorToHsv(hex.value);
  if (!parsed) return;
  /* Only update internal HSV if the *committed* hex differs from what our HSV currently
     produces — avoids hue collapsing when SV passes through 0. */
  const currentHex = hsvToHex(hsv.value, { withAlpha: props.hasAlpha });
  if (currentHex.toLowerCase() !== hex.value.toLowerCase()) {
    hsv.value = parsed;
  }
});

function updateHsv(next: HSV): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  hsv.value = next;
  controlled.setValue(hsvToHex(next, { withAlpha: props.hasAlpha }));
}

function onHueChange(h: number): void {
  updateHsv({ ...hsv.value, h });
}

function onAlphaChange(a: number): void {
  updateHsv({ ...hsv.value, a });
}

function onHexChange(next: string | null): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  controlled.setValue(next);
}

function onPresetChange(next: string | null): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  controlled.setValue(next);
}

/*
 * The swatch trigger's real open handler is composed on by `PopoverTrigger`'s `as-child`
 * merge; `ColorSwatchPreview` only needs a truthy click listener to render as a <button>.
 */
function noop(): void {}

const hasCustomTrigger = computed(() => Boolean(slots.trigger));
const isSwatchTrigger = computed(() => props.triggerVariant === ColorPickerTriggerVariant.Swatch);
const isFullTrigger = computed(() => props.triggerVariant === ColorPickerTriggerVariant.Full);

const swatchColor = computed(() => hex.value ?? '#00000000');
const hexText = computed(() => hex.value ?? '—');
const hiddenValue = computed(() => hex.value ?? '');
const alphaValue = computed(() => hsv.value.a ?? 1);
const hasPresets = computed(() => Boolean(props.presets && props.presets.length > 0));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const framedTriggerClass = computed(() =>
  cn(
    'inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-sm transition-colors hover:border-border-strong focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
    attrs.class as ClassValue,
  ),
);

const swatchTriggerClass = computed(() => attrs.class as ClassValue);

const trigger = useTemplateRef<{ el: HTMLElement | null }>('trigger');

/** The rendered trigger element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: computed(() => trigger.value?.el ?? null) });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

const locale = useLocale();
</script>

<template>
  <Popover :key="formResetRevision">
    <!-- Custom trigger: no id/aria wiring, per the React original's contract. -->
    <PopoverTrigger v-if="hasCustomTrigger" ref="trigger" as-child :disabled="finalDisabled || finalReadOnly">
      <slot name="trigger" />
    </PopoverTrigger>

    <!-- Bare interactive swatch — ColorSwatchPreview is a real <button> here (given a click
         listener), so it becomes the popover trigger with no wrapper chrome. -->
    <PopoverTrigger
      v-else-if="isSwatchTrigger"
      ref="trigger"
      as-child
      :id="triggerId"
      :aria-label="finalAriaLabel"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
      :aria-invalid="isInvalid"
      v-bind="passthroughAttrs"
    >
      <ColorSwatchPreview
        :color="swatchColor"
        :size="triggerSize"
        :is-disabled="finalDisabled || finalReadOnly"
        :class="swatchTriggerClass"
        @click="noop"
      />
    </PopoverTrigger>

    <PopoverTrigger
      v-else
      ref="trigger"
      :id="triggerId"
      :aria-label="finalAriaLabel"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
      :aria-invalid="isInvalid"
      :disabled="finalDisabled || finalReadOnly"
      :class="framedTriggerClass"
      v-bind="passthroughAttrs"
    >
      <ColorSwatchPreview v-if="isFullTrigger" :color="swatchColor" :size="triggerSize" />
      <span class="font-mono uppercase">{{ hexText }}</span>
    </PopoverTrigger>

    <PopoverContent
      :aria-label="locale.t('ColorPicker.colorPicker', undefined, 'Color picker')"
      class="flex w-64 flex-col gap-3"
    >
      <!-- The panel widgets are sub-controls of the picker, not the field's control — each
           gets its OWN bare FormControlProvider so none of them adopts the surrounding
           Field's id (which now names the trigger; adoption would duplicate it) or its
           label/describedby/invalid chrome. One provider per widget: they all read
           `id ?? ctx.id`, so a single shared provider would duplicate ids among them. -->
      <FormControlProvider :is-disabled="finalDisabled || finalReadOnly" :is-read-only="finalReadOnly">
        <ColorArea
          :hue="hsv.h"
          :saturation="hsv.s"
          :value="hsv.v"
          @update:saturation="(s) => updateHsv({ ...hsv, s })"
          @update:value="(v) => updateHsv({ ...hsv, v })"
        />
      </FormControlProvider>
      <FormControlProvider :is-disabled="finalDisabled || finalReadOnly" :is-read-only="finalReadOnly">
        <ColorSliderInput
          :channel="ColorChannel.Hue"
          :model-value="hsv.h"
          :aria-label="locale.t('ColorPicker.hue', undefined, 'Hue')"
          @update:modelValue="onHueChange"
        />
      </FormControlProvider>
      <FormControlProvider v-if="hasAlpha" :is-disabled="finalDisabled || finalReadOnly" :is-read-only="finalReadOnly">
        <ColorSliderInput
          :channel="ColorChannel.Alpha"
          :model-value="alphaValue"
          :color="hsv"
          :aria-label="locale.t('ColorPicker.alpha', undefined, 'Alpha')"
          @update:modelValue="onAlphaChange"
        />
      </FormControlProvider>
      <FormControlProvider :is-disabled="finalDisabled || finalReadOnly" :is-read-only="finalReadOnly">
        <ColorInput
          :aria-label="locale.t('ColorPicker.hexColor', undefined, 'Hex color')"
          :model-value="hex"
          :has-alpha="hasAlpha"
          @update:modelValue="onHexChange"
        />
      </FormControlProvider>
      <FormControlProvider
        v-if="hasPresets"
        :is-disabled="finalDisabled || finalReadOnly"
        :is-read-only="finalReadOnly"
      >
        <ColorSwatchPicker
          :colors="presets ?? []"
          :model-value="hex"
          swatch-size="sm"
          @update:modelValue="onPresetChange"
        />
      </FormControlProvider>
    </PopoverContent>

    <input
      v-if="name"
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
