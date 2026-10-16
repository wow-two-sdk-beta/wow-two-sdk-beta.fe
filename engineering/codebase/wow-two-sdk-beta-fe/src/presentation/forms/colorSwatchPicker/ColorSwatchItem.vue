<script lang="ts">
import type { ColorSwatchPreviewSize, SwatchShape } from '../../display/colorSwatchPreview';

/**
 * Defines props for the internal `ColorSwatchItem`.
 *
 * `size` / `shape` are the NAMED axis types, not `ColorSwatchPreviewVariants['size']` — the SFC
 * prop resolver cannot follow an indexed access into an imported interface, and the build
 * fails on it while `vue-tsc` stays green.
 */
export interface ColorSwatchItemProps {
  /** The swatch color. */
  readonly color: string;
  /** The selected state. */
  readonly isSelected: boolean;
  /** The disabled state. */
  readonly isDisabled: boolean;
  /** The swatch size step. */
  readonly size?: ColorSwatchPreviewSize;
  /** The swatch outline shape. */
  readonly shape?: SwatchShape;
}
</script>

<script setup lang="ts">
import { useRovingFocusItem } from '../../../foundation/primitives';
import ColorSwatchPreview from '../../display/colorSwatchPreview/ColorSwatchPreview.vue';

/** Renders one roving-focus swatch stop inside a `ColorSwatchPicker`. Internal — never exported. */
defineOptions({ name: 'ColorSwatchItem' });

const props = defineProps<ColorSwatchItemProps>();

const emit = defineEmits<{
  /** Fires when the swatch is clicked or activated with Enter / Space. */
  select: [color: string];
}>();

/* Reactive object — `tabindex` tracks the group's tab stop, so read through it rather than
   destructuring. The function `ref` registers this item's node with the group. */
const roving = useRovingFocusItem();

/* Roving navigation runs first and may `preventDefault()` an arrow key; Enter / Space only
   select when it did not. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  roving.onKeydown(event);
  if (event.defaultPrevented) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('select', props.color);
  }
}
</script>

<template>
  <ColorSwatchPreview
    :ref="roving.ref"
    :color="color"
    :size="size"
    :shape="shape"
    :is-selected="isSelected"
    :is-disabled="isDisabled"
    :tabindex="roving.tabindex"
    :data-roving-focus-item="roving['data-roving-focus-item']"
    :aria-label="color"
    @click="emit('select', color)"
    @focus="roving.onFocus()"
    @keydown="handleKeydown"
  />
</template>
