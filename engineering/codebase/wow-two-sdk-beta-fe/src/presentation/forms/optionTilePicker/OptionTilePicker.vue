<script lang="ts">
import { AriaAttribute } from '../../../foundation/dom';
import { type ColorTone } from '../../../foundation/styles';
import type { ButtonSize } from '../../actions/button/Button.vue';
import type { ToggleInputProps } from '../toggleInput';

/** @internal The attributes this component supplies itself — `label` is the accessible name. */
const OwnedAttributes = [AriaAttribute.Label] as const;

/** @internal An attribute name from {@link OwnedAttributes}. */
type OwnedAttribute = (typeof OwnedAttributes)[number];

/** Defines props for a single-select preset tile. */
export interface OptionTilePickerProps extends /* @vue-ignore */ Omit<
  ToggleInputProps,
  'modelValue' | 'defaultValue' | 'onUpdate:modelValue' | 'children' | OwnedAttribute | 'title' | 'variant' | 'shape'
> {
  /** The active-selection state of this tile. */
  readonly selected: boolean;

  /** The accessible label + native tooltip — the tile is icon-only, so this is its name. */
  readonly label: string;

  /* Re-declared from `ToggleInputProps` (identical types) purely so the SFC compiler sees them:
     defaults can only be attached to props it actually generates, and the heritage is ignored. */

  /** The semantic tone palette. Default `primary`. */
  readonly tone?: ColorTone;

  /** The tile size. Default `sm`. */
  readonly size?: ButtonSize;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, ColorTone as ColorToneValue } from '../../../foundation/styles';
import ToggleInput from '../toggleInput/ToggleInput.vue';
import { ToggleInputVariant } from '../toggleInput';
import { ButtonShape } from '../../actions/button';
import { optionTileVariants } from './OptionTilePicker.variants';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call; everything else is
   forwarded onto `ToggleInput` by hand. */
/** Renders one square, icon-only tile of a single-select preset grid, washed with tone while active. */
defineOptions({ name: 'OptionTilePicker', inheritAttrs: false });

/* `onSelect` became the `select` emit; the React prop was required, which an emit cannot express.
   `children` has no prop counterpart — the tile's icon, glyph, or swatch is the default slot. */
withDefaults(defineProps<OptionTilePickerProps>(), {
  size: 'sm',
  tone: ColorToneValue.Primary,
});

const emit = defineEmits<{
  /** Fires when this tile is selected. Re-selecting the active tile is a no-op. */
  select: [];
}>();

defineSlots<{
  /** The tile's glyph — an icon, letter, or swatch. The tile is icon-only, so `label` names it. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn(optionTileVariants(), attrs.class as ClassValue));
</script>

<template>
  <!--
    Renders a square, single-select tile for preset grids (fill types, module /
    finder shapes, gradient presets) — an icon-only `ToggleInput` (`shape="square"`)
    with a soft pressed wash. Compose several in a grid; the parent owns the active
    value. Disable a whole grid by wrapping it in a native `<fieldset disabled>`.
  -->
  <ToggleInput
    :shape="ButtonShape.Square"
    :variant="ToggleInputVariant.Outline"
    :tone="tone"
    :size="size"
    :model-value="selected"
    :aria-label="label"
    :title="label"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @update:modelValue="(next) => next && emit('select')"
  >
    <slot />
  </ToggleInput>
</template>
