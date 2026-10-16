<script lang="ts">
import type { ColorSwatchPreviewSize, SwatchShape } from './ColorSwatchPreview.variants';

/**
 * Defines props for a `ColorSwatchPreview`.
 *
 * React declared a discriminated union — `onClick` present selected the
 * `<button>` half and its `ButtonHTMLAttributes`, absent selected the `<div>`
 * half. The union collapses here: every native attribute is a fallthrough attr
 * and lands on whichever element renders, so only the styling axes remain
 * declared.
 *
 * `onClick` is deliberately NOT declared — see the note in `<script setup>`.
 */
export interface ColorSwatchPreviewProps {
  /** Any CSS color string. Default `#000000`. */
  readonly color?: string;
  /** The swatch size step. */
  readonly size?: ColorSwatchPreviewSize;
  /** The swatch outline shape. */
  readonly shape?: SwatchShape;
  /** The selected state — draws the selection ring. */
  readonly isSelected?: boolean;
  /** The disabled state. Also sets `disabled` on the interactive (`<button>`) form. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef, type StyleValue } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { colorSwatchVariants } from './ColorSwatchPreview.variants';

/** Renders a color chip over a checkerboard backdrop — a `<button>` when given a click listener, else a `<div>`. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ColorSwatchPreview', inheritAttrs: false });

const props = withDefaults(defineProps<ColorSwatchPreviewProps>(), {
  color: '#000000',
  /* Explicit `undefined` defaults: Vue casts an absent `boolean` prop to `false`, which would
     pin the tv axis to its explicit-false branch instead of letting `defaultVariants` apply. */
  isSelected: undefined,
  isDisabled: undefined,
});

const attrs = useAttrs();

/*
 * React switched the rendered element on `onClick`'s presence. `onClick` stays a FALLTHROUGH
 * ATTR here rather than a declared prop or an emit:
 *   - an emit would be stripped out of `useAttrs()`, erasing the discriminator entirely;
 *   - a declared prop would receive the merge ARRAY that `Primitive`'s `asChild` builds when
 *     `ColorPicker` chains the popover's toggle onto this swatch, and an array is not callable.
 * As an attr it stays detectable AND Vue invokes the whole chained array natively.
 */
const isInteractive = computed(() => Boolean(attrs.onClick));

/* `style` is owned so the inset box-shadow can be layered after the caller's declarations,
   the order React's `{ ...style, boxShadow }` spread gave it. */
const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'style']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    colorSwatchVariants({
      size: props.size,
      shape: props.shape,
      interactive: isInteractive.value,
      isSelected: props.isSelected,
      isDisabled: props.isDisabled,
    }),
    attrs.class as ClassValue,
  ),
);

/* Layers the color on top of the checkerboard via an inset box-shadow — keeps the variant
   class's `bg-[image:…]` checkerboard visible behind a partial-alpha color. */
const rootStyle = computed<StyleValue>(() => [
  attrs.style as StyleValue,
  { boxShadow: `inset 0 0 0 100px ${props.color}` },
]);

const root = useTemplateRef<HTMLElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <button
    v-if="isInteractive"
    ref="root"
    type="button"
    :disabled="isDisabled"
    :class="rootClass"
    :style="rootStyle"
    v-bind="passthroughAttrs"
  />
  <div v-else ref="root" :class="rootClass" :style="rootStyle" v-bind="passthroughAttrs" />
</template>
