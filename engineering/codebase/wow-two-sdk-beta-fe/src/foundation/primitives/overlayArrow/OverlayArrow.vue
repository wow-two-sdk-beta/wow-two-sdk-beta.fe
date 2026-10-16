<script lang="ts">
import type { SVGAttributes } from 'vue';

export interface OverlayArrowProps extends /* @vue-ignore */ SVGAttributes {
  /** The arrow width in px. Default 12. */
  readonly width?: number;

  /** The arrow height in px. Default 6. */
  readonly height?: number;
}
</script>

<script setup lang="ts">
/**
 * Renders the tip arrow of a floating overlay (Tooltip, Popover, HoverCard) — a
 * minimal SVG triangle with `fill="currentColor"`, so color follows the consuming
 * overlay's background via Tailwind's `text-*` utilities.
 *
 * Pair with Floating UI's `arrow()` middleware to position. The middleware
 * exposes the arrow's `x` / `y` offset on the resolved data; consumers apply
 * those as inline styles to the wrapping span.
 */
defineOptions({ name: 'OverlayArrow' });

const props = withDefaults(
  defineProps<{
    /** The arrow width in px. Default 12. */
    width?: number;
    /** The arrow height in px. Default 6. */
    height?: number;
    /** The triangle fill. Default `currentColor`. */
    fill?: string;
  }>(),
  { width: 12, height: 6, fill: 'currentColor' },
);
</script>

<template>
  <svg
    :width="props.width"
    :height="props.height"
    :viewBox="`0 0 ${props.width} ${props.height}`"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <polygon :points="`0,0 ${props.width},0 ${props.width / 2},${props.height}`" :fill="props.fill" />
  </svg>
</template>
